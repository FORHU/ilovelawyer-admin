import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/fetch"
import { useAuthStore } from "@/lib/store/auth.store"
import { caseAreasKey } from "@/lib/case-areas/queries"
import type { LawyerSite } from "@/lib/lawyers/queries"

// Mirrors ilovelawyer-api's PracticeAreaSvc and the AdminPracticeArea schema in
// src/swagger-client-handoff.ts, served by /api/admin/practice-areas. Copy from there, not the other
// way around, if the two drift.

export interface AdminPracticeArea {
  id: string
  country: LawyerSite
  name: string
  /** The code of one of the site's client case types (lib/case-areas): a lawyer holding the area is
   * routed client requests of that kind (UK only for now). Null: listed on profiles, but routes no
   * client requests. */
  caseArea: string | null
  /** Off: hidden from the lawyer app's picker and from matching, kept where lawyers hold it. */
  isActive: boolean
  sortOrder: number
  /** Lawyers holding it. Only an area with none can be deleted. */
  lawyerCount: number
  createdAt: string
  updatedAt: string
}

export type PracticeAreaFields = { name: string; caseArea: string | null }

const BASE = "/api/admin/practice-areas"
const keyFor = (site: LawyerSite) => ["admin", "practice-areas", site] as const

export function usePracticeAreasQuery(site: LawyerSite) {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: keyFor(site),
    queryFn: () => apiFetch<AdminPracticeArea[]>(`${BASE}?country=${site}`),
    enabled: !!accessToken,
  })
}

function useSiteMutation<V>(site: LawyerSite, mutationFn: (vars: V) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyFor(site) })
      // A case area's practiceAreaCount changes with the mappings.
      queryClient.invalidateQueries({ queryKey: caseAreasKey(site) })
    },
  })
}

const send = (path: string, method: string, body?: unknown) =>
  apiFetch<unknown>(`${BASE}${path}`, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

export const useCreatePracticeAreaMutation = (site: LawyerSite) =>
  useSiteMutation(site, (fields: PracticeAreaFields) => send("", "POST", { country: site, ...fields }))

export const useUpdatePracticeAreaMutation = (site: LawyerSite) =>
  useSiteMutation(site, ({ id, patch }: { id: string; patch: Partial<PracticeAreaFields> & { isActive?: boolean } }) => send(`/${id}`, "PATCH", patch))

export const useDeletePracticeAreaMutation = (site: LawyerSite) => useSiteMutation(site, (id: string) => send(`/${id}`, "DELETE"))

/** `ids` is every area on the site, in the new order. */
export const useReorderPracticeAreasMutation = (site: LawyerSite) =>
  useSiteMutation(site, (ids: string[]) => send("/reorder", "POST", { country: site, ids }))
