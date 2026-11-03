"use client"

import { formatMoney, KIND_LABELS, refundBlockedReason } from "@/components/billing/format"
import { RefundDialog } from "@/components/billing/refund-dialog"
import { type AdminClientPayment, useRefundPaymentMutation } from "@/lib/billing/queries"

/**
 * Refund for one payment row: off, with the reason on hover, when it can't be refunded (a dummy or
 * free payment, one that didn't go through, or one already refunded), otherwise the refund dialog,
 * which names the amount and the client before anything goes to Stripe.
 */
export function RefundAction({ payment }: { payment: AdminClientPayment }) {
  const refundMutation = useRefundPaymentMutation()
  const who = payment.client.name ? `${payment.client.name} (${payment.client.email})` : payment.client.email

  return (
    <RefundDialog
      blocked={refundBlockedReason(payment)}
      id={payment.id}
      left={payment.refundable}
      title={`Refund a ${KIND_LABELS[payment.kind].toLowerCase()}`}
      description={
        <>
          {who} paid {formatMoney(payment.amount)}
          {payment.refunded.amountMinor > 0 ? `, ${formatMoney(payment.refunded)} already refunded` : ""}. The money goes back through
          Stripe. Their case and chat credits stay as they are.
        </>
      }
      reasonPlaceholder="e.g. Client asked within 14 days"
      confirmDescription={(refund, full) => (
        <>
          {full && payment.refunded.amountMinor === 0 ? "The full payment" : `${formatMoney(refund)} of ${formatMoney(payment.amount)}`} goes back to{" "}
          {who} through Stripe. This can&apos;t be undone.
        </>
      )}
      refundedTo={payment.client.email}
      pending={refundMutation.isPending}
      submit={async (input) => (await refundMutation.mutateAsync({ paymentId: payment.id, ...input })).refunds[0]}
    />
  )
}
