"use client"

import * as React from "react"

import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatMoney } from "@/components/billing/format"
import { type FeesGroupBy, type FeesSummaryFilters, type FeesSummaryRow, type Money, useFeesSummaryQuery } from "@/lib/client-requests/queries"

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_RANGE_DAYS = 30

const selectClass =
  "h-8 rounded-2xl border border-transparent bg-input/50 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10)
}

const gbp = (amountMinor: number): Money => ({ amountMinor, currency: "GBP" })

/** Fees and top-ups paid, less what was refunded. A refunded charge still counts as paid in the API. */
function netOf(row: Pick<FeesSummaryRow, "perCaseFees" | "topUps" | "refunds">): Money {
  return gbp(row.perCaseFees.amountMinor + row.topUps.amountMinor - row.refunds.amountMinor)
}

/** What the lawyers' firms paid the platform: per-case fees and AI top-ups, per firm or per lawyer. */
export function FeesSummary() {
  const [groupBy, setGroupBy] = React.useState<FeesGroupBy>("organization")
  const [from, setFrom] = React.useState(() => toDateInput(new Date(Date.now() - DEFAULT_RANGE_DAYS * DAY_MS)))
  const [to, setTo] = React.useState("")

  const filters = React.useMemo<FeesSummaryFilters>(() => ({ groupBy, from: from || undefined, to: to || undefined }), [groupBy, from, to])
  const rangeInvalid = !!from && !!to && from > to
  const query = useFeesSummaryQuery(filters, !rangeInvalid)
  const rows = query.data ?? []

  const totals = rows.reduce(
    (sum, row) => ({
      engagements: sum.engagements + row.engagements,
      perCaseFees: sum.perCaseFees + row.perCaseFees.amountMinor,
      topUps: sum.topUps + row.topUps.amountMinor,
      refunds: sum.refunds + row.refunds.amountMinor,
    }),
    { engagements: 0, perCaseFees: 0, topUps: 0, refunds: 0 },
  )

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs">
          Group by
          <select className={selectClass} value={groupBy} onChange={(e) => setGroupBy(e.target.value as FeesGroupBy)}>
            <option value="organization">Firm</option>
            <option value="lawyer">Lawyer</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          From
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          To (included)
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </label>
      </div>

      {rangeInvalid && <p className="text-destructive text-sm">The start date is after the end date.</p>}
      {query.isError && <p className="text-destructive text-sm">{(query.error as Error).message}</p>}
      {query.isLoading && <p className="text-muted-foreground text-sm">Loading fees…</p>}

      {query.data && (
        <div className="min-w-0 overflow-x-auto">
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{groupBy === "organization" ? "Firm" : "Lawyer"}</TableHead>
                  <TableHead className="text-right">Engagements</TableHead>
                  <TableHead className="text-right">Per-case fees</TableHead>
                  <TableHead className="text-right">AI top-ups</TableHead>
                  <TableHead className="text-right">Refunded</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No fees were paid in this range.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.engagements}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(row.perCaseFees)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(row.topUps)}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.refunds.amountMinor > 0 ? `−${formatMoney(row.refunds)}` : "—"}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatMoney(netOf(row))}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {rows.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right tabular-nums">{totals.engagements}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(gbp(totals.perCaseFees))}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(gbp(totals.topUps))}</TableCell>
                    <TableCell className="text-right tabular-nums">{totals.refunds > 0 ? `−${formatMoney(gbp(totals.refunds))}` : "—"}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatMoney(netOf({ perCaseFees: gbp(totals.perCaseFees), topUps: gbp(totals.topUps), refunds: gbp(totals.refunds) }))}</TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
