"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { AlertTriangle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { formatDateTime, formatMoney } from "@/components/billing/format"
import {
  CHARGE_KIND_LABELS,
  CHARGE_STATUS_LABELS,
  OUTCOME_LABELS,
  PRACTICE_AREA_LABELS,
  REQUEST_STATUS_LABELS,
  formatAge,
  latestClaim,
} from "@/components/client-requests/format"
import type { AdminCharge, AdminClientRequest } from "@/lib/client-requests/queries"

function StatusCell({ request }: { request: AdminClientRequest }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <Badge variant="outline">{REQUEST_STATUS_LABELS[request.status]}</Badge>
      {request.unclaimedOver48h && (
        <Badge variant="destructive">
          <AlertTriangle data-icon="inline-start" />
          Unclaimed 48h+
        </Badge>
      )}
    </div>
  )
}

function LawyerCell({ request }: { request: AdminClientRequest }) {
  const claim = latestClaim(request.claims)
  if (!claim) {
    return (
      <span className="text-muted-foreground text-xs">
        {request.status === "ROUTED" ? `Matched to ${request.matchedLawyers} ${request.matchedLawyers === 1 ? "lawyer" : "lawyers"}` : "Never claimed"}
      </span>
    )
  }
  return (
    <div className="flex flex-col">
      <span>{claim.lawyerName}</span>
      <span className="text-muted-foreground text-xs">{claim.organizationName}</span>
      {claim.outcome && <span className="text-muted-foreground text-xs">{OUTCOME_LABELS[claim.outcome]}</span>}
    </div>
  )
}

function QuoteCell({ request }: { request: AdminClientRequest }) {
  const quote = latestClaim(request.claims)?.quote
  if (!quote) return <span className="text-muted-foreground text-xs">—</span>
  return (
    <div className="flex flex-col">
      <span className="tabular-nums">{quote.amount.amountMinor === 0 ? "Free" : formatMoney(quote.amount)}</span>
      <span className="text-muted-foreground text-xs">{quote.type === "FIXED_FEE" ? "Fixed fee" : "First consultation"}</span>
    </div>
  )
}

export function ChargeSummary({ charge }: { charge: AdminCharge }) {
  const refunded = charge.refunded.amountMinor > 0
  return (
    <div className="flex flex-col">
      <span className="whitespace-nowrap tabular-nums">
        {CHARGE_KIND_LABELS[charge.kind]} · {formatMoney(charge.amount)}
      </span>
      <span className="text-muted-foreground text-xs">
        {CHARGE_STATUS_LABELS[charge.status]}
        {refunded ? ` · ${formatMoney(charge.refunded)} back` : ""}
        {charge.provider === "DUMMY" ? " · test card" : ""}
      </span>
    </div>
  )
}

/** The requests queue. `renderChargeActions` adds the per-charge actions (refund) under each charge. */
export function clientRequestColumns({
  renderChargeActions,
}: { renderChargeActions?: (charge: AdminCharge) => React.ReactNode } = {}): ColumnDef<AdminClientRequest>[] {
  return [
    {
      accessorKey: "createdAt",
      header: "Requested",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="whitespace-nowrap">{formatDateTime(row.original.createdAt)}</span>
          <span className={row.original.unclaimedOver48h ? "text-destructive text-xs font-medium" : "text-muted-foreground text-xs"}>
            {formatAge(row.original.ageHours)} old
          </span>
        </div>
      ),
    },
    {
      id: "case",
      header: "Case",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span>{PRACTICE_AREA_LABELS[row.original.practiceArea] ?? row.original.practiceArea}</span>
          <span className="text-muted-foreground text-xs">{row.original.ukJurisdiction}</span>
        </div>
      ),
    },
    { id: "status", header: "Status", enableSorting: false, cell: ({ row }) => <StatusCell request={row.original} /> },
    { id: "lawyer", header: "Lawyer", enableSorting: false, cell: ({ row }) => <LawyerCell request={row.original} /> },
    { id: "quote", header: "Quote", enableSorting: false, cell: ({ row }) => <QuoteCell request={row.original} /> },
    {
      id: "charges",
      header: "Charges",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.charges.length === 0 ? (
          <span className="text-muted-foreground text-xs">—</span>
        ) : (
          <div className="flex flex-col gap-2">
            {row.original.charges.map((charge) => (
              <div key={charge.id} className="flex items-center justify-between gap-3">
                <ChargeSummary charge={charge} />
                {renderChargeActions?.(charge)}
              </div>
            ))}
          </div>
        ),
    },
  ]
}
