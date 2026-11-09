import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/fetch"
import { useAuthStore } from "@/lib/store/auth.store"
import type { Money } from "@/lib/billing/queries"
import type { ExitReason, LawyerExitStatus } from "@/lib/billing/lawyer-exits"

// ilovelawyer-api's quotation payments (QuotationPaymentSvc): a client paying a lawyer's accepted
// quote through ilovelawyer, split into the lawyer's fee and the platform fee. And the lawyers'
// wallets (WalletSvc) their fees go into.

export type QuotationPaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELED" | "REFUNDED" | "PARTIALLY_REFUNDED" | "DISPUTED"

export interface QuotationRefund {
  id: string
  status: "PENDING" | "SUCCEEDED" | "FAILED"
  amount: Money
  serviceFee: Money
  platformFee: Money
  reason: string
  failureReason: string | null
  createdAt: string
}

export interface AdminQuotationPayment {
  id: string
  quotationId: string
  requestId: string
  clientId: string
  status: QuotationPaymentStatus
  amount: Money
  serviceFee: Money
  platformFee: Money
  refunded: Money
  /** On its way at Stripe: refunds still PENDING. */
  refundPending: Money
  /** What a refund may take now, and of that the lawyer's part (a partial refund can't go past it).
   * Worked out by the API the way it checks a refund; 0 for a disputed or fully refunded payment. */
  refundable: Money
  refundableServiceFee: Money
  provider: "STRIPE" | "DUMMY"
  paymentIntentId: string | null
  failureReason: string | null
  succeededAt: string | null
  createdAt: string
  refunds: QuotationRefund[]
  /** The lawyer stopped acting after this payment (a Lawyer Exit): why, with their notes (admins only;
   * a conflict note may name the other party), and where its refund stands. */
  lawyerExit: {
    id: string
    status: LawyerExitStatus
    reason: ExitReason
    note: string | null
    workDone: boolean
    claimed: Money | null
    claimNote: string | null
    refunded: Money
    failureReason: string | null
    createdAt: string
    settledAt: string | null
  } | null
}

export interface AdminWallet {
  id: string
  owner: { type: "ORGANIZATION" | "USER"; id: string; name: string | null }
  balances: { pending: Money; available: Money; reserved: Money; withdrawn: Money }
  payoutAccount: { provider: "STRIPE" | "DUMMY" | null; connected: boolean; payoutsEnabled: boolean }
  createdAt: string
}

export interface Page<T> {
  total: number
  data: T[]
}

export const QUOTE_PAYMENTS_PAGE_SIZE = 25

const keys = {
  all: ["admin", "quotation-payments"] as const,
  list: (page: number, all: boolean) => [...keys.all, "list", page, all] as const,
  wallets: (page: number) => [...keys.all, "wallets", page] as const,
}

export function useQuotationPaymentsQuery(page: number, all: boolean) {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: keys.list(page, all),
    queryFn: () => apiFetch<Page<AdminQuotationPayment>>(`/api/admin/quotation-payments?page=${page}&limit=${QUOTE_PAYMENTS_PAGE_SIZE}${all ? "&all=true" : ""}`),
    enabled: !!accessToken,
    placeholderData: keepPreviousData,
  })
}

export function useWalletsQuery(page: number) {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: keys.wallets(page),
    queryFn: () => apiFetch<Page<AdminWallet>>(`/api/admin/wallets?page=${page}&limit=${QUOTE_PAYMENTS_PAGE_SIZE}`),
    enabled: !!accessToken,
    placeholderData: keepPreviousData,
  })
}

/** Refunds a payment: everything left when `amountMinor` is left out (the platform fee too), else a
 * partial refund out of the lawyer's fee. Settled, not success: a refund Stripe refused is still
 * recorded (FAILED) and shows in the payment's refunds. */
export function useRefundQuotationPaymentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ paymentId, amountMinor, currency, reason }: { paymentId: string; amountMinor?: number; currency: string; reason: string }) =>
      apiFetch<AdminQuotationPayment>(`/api/admin/quotation-payments/${encodeURIComponent(paymentId)}/refund`, {
        method: "POST",
        body: JSON.stringify({ ...(amountMinor === undefined ? {} : { amount: { amountMinor, currency } }), reason }),
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  })
}