"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"

import { type AdminUserRow } from "@/lib/users/queries"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UserApprovalActions } from "@/components/users/user-approval-actions"

function initials(name: string | null, username: string): string {
  const source = name ?? username
  return source
    .split(/[.\s]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function sortableHeader(label: string) {
  return function Header({ column }: { column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | "asc" | "desc" } }) {
    return (
      <Button
        variant="ghost"
        className="-ml-3 h-8"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        {label}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    )
  }
}

export const columns: ColumnDef<AdminUserRow>[] = [
  {
    accessorKey: "name",
    header: sortableHeader("Name"),
    cell: ({ row }) => {
      const user = row.original
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {initials(user.name, user.username)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{user.name ?? "—"}</span>
            <span className="text-muted-foreground text-xs">@{user.username}</span>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "email",
    header: sortableHeader("Email"),
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = row.original.role
      return <Badge variant={role === "ADMIN" ? "default" : "secondary"}>{role}</Badge>
    },
  },
  {
    accessorKey: "provider",
    header: "Sign-in",
    cell: ({ row }) => (row.original.provider === "google" ? "Google" : "Email"),
  },
  {
    accessorKey: "isEmailVerified",
    header: "Verified",
    cell: ({ row }) =>
      row.original.isEmailVerified ? (
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
          Verified
        </Badge>
      ) : (
        <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">
          Unverified
        </Badge>
      ),
  },
  {
    accessorKey: "approvalStatus",
    header: "Approval",
    cell: ({ row }) => {
      const status = row.original.approvalStatus
      if (status === "ACTIVE")
        return (
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
            Active
          </Badge>
        )
      if (status === "DENIED")
        return (
          <Badge variant="outline" className="border-destructive/40 text-destructive">
            Denied
          </Badge>
        )
      if (status === "BLOCKED")
        return (
          <Badge variant="outline" className="border-slate-500/40 text-slate-600 dark:text-slate-400">
            Blocked
          </Badge>
        )
      return (
        <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">
          Pending
        </Badge>
      )
    },
  },
  {
    accessorKey: "createdAt",
    header: sortableHeader("Joined"),
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
  {
    accessorKey: "lastLoginAt",
    header: sortableHeader("Last login"),
    cell: ({ row }) => formatDate(row.original.lastLoginAt),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <UserApprovalActions user={row.original} />,
  },
]
