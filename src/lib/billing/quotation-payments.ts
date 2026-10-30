import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/fetch"
import { useAuthStore } from "@/lib/store/auth.store"
import type { Money } from "@/lib/billing/queries"

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
  provider: "STRIPE" | "DUMMY"
  paymentIntentId: string | null
  failureReason: string | null
  succeededAt: string | null
  createdAt: string
  refunds: QuotationRefund[]
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

/** What's left to refund, and of that, the lawyer's part (a partial refund can't go past it). */
export function refundable(payment: AdminQuotationPayment) {
  const done = payment.refunds.filter((r) => r.status !== "FAILED")
  const amount = payment.amount.amountMinor - done.reduce((sum, r) => sum + r.amount.amountMinor, 0)
  const serviceFee = payment.serviceFee.amountMinor - done.reduce((sum, r) => sum + r.serviceFee.amountMinor, 0)
  return { amountMinor: amount, serviceFeeMinor: serviceFee }
}
