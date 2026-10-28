import type { AdminClientPayment, Money, PaymentKind, PaymentProvider } from "@/lib/billing/queries"

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
