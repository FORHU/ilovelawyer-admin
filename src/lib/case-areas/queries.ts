import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/fetch"
import { useAuthStore } from "@/lib/store/auth.store"
import type { LawyerSite } from "@/lib/lawyers/queries"

// Mirrors ilovelawyer-api's CaseAreaSvc and the AdminCaseArea schema in
// src/swagger-client-handoff.ts, served by /api/admin/case-areas. Copy from there, not the other
// way around, if the two drift.

/** Client cases are UK only for now (CLIENT_CASE_COUNTRY in the API): PH's list waits for them. */
export const CLIENT_CASE_SITE: LawyerSite = "UK"

/** Always on and never deleted: where a case nothing else fits goes. */
export const OTHER_CASE_AREA = "OTHER"

/** The API's limits (CASE_AREA_CODE_PATTERN, CASE_AREA_NAME_MAX_LENGTH, CASE_AREA_DESCRIPTION_MAX_LENGTH). */
export const CASE_AREA_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,39}$/
export const CASE_AREA_NAME_MAX = 60
export const CASE_AREA_DESCRIPTION_MAX = 500

/** A kind of problem a client's case can be about: the client app's "Type of issue". */
export interface AdminCaseArea {
  id: string
  country: LawyerSite
  /** What cases and practice areas hold. Fixed once made. */
  code: string
  name: string
  /** What Jev is told the area covers when it decides a case's areas. */
  description: string
  /** Off: hidden from the client's picker and from Jev, kept on cases that have it. */
  isActive: boolean
  sortOrder: number
  caseCount: number
  /** The site's practice areas that map to it. Deleting needs this and caseCount at 0. */
  practiceAreaCount: number
  createdAt: string
  updatedAt: string
}

export type CaseAreaFields = { name: string; description: string }

const BASE = "/api/admin/case-areas"
export const caseAreasKey = (site: LawyerSite) => ["admin", "case-areas", site] as const

export function useCaseAreasQuery(site: LawyerSite) {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: caseAreasKey(site),
    queryFn: () => apiFetch<AdminCaseArea[]>(`${BASE}?country=${site}`),
    enabled: !!accessToken,
  })
}

function useSiteMutation<V>(site: LawyerSite, mutationFn: (vars: V) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: caseAreasKey(site) }) })
}

const send = (path: string, method: string, body?: unknown) =>
  apiFetch<unknown>(`${BASE}${path}`, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

export const useCreateCaseAreaMutation = (site: LawyerSite) =>
  useSiteMutation(site, (fields: CaseAreaFields & { code: string }) => send("", "POST", { country: site, ...fields }))

export const useUpdateCaseAreaMutation = (site: LawyerSite) =>
  useSiteMutation(site, ({ id, patch }: { id: string; patch: Partial<CaseAreaFields> & { isActive?: boolean } }) => send(`/${id}`, "PATCH", patch))

export const useDeleteCaseAreaMutation = (site: LawyerSite) => useSiteMutation(site, (id: string) => send(`/${id}`, "DELETE"))

/** `ids` is every case area on the site, in the new order. */
export const useReorderCaseAreasMutation = (site: LawyerSite) =>
  useSiteMutation(site, (ids: string[]) => send("/reorder", "POST", { country: site, ids }))

/** A code to suggest for a new area's name: "Wills & Probate" → "WILLS_PROBATE". */
export function suggestCaseAreaCode(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^[^A-Z]+|_+$/g, "")
    .slice(0, 40)
}
