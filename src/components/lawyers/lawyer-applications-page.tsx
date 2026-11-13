"use client"

import * as React from "react"
import type { OnChangeFn, SortingState } from "@tanstack/react-table"

import { DataTable } from "@/components/data-table"
import { columnsFor } from "@/components/lawyers/columns"
import { LawyerApplicationDialog } from "@/components/lawyers/lawyer-verification-actions"
import { type LawyerSite, type LawyerVerificationStatus, useAdminLawyerVerificationsQuery } from "@/lib/lawyers/queries"

const PAGE_SIZE = 20
// The endpoint has no sortBy — nothing in columns.tsx declares a sortable header, so this is
// just DataTable's required prop wired to a no-op, same as llm-usage's calls table.
const NO_SORTING: SortingState = []

/** The statuses the queue shows, one tab each. No UNSUBMITTED: the lawyer app only submits a
 * complete application, so an unsubmitted profile is at most an old half-filled draft, and there's
 * nothing an admin can do with one. */
export const APPLICATION_STATUSES = ["PENDING", "VERIFIED", "REJECTED"] as const satisfies readonly LawyerVerificationStatus[]
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  PENDING: "Pending",
  VERIFIED: "Approved",
  REJECTED: "Rejected",
}

/** One site's applications in one status: the table, filterable on this page, and the application
 * dialog a row opens. The site and status come from the URL (sidebar, then tabs). */
export function LawyerApplicationsPage({ site, status }: { site: LawyerSite; status: ApplicationStatus }) {
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState("")

  const { data, isLoading, isFetching, isError, error } = useAdminLawyerVerificationsQuery({ site, status, page, limit: PAGE_SIZE })
  // Each site checks different registration details, so the table's columns follow the site.
  const columns = React.useMemo(() => columnsFor(site), [site])

  // Same last-page guard as the Users page: don't leave `page` past the end after the result set
  // shrinks (an approval takes a row off Pending).
  if (data && page > data.totalPages) setPage(data.totalPages)

  const handleSortingChange: OnChangeFn<SortingState> = () => {}

  // The endpoint takes `status` but no `q` — this narrows what's visible on the current page
  // only, which is fine for a queue this size; it isn't a search across every pending lawyer.
  const visibleRows = React.useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    if (!q) return data.data
    return data.data.filter((row) => row.name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q))
  }, [data, search])

  // The application dialog, opened by clicking a row. Kept by id and read from the latest page, so
  // it shows fresh details after an approval, and closes once the lawyer leaves this tab.
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const selected = data?.data.find((row) => row.userId === selectedId) ?? null

  return (
    <div className="flex flex-col gap-4">
      {data && (
        <p className="text-muted-foreground text-sm">
          {data.total} {APPLICATION_STATUS_LABELS[status].toLowerCase()} {data.total === 1 ? "lawyer" : "lawyers"}
        </p>
      )}
      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
      {isError && <p className="text-destructive text-sm">{(error as Error).message}</p>}
      {data && (
        <DataTable
          columns={columns}
          data={visibleRows}
          searchPlaceholder="Filter this page by name or email…"
          itemLabel="lawyer"
          total={data.total}
          isFetching={isFetching}
          search={search}
          onSearchChange={setSearch}
          sorting={NO_SORTING}
          onSortingChange={handleSortingChange}
          page={data.page}
          pageCount={data.totalPages}
          onPageChange={setPage}
          onRowClick={(row) => setSelectedId(row.userId)}
          rowLabel={(row) => `View ${row.name}'s application`}
        />
      )}
      <LawyerApplicationDialog lawyer={selected} open={!!selected} onOpenChange={(open) => !open && setSelectedId(null)} />
    </div>
  )
}
