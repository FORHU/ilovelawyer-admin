import { useAuthStore } from "@/lib/store/auth.store"
import { AUTH_PATHS } from "@/lib/api-version"

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").replace(/\/$/, "")

// Mirrors ilovelawyer-app's lib/fetch.ts: AUTH_PATHS go through next.config.ts's
// same-origin rewrite proxy (so the refreshToken cookie lands first-party); every
// other endpoint calls the API directly.
const COOKIE_PROXIED_PATHS = new Set<string>(AUTH_PATHS)

function resolveUrl(path: string): string {
  return COOKIE_PROXIED_PATHS.has(path) ? path : `${API_URL}${path}`
}

type FetchOptions = Omit<RequestInit, "credentials"> & { skipAuthRefresh?: boolean }

let refreshPromise: Promise<string> | null = null

export async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const res = await fetch(resolveUrl("/api/auth/refresh"), {
      method: "POST",
      credentials: "include",
    })

    if (!res.ok) throw new Error("Session expired")

    const data = await res.json()
    useAuthStore.getState().setAccessToken(data.accessToken)
    return data.accessToken as string
  })().finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

async function attemptRefresh(): Promise<void> {
  try {
    await refreshAccessToken()
  } catch (err) {
    useAuthStore.getState().clearAuth()
    // Hard navigation (not router.push) is deliberate: this runs outside any component,
    // and a full reload guarantees in-memory auth/query state is wiped, not just the store.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (typeof window !== "undefined") window.location.href = "/login"
    throw err
  }
}

function buildHeaders(extra?: HeadersInit): HeadersInit {
  const { accessToken } = useAuthStore.getState()
  return {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(extra as Record<string, string>),
  }
}

async function throwIfNotOk(res: Response): Promise<void> {
  if (res.ok) return
  const error = await res.json().catch(() => ({ message: res.statusText }))
  throw Object.assign(new Error(error.message ?? "Request failed"), { status: res.status })
}

export async function apiFetch<T>(path: string, options?: FetchOptions): Promise<T> {
  const { skipAuthRefresh, ...fetchOptions } = options ?? {}
  const url = resolveUrl(path)

  const res = await fetch(url, {
    ...fetchOptions,
    credentials: "include",
    headers: buildHeaders(fetchOptions.headers),
  })

  if (res.status === 401 && !skipAuthRefresh) {
    await attemptRefresh()

    const retry = await fetch(url, {
      ...fetchOptions,
      credentials: "include",
      headers: buildHeaders(fetchOptions.headers),
    })

    await throwIfNotOk(retry)
    return retry.status === 204 ? (undefined as T) : (retry.json() as Promise<T>)
  }

  await throwIfNotOk(res)
  return res.status === 204 ? (undefined as T) : (res.json() as Promise<T>)
}
