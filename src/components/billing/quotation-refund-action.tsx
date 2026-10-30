"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatMoney } from "@/components/billing/format"
import { type AdminQuotationPayment, refundable, useRefundQuotationPaymentMutation } from "@/lib/billing/quotation-payments"

const REASON_MAX = 500
const REFUNDABLE = new Set(["SUCCEEDED", "PARTIALLY_REFUNDED", "DISPUTED"])

/** "12.5" -> 1250; null for anything that isn't a positive amount with at most two decimals. */
function toMinor(input: string): number | null {
  const trimmed = input.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null
  const minor = Math.round(Number(trimmed) * 100)
  return minor > 0 ? minor : null
}

/**
 * Refund for one quote payment. Everything left gives back the platform fee too; anything less is a
 * partial refund out of the lawyer's fee only, so it can be at most what's left of that. The lawyer's
 * earning is reversed by the lawyer's part once the refund goes through. Asks once more before
 * anything goes to Stripe.
 */
export function QuotationRefundAction({ payment }: { payment: AdminQuotationPayment }) {
  const mutation = useRefundQuotationPaymentMutation()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"form" | "confirm">("form")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")

  const left = refundable(payment)
  const currency = payment.amount.currency
  if (!REFUNDABLE.has(payment.status) || left.amountMinor <= 0) {
    return (
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex cursor-help" />}>
          <Button variant="outline" size="sm" disabled>
            Refund
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs whitespace-normal">
          {payment.status === "REFUNDED" || left.amountMinor <= 0 ? "Already refunded in full." : "Only a payment that took money can be refunded."}
        </TooltipContent>
      </Tooltip>
    )
  }

  const amountMinor = toMinor(amount)
  const full = amountMinor === left.amountMinor
  const amountError =
    amount.trim() === ""
      ? null
      : amountMinor === null
        ? "Enter an amount like 49.99"
        : amountMinor > left.amountMinor
          ? `At most ${formatMoney({ amountMinor: left.amountMinor, currency })}`
          : !full && amountMinor > left.serviceFeeMinor
            ? `A partial refund comes out of the lawyer's fee: at most ${formatMoney({ amountMinor: left.serviceFeeMinor, currency })}`
            : null
  const canReview = amountMinor !== null && !amountError && reason.trim().length > 0
  const refundMoney = { amountMinor: amountMinor ?? 0, currency }

  function handleRefund() {
    mutation.mutate(
      { paymentId: payment.id, amountMinor: full ? undefined : amountMinor!, currency, reason: reason.trim() },
      {
        onSuccess: (updated) => {
          const latest = updated.refunds[0]
          if (latest?.status === "PENDING") toast.success(`Refund of ${formatMoney(refundMoney)} sent to Stripe; it will show as done once Stripe finishes it`)
          else toast.success(`Refunded ${formatMoney(refundMoney)}`)
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
        if (mutation.isPending) return
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
              <DialogTitle>Refund a quote payment</DialogTitle>
              <DialogDescription>
                The client paid {formatMoney(payment.amount)}: {formatMoney(payment.serviceFee)} for the lawyer and {formatMoney(payment.platformFee)} platform fee.
                Refunding everything left gives back the platform fee too; less comes out of the lawyer&apos;s fee only.
                {payment.provider === "DUMMY" && " Dummy payment: no money moves, but the lawyer's earning is reversed."}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`qrefund-amount-${payment.id}`} className="font-normal select-text">
                Amount ({currency}) — up to {formatMoney({ amountMinor: left.amountMinor, currency })}
              </Label>
              <Input id={`qrefund-amount-${payment.id}`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={!!amountError} />
              {amountError && <p className="text-destructive text-xs">{amountError}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`qrefund-reason-${payment.id}`} className="font-normal select-text">
                Reason — kept in the audit log
              </Label>
              <Textarea
                id={`qrefund-reason-${payment.id}`}
                placeholder="e.g. The lawyer couldn't take the matter on"
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
                {full ? "Everything left, the platform fee included," : `${formatMoney(refundMoney)} of the lawyer's fee`} goes back to the client. The lawyer&apos;s
                earning is reduced to match. This can&apos;t be undone.
              </DialogDescription>
            </DialogHeader>
            <p className="bg-muted rounded-xl px-3 py-2 text-sm break-words">{reason.trim()}</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("form")} disabled={mutation.isPending}>
                Back
              </Button>
              <Button variant="destructive" onClick={handleRefund} disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                {mutation.isPending ? "Refunding…" : `Refund ${formatMoney(refundMoney)}`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
