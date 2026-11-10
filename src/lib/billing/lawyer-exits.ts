import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/fetch"
import { useAuthStore } from "@/lib/store/auth.store"
import type { Money } from "@/lib/billing/queries"
import type { Page, QuotationPaymentStatus } from "@/lib/billing/quotation-payments"

// ilovelawyer-api's Lawyer Exits (LawyerExitSvc, FORHU/ilovelawyer-app#972): a lawyer ending a paid
// engagement because they can't continue. Nothing is refunded automatically: every paid exit, and any
// refund that failed, waits here for an admin to decide the refund from the lawyer's reason.

export type LawyerExitStatus = "REFUNDING" | "AWAITING_REVIEW" | "WAITING_ON_DISPUTE" | "NEEDS_ATTENTION" | "SETTLED"
export type ExitReason = "CONFLICT" | "CAPACITY" | "OUT_OF_SCOPE" | "OTHER"
/** OPEN: every exit not settled yet. */
export type LawyerExitFilter = "OPEN" | "ALL" | LawyerExitStatus

export interface AdminLawyerExit {
  id: string
  requestId: string
  caseId: string
  caseName: string | null
  status: LawyerExitStatus
  lawyer: { id: string; name: string | null; firmName: string | null }
  client: { id: string; name: string | null }
  reason: ExitReason
  /** May name the other party (a conflict): shown here only, never in the audit log. */
  note: string | null
  workDone: boolean
  claimed: Money | null
  claimNote: string | null
  refunded: Money
  /** Why its refund failed (NEEDS_ATTENTION). */
  failureReason: string | null
  decision: { decidedById: string; decidedAt: string; note: string | null } | null
  payment: {
    id: string
    status: QuotationPaymentStatus
    amount: Money
    serviceFee: Money
    platformFee: Money
    refunded: Money
    /** What a refund may take now, and of that the lawyer's part: worked out by the API. */
    refundable: Money
    refundableServiceFee: Money
  } | null
  createdAt: string
  settledAt: string | null
}

export const LAWYER_EXITS_PAGE_SIZE = 10

const keys = {
  all: ["admin", "lawyer-exits"] as const,
  list: (filter: LawyerExitFilter, page: number) => [...keys.all, "list", filter, page] as const,
}

export function useLawyerExitsQuery(filter: LawyerExitFilter, page: number) {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: keys.list(filter, page),
    queryFn: () => apiFetch<Page<AdminLawyerExit>>(`/api/admin/lawyer-exits?status=${filter}&page=${page}&limit=${LAWYER_EXITS_PAGE_SIZE}`),
    enabled: !!accessToken,
    placeholderData: keepPreviousData,
  })
}

/** Decides an exit's refund: 0 for none, up to what's left of the lawyer's share for part of it, or
 * everything left (the platform fee too). Settled, not success: a refund Stripe refused leaves the exit
 * in NEEDS_ATTENTION, which the list shows. Refreshes the payments too, which carry the exit. */
export function useDecideLawyerExitMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, refund, note }: { id: string; refund: Money; note?: string }) =>
      apiFetch<AdminLawyerExit>(`/api/admin/lawyer-exits/${encodeURIComponent(id)}/decide`, { method: "POST", body: JSON.stringify({ refund, ...(note ? { note } : {}) }) }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: keys.all })
      queryClient.invalidateQueries({ queryKey: ["admin", "quotation-payments"] })
    },
  })
}
