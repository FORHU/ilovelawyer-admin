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

export interface TenantSettings {
  code: TenantCode
  name: string
  autoApproveSignups: boolean
  updatedAt: string | null
  updatedBy: { name: string | null; email: string } | null
  // Verified PENDING accounts — exactly the ones "Approve all pending" would take.
  pendingCount: number
  bulkApproval: BulkApprovalProgress | null
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

export function useApprovePendingMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (code: TenantCode) =>
      apiFetch<{ total: number }>(`/api/admin/tenants/${code}/approve-pending`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: settingsQueryKey }),
  })
}
