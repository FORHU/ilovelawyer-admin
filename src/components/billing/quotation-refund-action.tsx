"use client"

import { formatMoney, quotationRefundBlockedReason } from "@/components/billing/format"
import { RefundDialog } from "@/components/billing/refund-dialog"
import { type AdminQuotationPayment, useRefundQuotationPaymentMutation } from "@/lib/billing/quotation-payments"

/**
 * Refund for one quote payment. Everything left gives back the platform fee too; anything less is a
 * partial refund out of the lawyer's fee only, so it can be at most what's left of that. The lawyer's
 * earning is reversed by the lawyer's part once the refund goes through.
 */
export function QuotationRefundAction({ payment }: { payment: AdminQuotationPayment }) {
  const mutation = useRefundQuotationPaymentMutation()
  const currency = payment.amount.currency
  // What the API would allow now, worked out by it (pending refunds hold their share back).
  const serviceFeeLeft = payment.refundableServiceFee

  return (
    <RefundDialog
      blocked={quotationRefundBlockedReason(payment)}
      id={`q-${payment.id}`}
      left={payment.refundable}
      validate={(amountMinor, full) =>
        !full && amountMinor > serviceFeeLeft.amountMinor ? `A partial refund comes out of the lawyer's fee: at most ${formatMoney(serviceFeeLeft)}` : null
      }
      title="Refund a quote payment"
      description={
        <>
          The client paid {formatMoney(payment.amount)}: {formatMoney(payment.serviceFee)} for the lawyer and {formatMoney(payment.platformFee)} platform fee.
          Refunding everything left gives back the platform fee too; less comes out of the lawyer&apos;s fee only.
          {payment.provider === "DUMMY" && " Dummy payment: no money moves, but the lawyer's earning is reversed."}
        </>
      }
      reasonPlaceholder="e.g. The lawyer couldn't take the matter on"
      confirmDescription={(refund, full) => (
        <>
          {full ? "Everything left, the platform fee included," : `${formatMoney(refund)} of the lawyer's fee`} goes back to the client. The lawyer&apos;s earning is
          reduced to match. This can&apos;t be undone.
        </>
      )}
      pending={mutation.isPending}
      submit={async (input) => (await mutation.mutateAsync({ paymentId: payment.id, currency, ...input })).refunds[0]}
    />
  )
}
