import type { AdminCharge, AdminClaim, ChargeKind, ChargeStatus, ClaimOutcome, ClientRequestStatus } from "@/lib/client-requests/queries"

export const REQUEST_STATUS_LABELS: Record<ClientRequestStatus, string> = {
  REQUESTED: "Requested",
  ROUTED: "Routed",
  CLAIMED: "Claimed",
  QUOTED: "Quoted",
  CONFIRMED: "Confirmed",
  ENGAGED: "Engaged",
  CLOSED: "Closed",
  EXPIRED: "Expired",
  WITHDRAWN: "Withdrawn",
}

export const OUTCOME_LABELS: Record<ClaimOutcome, string> = {
  RELEASED: "Released",
  LAPSED: "Hold lapsed",
  DECLINED: "Declined by client",
  REASSIGNED: "Reassigned",
  WITHDRAWN: "Withdrawn",
  ENGAGED: "Engaged",
}

export const CHARGE_KIND_LABELS: Record<ChargeKind, string> = { PER_CASE_FEE: "Per-case fee", AI_TOP_UP: "AI top-up" }

export const CHARGE_STATUS_LABELS: Record<ChargeStatus, string> = {
  PENDING: "Pending",
  SUCCEEDED: "Paid",
  FAILED: "Failed",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partly refunded",
}

export const PRACTICE_AREA_LABELS: Record<string, string> = {
  EMPLOYMENT: "Employment",
  PROPERTY: "Property",
  FAMILY: "Family",
  CONSUMER: "Consumer",
  OTHER: "Other",
}

/** "5 h", "2 d 4 h": how long a request has been open. */
export function formatAge(hours: number): string {
  if (hours < 1) return "<1 h"
  if (hours < 48) return `${Math.floor(hours)} h`
  const days = Math.floor(hours / 24)
  const rest = Math.floor(hours - days * 24)
  return rest ? `${days} d ${rest} h` : `${days} d`
}

/** The lawyer who has (or last had) the request: the newest claim, which the API lists first. */
export function latestClaim(claims: AdminClaim[]): AdminClaim | null {
  return claims[0] ?? null
}

/** Why a charge's Refund button is off, or null when it's on. Mirrors the API's own refusals
 * (ClientRequestAdminSvc.refundCharge) so the admin reads the reason before trying. */
export function refundBlockedReason(charge: AdminCharge): string | null {
  if (charge.provider === "DUMMY") return "Test card: no money was taken, so there's nothing to refund."
  if (charge.status === "PENDING") return "Still waiting for the payment to go through."
  if (charge.status === "FAILED") return "This payment didn't go through."
  if (charge.refundPending.amountMinor > 0 && charge.refundable.amountMinor === 0) return "A refund is on its way at Stripe."
  if (charge.refundable.amountMinor === 0) return "Refunded in full."
  return null
}
