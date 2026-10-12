"use client"

import { type ColumnDef } from "@tanstack/react-table"

import { type LlmUsageRow } from "@/lib/llm-usage/queries"
import { Badge } from "@/components/ui/badge"

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US")
}

/** Cost with enough digits for sub-cent calls. Null is "unknown", never $0. */
export function formatCost(usd: number | null): string {
  if (usd === null) return "—"
  return usd.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: usd < 1 ? 4 : 2 })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" })
}

/** What to print for a call or group whose model is not known. Chat Wonder reports its model only
 * with its usage; a call without that report is an estimate. The wording says why, so it reads as an
 * explained state and not as missing data. */
export const MODEL_NOT_REPORTED = "Not reported (estimated)"
export const MODEL_NOT_REPORTED_HINT =
  "Chat Wonder did not send its usage for this call, so the model and cost are unknown and the token counts are a character-count estimate. Calls that fail before replying, and Chat Wonder builds older than usage reporting, look like this."

/** Cost cell for a group of calls: a dash when none of them has a price (unknown, never $0.00), and the
 * priced total with a count of what it leaves out when only some do. */
export function formatGroupCost(costUsd: number, calls: number, unpricedCalls: number): string {
  if (calls > 0 && unpricedCalls >= calls) return "—"
  return unpricedCalls > 0 ? `${formatCost(costUsd)} + ${unpricedCalls} unpriced` : formatCost(costUsd)
}

/** ESTIMATED numbers are a local character count, not the provider's: they are marked so nobody
 * reads one as billing-accurate. */
export function SourceBadge({ source }: { source: LlmUsageRow["source"] }) {
  return source === "ESTIMATED" ? <Badge variant="outline">Estimated</Badge> : <Badge variant="secondary">Reported</Badge>
}

const tokens = (value: number, row: LlmUsageRow) => (
  <span className="tabular-nums">
    {row.source === "ESTIMATED" ? "~" : ""}
    {formatNumber(value)}
  </span>
)

export const columns: ColumnDef<LlmUsageRow>[] = [
  {
    accessorKey: "createdAt",
    header: "Time",
    enableSorting: false,
    cell: ({ row }) => <span className="whitespace-nowrap">{formatDateTime(row.original.createdAt)}</span>,
  },
  {
    id: "organization",
    header: "Organization",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.organizationName ?? (row.original.organizationId ? <span title={row.original.organizationId}>Deleted organization</span> : "—"),
  },
  {
    id: "user",
    header: "User",
    enableSorting: false,
    cell: ({ row }) => row.original.userName ?? (row.original.userId ? <span title={row.original.userId}>Deleted account</span> : "—"),
  },
  { accessorKey: "feature", header: "Feature", enableSorting: false },
  { accessorKey: "provider", header: "Provider", enableSorting: false },
  {
    id: "model",
    header: "Model",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.model ?? (
        <span className="text-muted-foreground" title={MODEL_NOT_REPORTED_HINT}>
          {MODEL_NOT_REPORTED}
        </span>
      ),
  },
  { id: "input", header: "Input", enableSorting: false, cell: ({ row }) => tokens(row.original.inputTokens, row.original) },
  {
    id: "cached",
    header: "Cached",
    enableSorting: false,
    cell: ({ row }) => (row.original.cachedInputTokens === null ? "—" : tokens(row.original.cachedInputTokens, row.original)),
  },
  { id: "output", header: "Output", enableSorting: false, cell: ({ row }) => tokens(row.original.outputTokens, row.original) },
  { id: "passes", header: "Passes", enableSorting: false, cell: ({ row }) => row.original.passCount ?? "—" },
  {
    id: "cost",
    header: "Cost",
    enableSorting: false,
    cell: ({ row }) => <span title={row.original.estimatedCostUsd === null ? "No verified price for this model" : undefined}>{formatCost(row.original.estimatedCostUsd)}</span>,
  },
  {
    id: "source",
    header: "Source",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="flex items-center gap-1.5">
        <SourceBadge source={row.original.source} />
        {!row.original.success && <Badge variant="destructive">Failed</Badge>}
      </span>
    ),
  },
]
