import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/fetch"
import { useAuthStore } from "@/lib/store/auth.store"
import type { TenantCode } from "@/lib/settings/queries"

// ilovelawyer-api's PayoutSettingsSvc.listForAdmin: how quotation payments work per tenant. The client
// pays the lawyer's quote plus the platform fee (a rate, never below the minimum); the lawyer's fee
// waits out the hold before it can be withdrawn, in amounts of at least the minimum withdrawal.

export interface PayoutTerms {
  platformFeeBps: number
  minPlatformFeeMinor: number
  earningsHoldDays: number
  minWithdrawalMinor: number
  currency: string
}

type Limit = { min: number; max: number }

export interface PayoutSettingsResponse {
  currency: string
  defaults: PayoutTerms
  limits: Record<"platformFeeBps" | "minPlatformFeeMinor" | "earningsHoldDays" | "minWithdrawalMinor", Limit>
  tenants: { code: TenantCode; name: string; settings: PayoutTerms; isDefault: boolean; updatedAt: string | null }[]
}

export type PayoutSettingsPatch = Partial<Pick<PayoutTerms, "platformFeeBps" | "minPlatformFeeMinor" | "earningsHoldDays" | "minWithdrawalMinor">>

const queryKey = ["admin", "payout-settings"] as const

export function usePayoutSettingsQuery() {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({ queryKey, queryFn: () => apiFetch<PayoutSettingsResponse>("/api/admin/settings/payout-settings"), enabled: !!accessToken })
}

export function useUpdatePayoutSettingsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ tenant, patch }: { tenant: TenantCode; patch: PayoutSettingsPatch }) =>
      apiFetch<unknown>(`/api/admin/settings/tenants/${tenant}/payout-settings`, { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })
}
