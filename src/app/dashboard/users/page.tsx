"use client"

import { columns } from "@/components/users/columns"
import { DataTable } from "@/components/data-table"
import { useAdminUsersQuery } from "@/lib/users/queries"

export default function UsersPage() {
  const { data: users, isLoading, isError, error } = useAdminUsersQuery()

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
      {users && <DataTable columns={columns} data={users} searchPlaceholder="Search users…" />}
    </div>
  )
}
