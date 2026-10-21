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
import { formatMoney, KIND_LABELS, refundBlockedReason } from "@/components/billing/format"
import { type AdminClientPayment, useRefundPaymentMutation } from "@/lib/billing/queries"

const REASON_MAX = 500

/** "12.5" -> 1250; null for anything that isn't a positive amount with at most two decimals. */
function toMinor(input: string): number | null {
  const trimmed = input.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null
  const minor = Math.round(Number(trimmed) * 100)
  return minor > 0 ? minor : null
}

/**
 * Refund for one payment row: a disabled button with the reason on hover when it can't be refunded
 * (a dummy or free payment, one that didn't go through, or one already refunded), otherwise a dialog.
 * The dialog takes the amount (all that's left by default) and a reason, then asks once more, naming
 * the amount and the client, before anything goes to Stripe.
 */
export function RefundAction({ payment }: { payment: AdminClientPayment }) {
  const refundMutation = useRefundPaymentMutation()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"form" | "confirm">("form")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")

  const blocked = refundBlockedReason(payment)
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

  const left = payment.refundable
  const amountMinor = toMinor(amount)
  const amountError =
    amount.trim() === "" ? null : amountMinor === null ? "Enter an amount like 4.99" : amountMinor > left.amountMinor ? `At most ${formatMoney(left)}` : null
  const canReview = amountMinor !== null && !amountError && reason.trim().length > 0
  const refundMoney = { amountMinor: amountMinor ?? 0, currency: left.currency }
  const isFull = amountMinor === left.amountMinor && payment.refunded.amountMinor === 0
  const who = payment.client.name ? `${payment.client.name} (${payment.client.email})` : payment.client.email

  function handleRefund() {
    refundMutation.mutate(
      // Omitting the amount when it's all that's left lets the API take exactly what remains.
      { paymentId: payment.id, amountMinor: amountMinor === left.amountMinor ? undefined : amountMinor!, reason: reason.trim() },
      {
        onSuccess: (updated) => {
          const latest = updated.refunds[0]
          if (latest?.status === "PENDING") toast.success(`Refund of ${formatMoney(refundMoney)} sent to Stripe; it will show as done once Stripe finishes it`)
          else toast.success(`Refunded ${formatMoney(refundMoney)} to ${payment.client.email}`)
          setOpen(false)
        },
        onError: (err) => {
          toast.error((err as Error).message)
          setStep("form")
        },
      }
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
        }
        setOpen(next)
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Refund</DialogTrigger>
      <DialogContent>
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>Refund a {KIND_LABELS[payment.kind].toLowerCase()}</DialogTitle>
              <DialogDescription>
                {who} paid {formatMoney(payment.amount)}
                {payment.refunded.amountMinor > 0 ? `, ${formatMoney(payment.refunded)} already refunded` : ""}. The money goes back
                through Stripe. Their case and chat credits stay as they are.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`refund-amount-${payment.id}`} className="font-normal select-text">
                Amount ({left.currency}) — up to {formatMoney(left)}
              </Label>
              <Input
                id={`refund-amount-${payment.id}`}
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-invalid={!!amountError}
              />
              {amountError && <p className="text-destructive text-xs">{amountError}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`refund-reason-${payment.id}`} className="font-normal select-text">
                Reason — kept in the audit log
              </Label>
              <Textarea
                id={`refund-reason-${payment.id}`}
                placeholder="e.g. Client asked within 14 days"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={REASON_MAX}
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
              <DialogDescription>
                {isFull ? "The full payment" : `${formatMoney(refundMoney)} of ${formatMoney(payment.amount)}`} goes back to {who} through
                Stripe. This can&apos;t be undone.
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
