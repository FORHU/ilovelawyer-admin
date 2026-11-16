import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/fetch"
import { useAuthStore } from "@/lib/store/auth.store"

// Matches ilovelawyer-api's TenantCode (src/types/tenant-code.ts) — the closed set of seeded Tenants.
export type TenantCode = "PH" | "UK" | "KR"

// ilovelawyer-api's BulkApprovalProgress (queues/bulk-approval.runner.ts).
export interface BulkApprovalProgress {
  status: "running" | "done"
  total: number
  done: number
  approved: number
  skipped: number
  failed: number
  startedById: string
  startedAt: string
  finishedAt: string | null
}

// ilovelawyer-api's AccountTopUpPricingSvc.listForAdmin entry: the per-tenant platform fee on a
// lawyer's self-serve account AI top-up.
export interface AccountTopUpPricing {
  code: TenantCode
  name: string
  /** What a lawyer on this site is charged in for a top-up: the site's currency (KRW on KR). */
  currency: PlanCurrency
  feeType: "FIXED" | "PERCENT"
  /** FIXED: in `currency` (dollars, or whole won). PERCENT: 0-100. */
  feeAmount: number
  feeUpdatedAt: string | null
  feeUpdatedBy: { name: string | null; email: string } | null
  /** How much of `currency` buys $1 of AI usage. Null on a US-dollar site, which has nothing to convert. */
  perUsd: number | null
  rateUpdatedAt: string | null
  rateUpdatedBy: { name: string | null; email: string } | null
}

// ilovelawyer-api's PaymentPlan model — one admin-editable B2B subscription tier (Standard/Pro/Max
// are placeholders) for a tenant: its fee, the AI allowance it includes, and its case limit.

/** The currencies a site's lawyers can be charged in (plans and AI top-ups): the API's
 * PLAN_CURRENCIES. Each site is in one (planCurrency), changed on its Payment plans page. */
export type PlanCurrency = "USD" | "GBP" | "PHP" | "KRW"

/** One currency the currency picker offers: its minor-unit digits and the API's ceiling on a fee. */
export interface PlanCurrencyOption {
  code: PlanCurrency
  exponent: number
  maxMinor: number
}
export interface PaymentPlan {
  id: string
  code: string
  name: string
  // Shown to the lawyer on the plan picker.
  description: string | null
  // Admin-only — never sent to a lawyer.
  adminNotes: string | null
  level: number
  /** The monthly fee in `currency`'s smallest unit: cents, or whole won on KR (2000 is $20, 29000 is ₩29,000). */
  priceMinor: number
  currency: PlanCurrency
  /** In US dollars on every site: it measures AI cost, not what the lawyer pays. */
  includedAllowanceUsd: number
  caseLimit: number
  /** Client requests (UK client hand-off) a lawyer on this tier can take on per calendar month. 0 = unlimited. */
  clientRequestLimit: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  updatedBy: { name: string | null; email: string } | null
}

export interface TenantSettings {
  code: TenantCode
  name: string
  autoApproveSignups: boolean
  updatedAt: string | null
  updatedBy: { name: string | null; email: string } | null
  // Verified PENDING accounts — exactly the ones "Approve all pending" would take.
  pendingCount: number
  bulkApproval: BulkApprovalProgress | null
  accountTopUp: AccountTopUpPricing | null
  /** The currency this site's lawyers are charged in (KRW on KR): its tiers, a new tier, and the AI top-up. */
  planCurrency: PlanCurrency
  /** The site's local currency (PHP on PH, KRW on KR, USD on UK): what the picker suggests. */
  defaultPlanCurrency: PlanCurrency
  paymentPlans: PaymentPlan[]
}

export interface AdminSettings {
  tenants: TenantSettings[]
  planCurrencies: PlanCurrencyOption[]
}

const settingsQueryKey = ["admin", "settings"] as const
const BULK_APPROVAL_POLL_MS = 2000

export function useAdminSettingsQuery() {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: settingsQueryKey,
    queryFn: () => apiFetch<AdminSettings>("/api/admin/settings"),
    enabled: !!accessToken,
    // Poll only while an "Approve all pending" run is going, so its progress bar moves.
    refetchInterval: (query) =>
      query.state.data?.tenants.some((t) => t.bulkApproval?.status === "running") ? BULK_APPROVAL_POLL_MS : false,
  })
}

export function useUpdateTenantSettingMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ code, autoApproveSignups }: { code: TenantCode; autoApproveSignups: boolean }) =>
      apiFetch<TenantSettings>(`/api/admin/settings/tenants/${code}`, {
        method: "PATCH",
        body: JSON.stringify({ autoApproveSignups }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsQueryKey }),
  })
}

export function useUpdateAccountTopUpFeeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ code, feeType, feeAmount, perUsd }: { code: TenantCode; feeType: "FIXED" | "PERCENT"; feeAmount: number; perUsd?: number }) =>
      apiFetch<TenantSettings>(`/api/admin/settings/tenants/${code}`, {
        method: "PATCH",
        body: JSON.stringify({ accountTopUpFeeType: feeType, accountTopUpFeeAmount: feeAmount, ...(perUsd !== undefined ? { accountTopUpRate: perUsd } : {}) }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsQueryKey }),
  })
}

export interface PaymentPlanFields {
  code: string
  name: string
  description?: string
  adminNotes?: string
  level?: number
  /** In the site's plan currency's smallest unit; the API sets the currency. */
  priceMinor: number
  includedAllowanceUsd: number
  caseLimit: number
  clientRequestLimit?: number
}

export function useCreatePaymentPlanMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ code, plan }: { code: TenantCode; plan: PaymentPlanFields }) =>
      apiFetch<PaymentPlan>(`/api/admin/settings/tenants/${code}/payment-plans`, {
        method: "POST",
        body: JSON.stringify(plan),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsQueryKey }),
  })
}

export function useUpdatePaymentPlanMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ code, planId, patch }: { code: TenantCode; planId: string; patch: Partial<PaymentPlanFields> & { isActive?: boolean } }) =>
      apiFetch<PaymentPlan>(`/api/admin/settings/tenants/${code}/payment-plans/${planId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsQueryKey }),
  })
}

/** Moves a site's lawyers to another currency, with a price in it for every tier (hidden ones too).
 * The API refuses (409) while a lawyer on the site has a live subscription. */
export function useChangePlanCurrencyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ code, currency, prices }: { code: TenantCode; currency: PlanCurrency; prices: { planId: string; priceMinor: number }[] }) =>
      apiFetch<{ currency: PlanCurrency; checkoutsClosed: number; topUpFeeReset: boolean }>(`/api/admin/settings/tenants/${code}/payment-plans/currency`, {
        method: "PUT",
        body: JSON.stringify({ currency, prices }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsQueryKey }),
  })
}

export function useApprovePendingMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (code: TenantCode) =>
      apiFetch<{ total: number }>(`/api/admin/tenants/${code}/approve-pending`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsQueryKey }),
  })
}
