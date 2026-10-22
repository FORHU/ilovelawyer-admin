"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatMoney } from "@/components/billing/format"
import { CHARGE_KIND_LABELS, refundBlockedReason } from "@/components/client-requests/format"
import { type AdminCharge, useRefundChargeMutation } from "@/lib/client-requests/queries"

const REASON_MAX = 500

/** What the API's error code means for the admin, with what to do next. */
const REFUND_ERRORS: Record<string, string> = {
  REFUND_EXCEEDS_CHARGE: "That's more than is left to refund. Someone may have refunded part of it already; close this and check the charge.",
  ALREADY_REFUNDED: "This charge was already refunded in full.",
  CHARGE_NOT_REFUNDABLE: "This charge isn't paid, so it can't be refunded.",
  REFUND_NOT_SUPPORTED: "This was a test card: no money was taken, so there's nothing to refund.",
  PAYMENT_PROVIDER_ERROR: "Stripe refused the refund, so nothing was given back. It's recorded as failed on the charge. Try again, or refund it in the Stripe dashboard.",
}

/** "12.5" -> 1250; null for anything that isn't a positive amount with at most two decimals. */
function toMinor(input: string): number | null {
  const trimmed = input.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null
  const [pounds = "0", pence = ""] = trimmed.split(".")
  const minor = Number(pounds) * 100 + Number(pence.padEnd(2, "0"))
  return minor > 0 ? minor : null
}

/**
 * Refund for one lawyer charge (a per-case fee or an AI top-up): a disabled button with the reason on
 * hover when it can't be refunded, otherwise a dialog. The dialog takes the amount (all that's left by
 * default) and a reason, then asks once more, naming the amount and the firm, before anything goes to
 * Stripe. A refund gives back money only: the engagement it paid for carries on.
 */
export function ChargeRefundAction({ charge, firmName }: { charge: AdminCharge; firmName: string | null }) {
  const refundMutation = useRefundChargeMutation()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"form" | "confirm">("form")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  const blocked = refundBlockedReason(charge)
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

  const left = charge.refundable
  const amountMinor = toMinor(amount)
  const amountError =
    amount.trim() === "" ? null : amountMinor === null ? "Enter an amount like 4.99" : amountMinor > left.amountMinor ? `At most ${formatMoney(left)}` : null
  const canReview = amountMinor !== null && !amountError && reason.trim().length > 0
  const refundMoney = { amountMinor: amountMinor ?? 0, currency: left.currency }
  const isFull = amountMinor === left.amountMinor && charge.refunded.amountMinor === 0
  const who = firmName ?? "the firm"
  const kind = CHARGE_KIND_LABELS[charge.kind].toLowerCase()

  function handleRefund() {
    setError(null)
    refundMutation.mutate(
      // Omitting the amount when it's all that's left lets the API take exactly what remains.
      {
        chargeId: charge.id,
        amountMinor: amountMinor === left.amountMinor ? undefined : amountMinor!,
        currency: left.currency,
        reason: reason.trim(),
      },
      {
        onSuccess: (updated) => {
          const latest = updated.refunds[0]
          if (latest?.status === "PENDING") toast.success(`Refund of ${formatMoney(refundMoney)} sent to Stripe; it will show as done once Stripe finishes it`)
          else toast.success(`Refunded ${formatMoney(refundMoney)} to ${who}`)
          setOpen(false)
        },
        onError: (err) => {
          const code = (err as Error & { code?: string }).code
          setError((code && REFUND_ERRORS[code]) || (err as Error).message)
          setStep("form")
        },
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (refundMutation.isPending) return
        if (next) {
          setStep("form")
          setAmount((left.amountMinor / 100).toFixed(2))
          setReason("")
          setError(null)
        }
        setOpen(next)
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Refund</DialogTrigger>
      <DialogContent>
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>Refund a {kind}</DialogTitle>
              <DialogDescription>
                {who} paid {formatMoney(charge.amount)}
                {charge.refunded.amountMinor > 0 ? `, ${formatMoney(charge.refunded)} already refunded` : ""}. The money goes back through Stripe.
                The engagement it paid for carries on.
              </DialogDescription>
            </DialogHeader>
            {error && (
              <p role="alert" className="bg-destructive/10 text-destructive rounded-xl px-3 py-2 text-sm">
                {error}
              </p>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor={`refund-amount-${charge.id}`} className="font-normal select-text">
                Amount ({left.currency}) — up to {formatMoney(left)}
              </Label>
              <Input
                id={`refund-amount-${charge.id}`}
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-invalid={!!amountError}
                aria-describedby={amountError ? `refund-amount-error-${charge.id}` : undefined}
              />
              {amountError && (
                <p id={`refund-amount-error-${charge.id}`} className="text-destructive text-xs">
                  {amountError}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`refund-reason-${charge.id}`} className="font-normal select-text">
                Reason — kept in the audit log, also in the firm&apos;s own
              </Label>
              <Textarea
                id={`refund-reason-${charge.id}`}
                placeholder="e.g. Client withdrew within the hour"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={REASON_MAX}
              />
              <p className="text-muted-foreground text-right text-xs tabular-nums">
                {reason.length}/{REASON_MAX}
              </p>
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
              <DialogDescription>
                {isFull ? "The full charge" : `${formatMoney(refundMoney)} of ${formatMoney(charge.amount)}`} goes back to {who} through Stripe. This
                can&apos;t be undone.
              </DialogDescription>
            </DialogHeader>
            <p className="bg-muted rounded-xl px-3 py-2 text-sm break-words">{reason.trim()}</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("form")} disabled={refundMutation.isPending}>
                Back
              </Button>
              <Button variant="destructive" onClick={handleRefund} disabled={refundMutation.isPending}>
                {refundMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                {refundMutation.isPending ? "Refunding…" : `Refund ${formatMoney(refundMoney)}`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
