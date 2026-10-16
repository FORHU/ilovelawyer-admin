"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, ThumbsDown, ThumbsUp } from "lucide-react"

import { type FeedbackResolvedReferences, type FeedbackRow, type FeedbackSource } from "@/lib/feedback/queries"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const SOURCE_LABEL: Record<FeedbackSource, string> = {
  GENERAL: "Feedback form",
  CHAT_ANSWER: "Chat answer",
  TERMINAL_PANE: "Terminal pane",
}

const CATEGORY_LABEL: Record<string, string> = {
  BUG: "Something is broken",
  WRONG_ANSWER: "Wrong or incomplete answer",
  IDEA: "Idea or request",
  QUESTION: "Question",
}

const EMPTY_REFERENCES: FeedbackResolvedReferences = { organizations: {}, cases: {} }

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id
}

interface DetailLine {
  label: string
  value: string
  // The raw id behind a name, shown on hover so nothing is lost by resolving it.
  title?: string
}

/** Where the feedback was sent from: the page, the organization and case as names, and the pane or answer. */
export function describeWhere(row: FeedbackRow, resolved: FeedbackResolvedReferences): DetailLine[] {
  const lines: DetailLine[] = []
  if (row.pagePath) lines.push({ label: "Page", value: row.pagePath })
  if (row.organizationId) {
    const name = resolved.organizations[row.organizationId]
    lines.push({ label: "Organization", value: name ?? `Deleted organization (${shortId(row.organizationId)})`, title: row.organizationId })
  }
  if (row.caseId) {
    const name = resolved.cases[row.caseId]
    lines.push({ label: "Case", value: name ?? `Deleted case (${shortId(row.caseId)})`, title: row.caseId })
  }
  if (row.panelId) lines.push({ label: "Pane", value: row.panelId })
  if (row.messageId) lines.push({ label: "Answer", value: shortId(row.messageId), title: row.messageId })
  return lines
}

export function makeColumns(resolved: FeedbackResolvedReferences | undefined): ColumnDef<FeedbackRow>[] {
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
      id: "from",
      header: "From",
      cell: ({ row }) => {
        const { source, rating, category } = row.original
        return (
          <div className="flex flex-col items-start gap-1">
            <Badge variant="outline">{SOURCE_LABEL[source]}</Badge>
            {rating === "UP" && (
              <span className="flex items-center gap-1 text-xs">
                <ThumbsUp className="size-3.5" /> Helpful
              </span>
            )}
            {rating === "DOWN" && (
              <span className="flex items-center gap-1 text-xs">
                <ThumbsDown className="size-3.5" /> Not helpful
              </span>
            )}
            {category && <span className="text-muted-foreground text-xs">{CATEGORY_LABEL[category] ?? category}</span>}
          </div>
        )
      },
    },
    {
      id: "user",
      header: "Who",
      cell: ({ row }) => {
        const { user } = row.original
        return (
          <div className="flex flex-col">
            <span>{user.email}</span>
            {user.name && <span className="text-muted-foreground text-xs">{user.name}</span>}
          </div>
        )
      },
    },
    {
      id: "comment",
      header: "Comment",
      cell: ({ row }) => {
        const { comment } = row.original
        if (!comment) return <span className="text-muted-foreground">No comment</span>
        return <p className="max-w-md whitespace-pre-wrap break-words">{comment}</p>
      },
    },
    {
      id: "where",
      header: "Where",
      cell: ({ row }) => {
        const lines = describeWhere(row.original, references)
        if (lines.length === 0) return <span className="text-muted-foreground">—</span>
        return (
          <dl className="flex flex-col gap-0.5 text-xs">
            {lines.map((line) => (
              <div key={line.label} className="flex gap-2">
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
