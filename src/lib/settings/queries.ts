import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/fetch"
import { useAuthStore } from "@/lib/store/auth.store"

// Matches ilovelawyer-api's TenantCode — the closed set of seeded Tenants.
export type TenantCode = "PH" | "UK"

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
  feeType: "FIXED" | "PERCENT"
  feeAmount: number
  feeUpdatedAt: string | null
  feeUpdatedBy: { name: string | null; email: string } | null
}

// ilovelawyer-api's PaymentPlan model — one admin-editable B2B subscription tier (Standard/Pro/Max
// are placeholders) for a tenant: its fee, the AI allowance it includes, and its case limit.
export interface PaymentPlan {
  id: string
  code: string
  name: string
  // Shown to the lawyer on the plan picker.
  description: string | null
  // Admin-only — never sent to a lawyer.
  adminNotes: string | null
  level: number
  feeUsd: number
  includedAllowanceUsd: number
  caseLimit: number
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
  paymentPlans: PaymentPlan[]
}

const settingsQueryKey = ["admin", "settings"] as const
const BULK_APPROVAL_POLL_MS = 2000

export function useAdminSettingsQuery() {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: settingsQueryKey,
    queryFn: () => apiFetch<{ tenants: TenantSettings[] }>("/api/admin/settings"),
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
    mutationFn: ({ code, feeType, feeAmount }: { code: TenantCode; feeType: "FIXED" | "PERCENT"; feeAmount: number }) =>
      apiFetch<TenantSettings>(`/api/admin/settings/tenants/${code}`, {
        method: "PATCH",
        body: JSON.stringify({ accountTopUpFeeType: feeType, accountTopUpFeeAmount: feeAmount }),
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
  feeUsd: number
  includedAllowanceUsd: number
  caseLimit: number
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

export function useApprovePendingMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (code: TenantCode) =>
      apiFetch<{ total: number }>(`/api/admin/tenants/${code}/approve-pending`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsQueryKey }),
  })
}
