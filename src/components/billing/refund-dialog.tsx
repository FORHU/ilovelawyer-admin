"use client"

import { type ReactNode, useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatMoney, REFUND_REASON_MAX, refundAmountToMinor } from "@/components/billing/format"
import type { Money, RefundStatus } from "@/lib/billing/queries"

/** The refund the API recorded last (refunds come newest first), or none. */
type LatestRefund = { status: RefundStatus; failureReason: string | null } | undefined

interface RefundDialogProps {
  /** Why the payment can't be refunded; the button is then off with this on hover. */
  blocked: string | null
  /** Keeps the field ids unique across rows. */
  id: string
  /** All a refund can take now, as the API worked it out. */
  left: Money
  /** A check on top of "a positive amount, at most `left`"; `full` is whether it takes all that's left. */
  validate?: (amountMinor: number, full: boolean) => string | null
  title: string
  description: ReactNode
  reasonPlaceholder: string
  confirmDescription: (refund: Money, full: boolean) => ReactNode
  /** Who the success toast says the money went back to. */
  refundedTo?: string
  pending: boolean
  /** Sends the refund (no amount when it's all that's left, so the API takes exactly what remains)
   * and gives back the latest refund on the payment. */
  submit: (input: { amountMinor?: number; reason: string }) => Promise<LatestRefund>
}

/**
 * Refund button for one payment row: off, with the reason on hover, when it can't be refunded,
 * otherwise a dialog. The dialog takes the amount (all that's left by default) and a reason, then
 * asks once more before anything goes to Stripe. Only a refund that didn't fail closes it.
 */
export function RefundDialog({ blocked, id, left, validate, title, description, reasonPlaceholder, confirmDescription, refundedTo, pending, submit }: RefundDialogProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"form" | "confirm">("form")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")

  if (blocked) {
    return (
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex cursor-help" />}>
          <Button variant="outline" size="sm" disabled>
            Refund
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs whitespace-normal">{blocked}</TooltipContent>
      </Tooltip>
    )
  }

  const amountMinor = refundAmountToMinor(amount)
  const full = amountMinor === left.amountMinor
  const amountError =
    amount.trim() === ""
      ? null
      : amountMinor === null
        ? "Enter an amount like 49.99"
        : amountMinor > left.amountMinor
          ? `At most ${formatMoney(left)}`
          : (validate?.(amountMinor, full) ?? null)
  const canReview = amountMinor !== null && !amountError && reason.trim().length > 0
  const refundMoney = { amountMinor: amountMinor ?? 0, currency: left.currency }

  async function handleRefund() {
    try {
      const latest = await submit({ amountMinor: full ? undefined : amountMinor!, reason: reason.trim() })
      if (latest?.status === "FAILED") {
        toast.error(latest.failureReason ?? "Stripe refused the refund. Nothing was refunded.")
        setStep("form")
        return
      }
      if (latest?.status === "PENDING") toast.success(`Refund of ${formatMoney(refundMoney)} sent to Stripe; it will show as done once Stripe finishes it`)
      else toast.success(`Refunded ${formatMoney(refundMoney)}${refundedTo ? ` to ${refundedTo}` : ""}`)
      setOpen(false)
    } catch (err) {
      toast.error((err as Error).message)
      setStep("form")
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return
        if (next) {
          setStep("form")
          setAmount((left.amountMinor / 100).toFixed(2))
          setReason("")
        }
        setOpen(next)
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Refund</DialogTrigger>
      <DialogContent>
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`refund-amount-${id}`} className="font-normal select-text">
                Amount ({left.currency}) — up to {formatMoney(left)}
              </Label>
              <Input id={`refund-amount-${id}`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={!!amountError} />
              {amountError && <p className="text-destructive text-xs">{amountError}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`refund-reason-${id}`} className="font-normal select-text">
                Reason — kept in the audit log
              </Label>
              <Textarea
                id={`refund-reason-${id}`}
                placeholder={reasonPlaceholder}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={REFUND_REASON_MAX}
              />
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <Button onClick={() => setStep("confirm")} disabled={!canReview}>
                Review refund
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Refund {formatMoney(refundMoney)}?</DialogTitle>
              <DialogDescription>{confirmDescription(refundMoney, full)}</DialogDescription>
            </DialogHeader>
            <p className="bg-muted rounded-xl px-3 py-2 text-sm break-words">{reason.trim()}</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("form")} disabled={pending}>
                Back
              </Button>
              <Button variant="destructive" onClick={handleRefund} disabled={pending}>
                {pending && <Loader2 className="size-3.5 animate-spin" />}
                {pending ? "Refunding…" : `Refund ${formatMoney(refundMoney)}`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
