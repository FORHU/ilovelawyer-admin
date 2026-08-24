import { columns } from "@/components/users/columns"
import { DataTable } from "@/components/data-table"
import { mockUsers } from "@/lib/mock-users"

export default function UsersPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground text-sm">
          All registered users. Mock data for now — not yet wired to the API.
        </p>
      </div>
      <DataTable columns={columns} data={mockUsers} searchPlaceholder="Search users…" />
    </div>
  )
}
