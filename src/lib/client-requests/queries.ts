import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/fetch"
import { useAuthStore } from "@/lib/store/auth.store"

// Mirrors ilovelawyer-api's /api/admin/client-requests and /api/admin/charges (ilovelawyer-api#520),
// documented under the "Admin" tag in src/swagger-client-handoff.ts. These are the lawyers' own
// per-case fees and AI top-ups, not the client app's payments (see lib/billing/queries.ts).

export const CLIENT_REQUEST_STATUSES = [
  "REQUESTED",
  "ROUTED",
  "CLAIMED",
  "QUOTED",
  "CONFIRMED",
  "ENGAGED",
  "CLOSED",
  "EXPIRED",
  "WITHDRAWN",
] as const
export type ClientRequestStatus = (typeof CLIENT_REQUEST_STATUSES)[number]

export type ClaimOutcome = "RELEASED" | "LAPSED" | "DECLINED" | "REASSIGNED" | "WITHDRAWN" | "ENGAGED"
export type ChargeKind = "PER_CASE_FEE" | "AI_TOP_UP"
export type ChargeStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED"
export type RefundStatus = "PENDING" | "SUCCEEDED" | "FAILED"

export interface Money {
  /** Pence. */
  amountMinor: number
  currency: string
}

export interface ChargeRefund {
  id: string
  amount: Money
  reason: string
  status: RefundStatus
  externalId: string | null
  failureReason: string | null
  admin: { id: string; name: string | null } | null
  createdAt: string
}

export interface AdminCharge {
  id: string
  kind: ChargeKind
  status: ChargeStatus
  amount: Money
  refunded: Money
  requestId: string
  lawyer: { id: string; name: string } | null
  failureReason: string | null
  receiptUrl: string | null
  /** The card's provider; DUMMY is a test card that took no money. */
  provider: "STRIPE" | "DUMMY" | null
  createdAt: string
  organizationId: string
  paymentIntentId: string | null
  refundPending: Money
  /** What a refund can still give back; 0 when the charge can't be refunded. */
  refundable: Money
  refunds: ChargeRefund[]
}

export interface AdminClaim {
  lawyerId: string
  lawyerName: string
  organizationId: string
  organizationName: string
  claimedAt: string
  endedAt: string | null
  outcome: ClaimOutcome | null
  releaseReason: string | null
  quote: { type: "FIXED_FEE" | "FIRST_CONSULTATION"; amount: Money; sentAt: string } | null
}

export interface AdminClientRequest {
  id: string
  caseId: string
  clientId: string
  status: ClientRequestStatus
  createdAt: string
  ageHours: number
  /** Still ROUTED with its 48h routing window over. */
  unclaimedOver48h: boolean
  routedAt: string | null
  routingExpiresAt: string | null
  engagedAt: string | null
  practiceArea: string
  ukJurisdiction: string
  /** Counted for ROUTED requests; 0 otherwise. */
  matchedLawyers: number
  claims: AdminClaim[]
  organizationName: string | null
  charges: AdminCharge[]
}

export interface AdminClientRequestPage {
  total: number
  page: number
  pageSize: number
  totalPages: number
  data: AdminClientRequest[]
}

export interface ClientRequestFilters {
  status?: ClientRequestStatus
  minAgeHours?: number
  unclaimedOver48h?: boolean
}

export type FeesGroupBy = "organization" | "lawyer"

export interface FeesSummaryRow {
  id: string
  name: string
  /** Paid per-case fees. */
  engagements: number
  perCaseFees: Money
  topUps: Money
  refunds: Money
}

export interface FeesSummaryFilters {
  groupBy: FeesGroupBy
  /** Days, inclusive: "2026-10-01". */
  from?: string
  to?: string
}

function buildQueryString(params: object, extra: Record<string, string> = {}): string {
  const search = new URLSearchParams(extra)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && value !== false) search.set(key, String(value))
  }
  return search.toString()
}

export function useClientRequestsQuery(filters: ClientRequestFilters, page: number, limit: number) {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ["admin", "client-requests", "list", filters, page, limit] as const,
    queryFn: () =>
      apiFetch<AdminClientRequestPage>(`/api/admin/client-requests?${buildQueryString(filters, { page: String(page), limit: String(limit) })}`),
    // Waits for DashboardLayout's silent refresh to supply the access token, as the users query does.
    enabled: !!accessToken,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  })
}

export function useFeesSummaryQuery(filters: FeesSummaryFilters, enabled = true) {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ["admin", "client-requests", "fees-summary", filters] as const,
    queryFn: () => apiFetch<FeesSummaryRow[]>(`/api/admin/client-requests/fees-summary?${buildQueryString(filters)}`),
    enabled: !!accessToken && enabled,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  })
}

export function useRefundChargeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ chargeId, amountMinor, currency, reason }: { chargeId: string; amountMinor?: number; currency: string; reason: string }) =>
      apiFetch<AdminCharge>(`/api/admin/charges/${encodeURIComponent(chargeId)}/refund`, {
        method: "POST",
        body: JSON.stringify({ amount: amountMinor === undefined ? undefined : { amountMinor, currency }, reason }),
      }),
    // A refund changes the list and the fees summary alike. Settled, not success: a refund Stripe
    // refused is still recorded (FAILED) and shows in the charge's history.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin", "client-requests"] }),
  })
}
