import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/fetch"
import { useAuthStore } from "@/lib/store/auth.store"

// Mirrors ilovelawyer-api's PersonaRoutingOverrideSvc, served by /api/admin/persona-routing
// (chat-wonder-v2-api#149/CW-8). chat-wonder-v2-api polls the separate, api-key-guarded
// /api/persona-routing on its own timer -- this page only talks to the admin endpoint.

export type RoutingMode = "AUTO" | "MANUAL"

export interface PersonaRoutingOverride {
  persona: string
  routingMode: RoutingMode
  manualPinnedModel: string | null
  toolOverrides: Record<string, string> | null
  updatedAt: string
  updatedById: string | null
}

export type PersonaRoutingOverrideFields = {
  routingMode: RoutingMode
  manualPinnedModel?: string | null
  toolOverrides?: Record<string, string> | null
}

const BASE = "/api/admin/persona-routing"
const KEY = ["admin", "persona-routing"] as const

export function usePersonaRoutingOverridesQuery() {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiFetch<{ overrides: PersonaRoutingOverride[] }>(BASE).then((r) => r.overrides),
    enabled: !!accessToken,
  })
}

export function useUpdatePersonaRoutingOverrideMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ persona, fields }: { persona: string; fields: PersonaRoutingOverrideFields }) =>
      apiFetch<{ override: PersonaRoutingOverride }>(`${BASE}/${encodeURIComponent(persona)}`, {
        method: "PATCH",
        body: JSON.stringify(fields),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  })
}
