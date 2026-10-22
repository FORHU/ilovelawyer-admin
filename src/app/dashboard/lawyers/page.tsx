"use client"

import * as React from "react"
import type { OnChangeFn, SortingState } from "@tanstack/react-table"
import { ChevronDown } from "lucide-react"

import { columns } from "@/components/lawyers/columns"
import { DataTable } from "@/components/data-table"
import { type LawyerVerificationStatus, useAdminLawyerVerificationsQuery } from "@/lib/lawyers/queries"

const PAGE_SIZE = 20
// The endpoint has no sortBy — nothing in columns.tsx declares a sortable header, so this is
// just DataTable's required prop wired to a no-op, same as llm-usage's calls table.
const NO_SORTING: SortingState = []

// No UNSUBMITTED: the lawyer app only submits a complete application, so an unsubmitted profile is
// at most an old half-filled draft, and there's nothing an admin can do with one.
const FILTER_STATUSES = ["PENDING", "VERIFIED", "REJECTED"] as const satisfies readonly LawyerVerificationStatus[]
type FilterStatus = (typeof FILTER_STATUSES)[number]

const STATUS_LABELS: Record<FilterStatus, string> = {
  PENDING: "Pending",
  VERIFIED: "Approved",
  REJECTED: "Rejected",
}

// Same semantic colors as the status badges elsewhere on this page, so the filter reads as the
// same vocabulary as the rows it's filtering.
const STATUS_DOT_CLASS: Record<FilterStatus, string> = {
  PENDING: "bg-amber-500",
  VERIFIED: "bg-emerald-500",
  REJECTED: "bg-destructive",
}

const statusSelectClass =
  "h-8 w-48 appearance-none rounded-2xl border border-transparent bg-input/50 py-1.5 pr-8 pl-7 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

export default function LawyersPage() {
  const [status, setStatus] = React.useState<FilterStatus>("PENDING")
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState("")

  const { data, isLoading, isFetching, isError, error } = useAdminLawyerVerificationsQuery({
    status,
    page,
    limit: PAGE_SIZE,
  })

  // Same last-page guard as the Users page: don't leave `page` past the end after a filter
  // shrinks the result set.
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

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lawyer applications</h1>
        <p className="text-muted-foreground text-sm">
          Lawyers applying to take on clients from ilovelawyer.com. Check each registration against the
          regulator&apos;s register: approving confirms which jurisdictions they&apos;re qualified in and lets them
          receive client requests; rejecting emails them the reason.
        </p>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="flex flex-col gap-1 text-xs">
          Status
          <div className="relative">
            <span
              className={`absolute top-1/2 left-3 size-1.5 -translate-y-1/2 rounded-full ${STATUS_DOT_CLASS[status]}`}
              aria-hidden
            />
            <select
              className={statusSelectClass}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as FilterStatus)
                setPage(1)
              }}
            >
              {FILTER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2" />
          </div>
        </label>
        {data && (
          <p className="text-muted-foreground text-sm">
            {data.total} {STATUS_LABELS[status].toLowerCase()} {data.total === 1 ? "lawyer" : "lawyers"}
          </p>
        )}
      </div>
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
        />
      )}
    </div>
  )
}
