"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"

import { type AuditEventRow } from "@/lib/audit/queries"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  })
}

/** "auth.login_failed" is shown as written: the exact action name is what an auditor searches for. */
function summarize(payload: AuditEventRow["payload"]): string {
  if (!payload) return "—"
  return Object.entries(payload)
    .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
    .join(" · ")
}

export const columns: ColumnDef<AuditEventRow>[] = [
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        When
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => <span className="whitespace-nowrap">{formatDateTime(row.original.createdAt)}</span>,
  },
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ row }) => <Badge variant="outline">{row.original.action}</Badge>,
  },
  {
    id: "actor",
    header: "Who",
    cell: ({ row }) => {
      const { actor } = row.original
      if (!actor) return <span className="text-muted-foreground">System or deleted user</span>
      return (
        <div className="flex flex-col">
          <span>{actor.email}</span>
          {actor.name && <span className="text-muted-foreground text-xs">{actor.name}</span>}
        </div>
      )
    },
  },
  {
    id: "details",
    header: "Details",
    cell: ({ row }) => {
      const text = summarize(row.original.payload)
      return (
        <span className="text-muted-foreground block max-w-md truncate text-xs" title={text}>
          {text}
        </span>
      )
    },
  },
]
