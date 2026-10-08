import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch, apiFetchRaw } from "@/lib/fetch"
import { useAuthStore } from "@/lib/store/auth.store"

// State machine (see ilovelawyer-api's schema.prisma ApprovalStatus comment):
//   PENDING  --approve-->    ACTIVE
//   PENDING  --deny-->       DENIED
//   DENIED   --reactivate--> ACTIVE
//   ACTIVE   --block-->      BLOCKED
//   BLOCKED  --unblock-->    ACTIVE
export type ApprovalStatus = "PENDING" | "ACTIVE" | "DENIED" | "BLOCKED"

export interface AdminUserRow {
  id: string
  name: string | null
  username: string
  email: string
  role: "USER" | "ADMIN"
  tenant: { name: string } | null
  provider: string | null
  isEmailVerified: boolean
  approvalStatus: ApprovalStatus
  createdAt: string
  lastLoginAt: string | null
}

export type AdminUsersSortBy = "name" | "email" | "createdAt" | "lastLoginAt"
export type SortDir = "asc" | "desc"

export interface AdminUsersQueryParams {
  page: number
  limit: number
  sortBy: AdminUsersSortBy
  sortDir: SortDir
  q?: string
}

export interface AdminUsersPage {
  data: AdminUserRow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Mutations invalidate this ["admin", "users"] prefix, which matches every params
// variant below it — no need to enumerate pages/sorts/searches when busting the cache.
const usersQueryKey = (params: AdminUsersQueryParams) => ["admin", "users", params] as const

function buildUsersQueryString(params: AdminUsersQueryParams): string {
  const search = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    sortBy: params.sortBy,
    sortDir: params.sortDir,
  })
  if (params.q) search.set("q", params.q)
  return search.toString()
}

export function useAdminUsersQuery(params: AdminUsersQueryParams) {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: usersQueryKey(params),
    queryFn: () => apiFetch<AdminUsersPage>(`/api/admin/users?${buildUsersQueryString(params)}`),
    // Defends against firing before DashboardLayout's own silent-refresh has populated
    // the access token — mirrors ilovelawyer-app's useCurrentUserQuery gate.
    enabled: !!accessToken,
    staleTime: 30 * 1000,
    // Keeps the current page's rows on screen while the next page/sort/search loads,
    // instead of flashing the loading state on every pagination click.
    placeholderData: keepPreviousData,
  })
}

function useUserTransitionMutation(action: "approve" | "reactivate" | "block" | "unblock") {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => apiFetch(`/api/admin/users/${userId}/${action}`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  })
}

export const useApproveUserMutation = () => useUserTransitionMutation("approve")
export const useReactivateUserMutation = () => useUserTransitionMutation("reactivate")
export const useBlockUserMutation = () => useUserTransitionMutation("block")
export const useUnblockUserMutation = () => useUserTransitionMutation("unblock")

// Admin bypass of the signup email code — not an approval transition, so no email is sent.
export function useVerifyEmailMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => apiFetch(`/api/admin/users/${userId}/verify-email`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  })
}

export function useDenyUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      apiFetch(`/api/admin/users/${userId}/deny`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  })
}

// Downloads the same zip the person can download from their own profile (PDF summary, complete
// record, uploaded files), produced on their behalf. The API requires the admin to confirm they
// verified who is asking, records the export under the admin's name, and builds the file as it
// streams, so a large account can take a while.
export function useExportUserDataMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiFetchRaw(`/api/admin/users/${userId}/export`, {
        method: "POST",
        body: JSON.stringify({ identityVerified: true }),
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `ilovelawyer-user-data-${userId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.zip`
      document.body.appendChild(link)
      link.click()
      link.remove()
      // Revoked on the next turn so the browser has already started reading the blob.
      setTimeout(() => URL.revokeObjectURL(url), 0)
    },
    // The export is an audit event; refresh the audit trail page if it is open.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "audit-events"] }),
  })
}

// Immediate, permanent hard delete — no grace period and no undo.
export function useDeleteUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => apiFetch(`/api/admin/users/${userId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  })
}
