import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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

const usersQueryKey = ["admin", "users"] as const

export function useAdminUsersQuery() {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: usersQueryKey,
    queryFn: () => apiFetch<AdminUserRow[]>("/api/admin/users"),
    // Defends against firing before DashboardLayout's own silent-refresh has populated
    // the access token — mirrors ilovelawyer-app's useCurrentUserQuery gate.
    enabled: !!accessToken,
  })
}

function useUserTransitionMutation(action: "approve" | "reactivate" | "block" | "unblock") {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => apiFetch(`/api/admin/users/${userId}/${action}`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersQueryKey }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersQueryKey }),
  })
}
