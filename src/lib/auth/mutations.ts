import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/lib/fetch"
import { useAuthStore, type AdminAuthUser } from "@/lib/store/auth.store"

interface AuthTokensResponse {
  user: AdminAuthUser
  accessToken: string
}

export function useLoginMutation() {
  const setAuth = useAuthStore((s) => s.setAuth)

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      apiFetch<AuthTokensResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, remember: true }),
        skipAuthRefresh: true,
      }),
    onSuccess: (data) => {
      setAuth({ accessToken: data.accessToken, user: data.user })
    },
  })
}

export function useLogoutMutation() {
  const router = useRouter()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiFetch("/api/auth/logout", { method: "POST", skipAuthRefresh: true }),
    onSettled: () => {
      clearAuth()
      // Without this, a different admin logging in next in the same tab would see this
      // admin's cached /api/users/me data until it happened to refetch.
      queryClient.clear()
      router.push("/login")
    },
  })
}
