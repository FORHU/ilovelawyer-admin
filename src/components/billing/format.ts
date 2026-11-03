import type { AdminClientPayment, Money, PaymentKind, PaymentProvider } from "@/lib/billing/queries"
import type { AdminQuotationPayment } from "@/lib/billing/quotation-payments"

/** The longest refund reason the API keeps. */
export const REFUND_REASON_MAX = 500

/** A refund amount typed in major units: "12.5" -> 1250; null for anything that isn't a positive
 * amount with at most two decimals. */
export function refundAmountToMinor(input: string): number | null {
  const trimmed = input.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null
  const minor = Math.round(Number(trimmed) * 100)
  return minor > 0 ? minor : null
}

export function formatMoney(money: Money): string {
  return (money.amountMinor / 100).toLocaleString("en-US", { style: "currency", currency: money.currency })
}

/** Several currencies side by side ("$12.00 · £5.00"); a dash when there's nothing. */
export function formatMoneyList(amounts: Money[]): string {
  const nonEmpty = amounts.filter((m) => m.amountMinor !== 0)
  return nonEmpty.length ? nonEmpty.map(formatMoney).join(" · ") : "—"
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

export const KIND_LABELS: Record<PaymentKind, string> = { CASE: "Case fee (legacy)", TOP_UP: "Top-up" }

export const PROVIDER_LABELS: Record<PaymentProvider, string> = { STRIPE: "Stripe", DUMMY: "Dummy", FREE: "Free (promo)" }

/** Why a payment's Refund button is off, or null when it's on. Mirrors the API's own refusals
 * (ClientBillingAdminSvc.refund) so the admin reads the reason before trying. */
export function refundBlockedReason(payment: AdminClientPayment): string | null {
  if (payment.provider === "DUMMY") return "Dummy payment: no money was taken, so there's nothing to refund."
  if (payment.provider === "FREE") return "A promo code made this free: nothing was charged."
  if (payment.status === "PENDING") return "Still waiting for the client to pay."
  if (payment.status === "FAILED") return "This payment didn't go through."
  if (payment.refundPending.amountMinor > 0 && payment.refundable.amountMinor === 0) return "A refund is on its way at Stripe."
  if (payment.refundable.amountMinor === 0) return "Refunded in full."
  return null
}

/** The same for a quote payment (QuotationPaymentSvc.refund's refusals). */
export function quotationRefundBlockedReason(payment: AdminQuotationPayment): string | null {
  if (payment.status === "PENDING") return "Still waiting for the client to pay."
  if (payment.status === "FAILED" || payment.status === "CANCELED") return "This payment didn't go through."
  if (payment.status === "DISPUTED") return "This payment is disputed: the client's bank decides the outcome."
  if (payment.refundPending.amountMinor > 0 && payment.refundable.amountMinor === 0) return "A refund is on its way at Stripe."
  if (payment.refundable.amountMinor === 0) return "Refunded in full."
  return null
}
