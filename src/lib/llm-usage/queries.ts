import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/fetch"
import { useAuthStore } from "@/lib/store/auth.store"

export type LlmProvider = "OPENAI" | "TYPESAFE"
export type LlmUsageSource = "ESTIMATED" | "REPORTED"

export interface LlmUsageFilters {
  from?: string
  to?: string
  provider?: LlmProvider
  source?: LlmUsageSource
  model?: string
  feature?: string
  // An id, or NO_PERSON for rows that name none (background work nobody could be attributed to).
  userId?: string
  organizationId?: string
}

/** The API's value for "no user / no organization recorded". */
export const NO_PERSON = "none"

export interface LlmUsagePeople {
  users: { id: string; label: string; email: string | null }[]
  organizations: { id: string; label: string }[]
  hasNoUser: boolean
  hasNoOrganization: boolean
}

export interface LlmUsageRow {
  id: string
  createdAt: string
  provider: LlmProvider
  via: string | null
  // Null when the provider did not say (Chat Wonder, until it reports usage).
  model: string | null
  feature: string
  source: LlmUsageSource
  inputTokens: number
  outputTokens: number
  cachedInputTokens: number | null
  totalTokens: number
  passCount: number | null
  // Null when the model has no verified price: unknown, not free.
  estimatedCostUsd: number | null
  organizationId: string | null
  organizationName: string | null
  userId: string | null
  userName: string | null
  success: boolean
}

export interface LlmUsageListPage {
  rows: LlmUsageRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface UsageTotals {
  tokens: number
  inputTokens: number
  outputTokens: number
  cachedInputTokens: number
  costUsd: number
  calls: number
}

export interface UsageBreakdownRow extends UsageTotals {
  key: string | null
  // Calls with no price. Equal to `calls` means the cost is unknown, not zero.
  unpricedCalls: number
  name?: string | null
  estimated: UsageTotals
  reported: UsageTotals
}

export interface UsageDayRow {
  day: string
  calls: number
  tokens: number
  costUsd: number
  estimatedTokens: number
  reportedTokens: number
}

export interface LlmUsageSummary {
  range: { from: string; to: string | null }
  totals: UsageTotals & { unpricedCalls: number; estimated: UsageTotals; reported: UsageTotals }
  byProvider: UsageBreakdownRow[]
  byModel: UsageBreakdownRow[]
  byFeature: UsageBreakdownRow[]
  byDay: UsageDayRow[]
  topOrganizations: UsageBreakdownRow[]
  topUsers: UsageBreakdownRow[]
}

function buildQueryString(filters: LlmUsageFilters, extra: Record<string, string> = {}): string {
  const search = new URLSearchParams(extra)
  for (const [key, value] of Object.entries(filters)) {
    if (value) search.set(key, value)
  }
  return search.toString()
}

/** Who has usage in the date range, for the user and organization filters. They narrow each other: a
 * chosen organization lists only its users, a chosen user only their organizations. */
export function useLlmUsagePeopleQuery(range: { from?: string; to?: string; userId?: string; organizationId?: string }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ["admin", "llm-usage", "people", range] as const,
    queryFn: () => apiFetch<LlmUsagePeople>(`/api/admin/llm-usage/people?${buildQueryString(range)}`),
    enabled: !!accessToken,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  })
}

export function useLlmUsageSummaryQuery(filters: LlmUsageFilters) {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ["admin", "llm-usage", "summary", filters] as const,
    queryFn: () => apiFetch<LlmUsageSummary>(`/api/admin/llm-usage/summary?${buildQueryString(filters)}`),
    // Waits for DashboardLayout's silent refresh to supply the access token, as the users query does.
    enabled: !!accessToken,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  })
}

export function useLlmUsageListQuery(filters: LlmUsageFilters, page: number, limit: number) {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ["admin", "llm-usage", "list", filters, page, limit] as const,
    queryFn: () =>
      apiFetch<LlmUsageListPage>(`/api/admin/llm-usage?${buildQueryString(filters, { page: String(page), limit: String(limit) })}`),
    enabled: !!accessToken,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  })
}
