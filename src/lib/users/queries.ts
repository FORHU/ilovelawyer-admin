import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/fetch"
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
