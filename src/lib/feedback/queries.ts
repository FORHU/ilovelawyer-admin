import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/fetch"
import { useAuthStore } from "@/lib/store/auth.store"
import type { SortDir } from "@/lib/users/queries"

export type FeedbackSource = "GENERAL" | "CHAT_ANSWER" | "TERMINAL_PANE"
export type FeedbackRating = "UP" | "DOWN"

export interface FeedbackRow {
  id: string
  source: FeedbackSource
  rating: FeedbackRating | null
  category: string | null
  // null when the sender left no comment (a thumbs-up may), or when it is sealed and can't be opened.
  comment: string | null
  organizationId: string | null
  caseId: string | null
  consultationId: string | null
  messageId: string | null
  panelId: string | null
  pagePath: string | null
  userAgent: string | null
  viewport: string | null
  createdAt: string
  user: { id: string; email: string; name: string | null }
}

export interface FeedbackQueryParams {
  page: number
  limit: number
  sortDir: SortDir
  q?: string
  source?: FeedbackSource
  rating?: FeedbackRating
}

// Names for the ids on this page. An id missing from a map belongs to something that no longer
// exists (a deleted organization or case).
export interface FeedbackResolvedReferences {
  organizations: Record<string, string>
  cases: Record<string, string>
}

export interface FeedbackPage {
  data: FeedbackRow[]
  resolved: FeedbackResolvedReferences
  total: number
  page: number
  limit: number
  totalPages: number
}

function buildQueryString(params: FeedbackQueryParams): string {
  const search = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    sortDir: params.sortDir,
  })
  if (params.q) search.set("q", params.q)
  if (params.source) search.set("source", params.source)
  if (params.rating) search.set("rating", params.rating)
  return search.toString()
}

export function useFeedbackQuery(params: FeedbackQueryParams) {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ["admin", "feedback", params] as const,
    queryFn: () => apiFetch<FeedbackPage>(`/api/admin/feedback?${buildQueryString(params)}`),
    // Waits for DashboardLayout's silent refresh to supply the access token, as the audit query does.
    enabled: !!accessToken,
    staleTime: 10 * 1000,
    placeholderData: keepPreviousData,
  })
}
