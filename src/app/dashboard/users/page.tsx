"use client"

import * as React from "react"
import Link from "next/link"
import type { OnChangeFn, SortingState } from "@tanstack/react-table"

import { columns } from "@/components/users/columns"
import { DataTable } from "@/components/data-table"
import { useAdminSettingsQuery } from "@/lib/settings/queries"
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

  // Deleting the only row on the last page leaves `page` past the end — step back rather than
  // show an empty table. Adjusting state during render (not in an effect) avoids an extra pass.
  if (data && page > data.totalPages) setPage(data.totalPages)

  const { data: settings } = useAdminSettingsQuery()
  const autoApproveTenants = settings?.tenants.filter((t) => t.autoApproveSignups) ?? []

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground text-sm">
          All registered users. Approve or deny a pending signup — the user is notified by email either way.
          Deleting a user permanently removes their account.
        </p>
      </div>
      {autoApproveTenants.length > 0 && (
        <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-sm">
          Auto-approve is on for {autoApproveTenants.map((t) => t.code).join(" and ")}. New signups there skip this
          queue once their email is verified.{" "}
          <Link href="/dashboard/settings" className="text-foreground underline underline-offset-2">
            Change in Settings
          </Link>
        </p>
      )}
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
