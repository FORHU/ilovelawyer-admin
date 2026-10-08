"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"

import { type AuditEventRow, type AuditResolvedReferences } from "@/lib/audit/queries"
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

interface DetailLine {
  label: string
  value: string
  // The raw id behind a name, shown on hover so nothing is lost by resolving it.
  title?: string
}

const EMPTY_REFERENCES: AuditResolvedReferences = { organizations: {}, users: {}, cases: {} }

function humanize(key: string): string {
  const spaced = key.replace(/([A-Z])/g, " $1").toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function formatValue(value: unknown): string {
  if (value && typeof value === "object") return JSON.stringify(value)
  return String(value)
}

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id
}

/** One labelled line per detail, with organization, person and case ids shown as names. */
export function describeEvent(event: AuditEventRow, resolved: AuditResolvedReferences): DetailLine[] {
  const lines: DetailLine[] = []
  const payload = event.payload ?? {}

  const caseId = event.caseId ?? (typeof payload.caseId === "string" ? payload.caseId : null)
  if (caseId) {
    const name = resolved.cases[caseId]
    lines.push({ label: "Case", value: name ?? `Deleted case (${shortId(caseId)})`, title: caseId })
  }

  for (const [key, raw] of Object.entries(payload)) {
    if (key === "caseId") continue
    const id = typeof raw === "string" ? raw : null

    if ((key === "organizationId" || key === "orgId") && id) {
      const name = resolved.organizations[id]
      lines.push({ label: "Organization", value: name ?? `Deleted organization (${shortId(id)})`, title: id })
    } else if ((key === "targetUserId" || key === "inviteeId" || key === "userId") && id) {
      const label = key === "targetUserId" ? "Person affected" : key === "inviteeId" ? "Invitee" : "Account"
      const user = resolved.users[id]
      lines.push({
        label,
        value: user ? (user.name ? `${user.name} (${user.email})` : user.email) : `Deleted account (${shortId(id)})`,
        title: id,
      })
    } else {
      lines.push({ label: humanize(key), value: formatValue(raw) })
    }
  }

  return lines
}

export function makeColumns(resolved: AuditResolvedReferences | undefined): ColumnDef<AuditEventRow>[] {
  const references = resolved ?? EMPTY_REFERENCES

  return [
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
      // "auth.login_failed" is shown as written: the exact action name is what an auditor searches for.
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
        const lines = describeEvent(row.original, references)
        if (lines.length === 0) return <span className="text-muted-foreground">—</span>
        return (
          <dl className="flex flex-col gap-0.5 text-xs">
            {lines.map((line, index) => (
              <div key={`${line.label}-${index}`} className="flex gap-2">
                <dt className="text-muted-foreground shrink-0">{line.label}:</dt>
                <dd className="break-words" title={line.title}>
                  {line.value}
                </dd>
              </div>
            ))}
          </dl>
        )
      },
    },
  ]
}
