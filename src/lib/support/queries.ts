import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/fetch"
import { useAuthStore } from "@/lib/store/auth.store"
import type {
  AdminSupportActionDef,
  AdminSupportDraft,
  AdminSupportVersion,
  SupportContent,
  SupportContentProblem,
  SupportReport,
  SupportTicketDetail,
  SupportTicketPage,
  SupportTicketStatus,
} from "@/lib/support/types"

// ilovelawyer-api's /api/admin/support/content/* (SupportContentAdminCtrl). The draft is loaded once
// into lib/support/draft-store.ts, which every editor page edits; these hooks only fetch and send it.

const BASE = "/api/admin/support"

export const supportKeys = {
  draft: ["admin", "support", "draft"] as const,
  versions: ["admin", "support", "versions"] as const,
  version: (version: number) => ["admin", "support", "versions", version] as const,
  actions: ["admin", "support", "actions"] as const,
}

type ApiError = Error & { status?: number; code?: string; body?: Record<string, unknown> }

/** The reasons the API refused to publish (422 SUPPORT_CONTENT_INVALID), or none. */
export function problemsOf(err: unknown): SupportContentProblem[] {
  const problems = (err as ApiError).body?.problems
  return Array.isArray(problems) ? (problems as SupportContentProblem[]) : []
}

/** Someone saved the draft since this editor loaded it. */
export const isDraftConflict = (err: unknown) => (err as ApiError).code === "DRAFT_CONFLICT"

export function useSupportDraftQuery() {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: supportKeys.draft,
    queryFn: () => apiFetch<AdminSupportDraft>(`${BASE}/content/draft`),
    enabled: !!accessToken,
    // The editor owns the draft once it is loaded: a background refetch must not replace edits.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}

export function useSupportActionsQuery() {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: supportKeys.actions,
    queryFn: () => apiFetch<AdminSupportActionDef[]>(`${BASE}/actions`),
    enabled: !!accessToken,
    staleTime: Infinity,
  })
}

export function useSupportVersionsQuery() {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: supportKeys.versions,
    queryFn: () => apiFetch<AdminSupportVersion[]>(`${BASE}/content/versions`),
    enabled: !!accessToken,
  })
}

/** Saves the whole draft. `expectedUpdatedAt` is the updatedAt this editor loaded: 409 DRAFT_CONFLICT if it moved. */
export function useSaveSupportDraftMutation() {
  return useMutation({
    mutationFn: (vars: { content: SupportContent; expectedUpdatedAt: string }) =>
      apiFetch<AdminSupportDraft>(`${BASE}/content/draft`, { method: "PUT", body: JSON.stringify(vars) }),
  })
}

export function useValidateSupportDraftMutation() {
  return useMutation({
    mutationFn: () => apiFetch<{ valid: boolean; problems: SupportContentProblem[] }>(`${BASE}/content/draft/validate`, { method: "POST" }),
  })
}

export function usePublishSupportMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch<{ version: number; publishedAt: string }>(`${BASE}/content/publish`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: supportKeys.versions }),
  })
}

export function useRollbackSupportMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (version: number) =>
      apiFetch<{ version: number; publishedAt: string; rolledBackFromVersion: number }>(`${BASE}/content/versions/${version}/rollback`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: supportKeys.versions }),
  })
}

// Support Tickets and the outcome report. The admin app has no socket, so the inbox and an open
// ticket poll every 30 seconds; a reply the client just sent shows within that.

export const TICKET_POLL_MS = 30_000

export interface SupportTicketFilters {
  status?: SupportTicketStatus
  q: string
  sort: "age" | "updated"
  page: number
}

export const ticketKeys = {
  all: ["admin", "support", "tickets"] as const,
  list: (filters: SupportTicketFilters) => ["admin", "support", "tickets", "list", filters] as const,
  one: (id: string) => ["admin", "support", "tickets", "one", id] as const,
  report: (from: string, to: string) => ["admin", "support", "report", from, to] as const,
}

export function useSupportTicketsQuery(filters: SupportTicketFilters) {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ticketKeys.list(filters),
    queryFn: () => {
      const params = new URLSearchParams({ sort: filters.sort, page: String(filters.page) })
      if (filters.status) params.set("status", filters.status)
      if (filters.q.trim()) params.set("q", filters.q.trim())
      return apiFetch<SupportTicketPage>(`${BASE}/tickets?${params}`)
    },
    enabled: !!accessToken,
    placeholderData: keepPreviousData,
    refetchInterval: TICKET_POLL_MS,
  })
}

export function useSupportTicketQuery(id: string) {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ticketKeys.one(id),
    queryFn: () => apiFetch<SupportTicketDetail>(`${BASE}/tickets/${encodeURIComponent(id)}`),
    enabled: !!accessToken,
    refetchInterval: TICKET_POLL_MS,
  })
}

function useTicketMutation<V>(mutationFn: (vars: V) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ticketKeys.all }),
  })
}

const post = (id: string, path: string, body?: unknown) =>
  apiFetch<unknown>(`${BASE}/tickets/${encodeURIComponent(id)}/${path}`, { method: "POST", ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

export const useReplyToTicketMutation = (id: string) => useTicketMutation((body: string) => post(id, "replies", { body }))
export const useResolveTicketMutation = (id: string) => useTicketMutation(() => post(id, "resolve"))
export const useReopenTicketMutation = (id: string) => useTicketMutation(() => post(id, "reopen"))

/** `from` and `to` are ISO instants; `to` is exclusive. */
export function useSupportReportQuery(from: string, to: string, enabled: boolean) {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ticketKeys.report(from, to),
    queryFn: () => apiFetch<SupportReport>(`${BASE}/report?${new URLSearchParams({ from, to })}`),
    enabled: !!accessToken && enabled,
    placeholderData: keepPreviousData,
  })
}
