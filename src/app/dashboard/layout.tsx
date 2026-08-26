"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { apiFetch, refreshAccessToken } from "@/lib/fetch"
import { useAuthStore, type AdminAuthUser } from "@/lib/store/auth.store"

// Mirrors ilovelawyer-app's (protected)/layout.tsx guard pattern: no in-memory
// access token on a fresh tab/reload → silent-refresh via the httpOnly cookie,
// then fetch /api/users/me to (re)populate `user` (the refresh response only
// returns a new accessToken, not the user object). Also enforces role === ADMIN
// here, not just at login — a demoted admin's stale reload shouldn't stay in.
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const router = useRouter()
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const setAuth = useAuthStore((s) => s.setAuth)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const [hydrating, setHydrating] = useState(() => !accessToken)

  useEffect(() => {
    if (accessToken) return
    refreshAccessToken()
      .then(() => setHydrating(false))
      .catch(() => {
        clearAuth()
        router.replace("/login")
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { data: currentUser, isError, error } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<AdminAuthUser>("/api/users/me"),
    enabled: !!accessToken && !user,
  })

  useEffect(() => {
    if (!accessToken || user || !currentUser) return
    if (currentUser.role !== "ADMIN") {
      clearAuth()
      router.replace("/login")
      return
    }
    setAuth({ accessToken, user: currentUser })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, user, currentUser])

  const isAuthError =
    isError && ((error as Error & { status?: number }).status === 401 || (error as Error & { status?: number }).status === 403)

  useEffect(() => {
    if (isAuthError) {
      clearAuth()
      router.replace("/login")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthError])

  if (hydrating || (accessToken && !user && !isError)) return null

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-medium">Dashboard</span>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
