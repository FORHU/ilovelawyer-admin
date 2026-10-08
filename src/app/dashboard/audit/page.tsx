"use client"

import * as React from "react"
import type { OnChangeFn, SortingState } from "@tanstack/react-table"

import { columns } from "@/components/audit/columns"
import { DataTable } from "@/components/data-table"
import { useAuditEventsQuery } from "@/lib/audit/queries"
import type { SortDir } from "@/lib/users/queries"

const PAGE_SIZE = 25
const SEARCH_DEBOUNCE_MS = 400

export default function AuditTrailPage() {
  const [page, setPage] = React.useState(1)
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "createdAt", desc: true }])
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [search])

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    const next = typeof updater === "function" ? updater(sorting) : updater
    setSorting(next)
    setPage(1)
  }

  const sortDir: SortDir = sorting[0]?.desc === false ? "asc" : "desc"

  const { data, isLoading, isFetching, isError, error } = useAuditEventsQuery({
    page,
    limit: PAGE_SIZE,
    sortDir,
    q: debouncedSearch || undefined,
  })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit trail</h1>
        <p className="text-muted-foreground text-sm">
          Who did what, newest first. Search by action (for example &quot;auth.login&quot;) or by the person&apos;s
          email. Events from a deleted account show no name.
        </p>
      </div>
      {isLoading && <p className="text-muted-foreground text-sm">Loading audit events…</p>}
      {isError && <p className="text-destructive text-sm">{(error as Error).message}</p>}
      {data && (
        <DataTable
          columns={columns}
          data={data.data}
          searchPlaceholder="Search by action or email…"
          itemLabel="event"
          total={data.total}
          isFetching={isFetching}
          search={search}
          onSearchChange={setSearch}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          page={data.page}
          pageCount={data.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
