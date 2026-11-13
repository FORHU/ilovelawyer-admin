import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/fetch"
import { useAuthStore } from "@/lib/store/auth.store"
import type {
  AdminSupportActionDef,
  AdminSupportDraft,
  AdminSupportVersion,
  SupportContent,
  SupportContentProblem,
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
