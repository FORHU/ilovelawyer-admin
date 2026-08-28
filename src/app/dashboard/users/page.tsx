"use client"

import * as React from "react"
import type { OnChangeFn, SortingState } from "@tanstack/react-table"

import { columns } from "@/components/users/columns"
import { DataTable } from "@/components/data-table"
import { useAdminUsersQuery, type AdminUsersSortBy, type SortDir } from "@/lib/users/queries"

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 400

export default function UsersPage() {
  const [page, setPage] = React.useState(1)
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "createdAt", desc: true }])
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")

  React.useEffect(() => {
    // Resetting the page here (rather than in an effect keyed on debouncedSearch)
    // avoids a synchronous setState-in-effect render cascade.
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

  const sort = sorting[0]
  const sortBy = (sort?.id as AdminUsersSortBy | undefined) ?? "createdAt"
  const sortDir: SortDir = sort?.desc ? "desc" : "asc"

  const { data, isLoading, isFetching, isError, error } = useAdminUsersQuery({
    page,
    limit: PAGE_SIZE,
    sortBy,
    sortDir,
    q: debouncedSearch || undefined,
  })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground text-sm">
          All registered users. Approve or deny a pending signup — the user is notified by email either way.
        </p>
      </div>
      {isLoading && <p className="text-muted-foreground text-sm">Loading users…</p>}
      {isError && <p className="text-destructive text-sm">{(error as Error).message}</p>}
      {data && (
        <DataTable
          columns={columns}
          data={data.data}
          searchPlaceholder="Search users…"
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
