import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/fetch"
import { useAuthStore } from "@/lib/store/auth.store"
import type { Page } from "@/lib/billing/quotation-payments"
import type { Money } from "@/lib/billing/queries"
import type { LawyerSite } from "@/lib/lawyers/queries"

// ilovelawyer-api's GET /api/admin/lawyer-subscriptions: one site's lawyers' monthly plan subscriptions.

export type LawyerSubscriptionStatus = "PENDING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED"
/** ALL: everything but checkouts never paid. CHANGING: cancelling or downgrading at the period's end. */
export type LawyerSubscriptionFilter = "ALL" | "ACTIVE" | "PAST_DUE" | "CHANGING" | "ENDED" | "PENDING"

export interface AdminLawyerSubscription {
  id: string
  status: LawyerSubscriptionStatus
  lawyer: { id: string; name: string | null; firmName: string | null }
  /** price: the plan's current monthly fee, in the site's currency (won on KR). */
  plan: { id: string; code: string; name: string; price: Money; tenantCode: string }
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  /** The lower plan it moves to at currentPeriodEnd. */
  scheduledPlan: { id: string; name: string | null } | null
  failureReason: string | null
  provider: string
  createdAt: string
}

export interface LawyerSubscriptionSummary {
  active: number
  /** What the site's active subscriptions bill each month, at today's plan fees, in its currency. */
  monthly: Money
  pastDue: number
  changing: number
}

export const LAWYER_SUBSCRIPTIONS_PAGE_SIZE = 10

export function useLawyerSubscriptionsQuery(site: LawyerSite, filter: LawyerSubscriptionFilter, page: number) {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ["admin", "lawyer-subscriptions", site, filter, page] as const,
    queryFn: () =>
      apiFetch<Page<AdminLawyerSubscription> & { summary: LawyerSubscriptionSummary }>(
        `/api/admin/lawyer-subscriptions?tenant=${site}&status=${filter}&page=${page}&limit=${LAWYER_SUBSCRIPTIONS_PAGE_SIZE}`,
      ),
    enabled: !!accessToken,
    placeholderData: keepPreviousData,
  })
}
