import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/fetch"
import { useAuthStore } from "@/lib/store/auth.store"
import type { SortDir } from "@/lib/users/queries"

export interface AuditEventRow {
  id: string
  action: string
  caseId: string | null
  payload: Record<string, unknown> | null
  createdAt: string
  // null when the user has since been deleted (the API clears the link on deletion).
  actor: { id: string; email: string; name: string | null } | null
}

export interface AuditEventsQueryParams {
  page: number
  limit: number
  sortDir: SortDir
  q?: string
}

export interface AuditEventsPage {
  data: AuditEventRow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

function buildQueryString(params: AuditEventsQueryParams): string {
  const search = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    sortDir: params.sortDir,
  })
  if (params.q) search.set("q", params.q)
  return search.toString()
}

export function useAuditEventsQuery(params: AuditEventsQueryParams) {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ["admin", "audit-events", params] as const,
    queryFn: () => apiFetch<AuditEventsPage>(`/api/admin/audit-events?${buildQueryString(params)}`),
    // Waits for DashboardLayout's silent refresh to supply the access token, as the users query does.
    enabled: !!accessToken,
    staleTime: 10 * 1000,
    placeholderData: keepPreviousData,
  })
}
