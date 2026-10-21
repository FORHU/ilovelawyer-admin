import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/fetch"
import { useAuthStore } from "@/lib/store/auth.store"

// Mirrors ilovelawyer-api's /api/admin/billing (ilovelawyer-api#538), documented under the
// "Admin: Client Billing" tag in src/swagger-client-app.ts. Copy from there if the two drift.
// These are the client app's own payments (case fees and chat credit top-ups), not the lawyer's
// per-case fee.

export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED"
export type PaymentKind = "CASE" | "TOP_UP"
/** DUMMY and FREE took no money: DUMMY is the fake provider used before Stripe, FREE a promo that
 * brought the price to zero. */
export type PaymentProvider = "DUMMY" | "STRIPE" | "FREE"
export type RefundStatus = "PENDING" | "SUCCEEDED" | "FAILED"

export interface Money {
  /** Cents. */
  amountMinor: number
  currency: string
}

export interface BillingFilters {
  from?: string
  to?: string
  userId?: string
  caseId?: string
  status?: PaymentStatus
  kind?: PaymentKind
  provider?: PaymentProvider
  /** Part of the client's email or name. */
  q?: string
}

export interface ClientRefund {
  id: string
  amount: Money
  reason: string
  status: RefundStatus
  externalId: string | null
  failureReason: string | null
  admin: { id: string; name: string | null } | null
  createdAt: string
}

export interface AdminClientPayment {
  id: string
  kind: PaymentKind
  status: PaymentStatus
  provider: PaymentProvider
  externalId: string | null
  amount: Money
  credits: number
  promoCode: string | null
  failureReason: string | null
  usedAt: string | null
  createdAt: string
  client: { id: string; email: string; name: string | null }
  case: { id: string; title: string } | null
  refunded: Money
  refundPending: Money
  /** What a refund can still give back; 0 when the payment can't be refunded. */
  refundable: Money
  refunds: ClientRefund[]
}

export interface PaymentPage {
  rows: AdminClientPayment[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** One row per currency. */
export interface BillingTotals {
  currency: string
  paid: Money
  payments: number
  refunded: Money
  refundPending: Money
  net: Money
}

export interface MoneyGroup {
  key: string
  amount: Money
  payments: number
}

export type StatusCounts = Record<PaymentStatus, number>

export interface BillingSummary {
  range: { from: string; to: string | null }
  totals: BillingTotals[]
  counts: StatusCounts
  byKind: MoneyGroup[]
  byProvider: MoneyGroup[]
  byDay: { day: string; amount: Money; payments: number }[]
}

export interface ClientBilling {
  user: { id: string; email: string; name: string | null; role: string; createdAt: string }
  totals: BillingTotals[]
  counts: StatusCounts
  cases: { id: string; title: string; credits: number; createdAt: string }[]
  payments: PaymentPage
}

function buildQueryString(filters: object, extra: Record<string, string> = {}): string {
  const search = new URLSearchParams(extra)
  for (const [key, value] of Object.entries(filters)) {
    if (value) search.set(key, String(value))
  }
  return search.toString()
}

export function useBillingSummaryQuery(filters: BillingFilters) {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ["admin", "billing", "summary", filters] as const,
    queryFn: () => apiFetch<BillingSummary>(`/api/admin/billing/summary?${buildQueryString(filters)}`),
    // Waits for DashboardLayout's silent refresh to supply the access token, as the users query does.
    enabled: !!accessToken,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  })
}

export function useBillingListQuery(filters: BillingFilters, page: number, limit: number) {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ["admin", "billing", "list", filters, page, limit] as const,
    queryFn: () => apiFetch<PaymentPage>(`/api/admin/billing?${buildQueryString(filters, { page: String(page), limit: String(limit) })}`),
    enabled: !!accessToken,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  })
}

export function useClientBillingQuery(userId: string, page: number, limit: number) {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ["admin", "billing", "client", userId, page, limit] as const,
    queryFn: () => apiFetch<ClientBilling>(`/api/admin/billing/clients/${encodeURIComponent(userId)}?page=${page}&limit=${limit}`),
    enabled: !!accessToken && !!userId,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  })
}

export function useRefundPaymentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ paymentId, amountMinor, reason }: { paymentId: string; amountMinor?: number; reason: string }) =>
      apiFetch<AdminClientPayment>(`/api/admin/billing/${encodeURIComponent(paymentId)}/refund`, {
        method: "POST",
        body: JSON.stringify({ amountMinor, reason }),
      }),
    // A refund changes the summary, the list and the client's page alike. Settled, not success: a
    // refund Stripe refused is still recorded (FAILED) and shows in the payment's history.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin", "billing"] }),
  })
}
