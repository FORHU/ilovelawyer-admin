"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatMoney, formatMoneyList } from "@/components/billing/format"
import type { BillingSummary, BillingTotals, MoneyGroup, StatusCounts } from "@/lib/billing/queries"

export function StatCard({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">{note}</CardContent>
    </Card>
  )
}

/** "4 paid · 1 pending · 2 failed", leaving out the zeros. */
export function countsNote(counts: StatusCounts): string {
  const parts = [
    counts.SUCCEEDED && `${counts.SUCCEEDED} paid`,
    counts.PENDING && `${counts.PENDING} pending`,
    counts.FAILED && `${counts.FAILED} failed`,
  ].filter(Boolean)
  return parts.length ? parts.join(" · ") : "No payments"
}

/** Net revenue across currencies, with what was paid and refunded underneath. */
export function NetCard({ title, totals, counts }: { title: string; totals: BillingTotals[]; counts?: StatusCounts }) {
  const refunded = totals.some((t) => t.refunded.amountMinor > 0 || t.refundPending.amountMinor > 0)
  const note = refunded
    ? `${formatMoneyList(totals.map((t) => t.paid))} paid, ${formatMoneyList(totals.map((t) => t.refunded))} refunded` +
      (totals.some((t) => t.refundPending.amountMinor > 0) ? `, ${formatMoneyList(totals.map((t) => t.refundPending))} pending` : "")
    : counts
      ? countsNote(counts)
      : `${totals.reduce((n, t) => n + t.payments, 0)} payments`
  return <StatCard title={title} value={formatMoneyList(totals.map((t) => t.net))} note={note} />
}

/** Two sides of a split ("Case fees $40 · Top-ups $15") as one card. */
export function SplitCard({ title, groups, labels }: { title: string; groups: MoneyGroup[]; labels: Record<string, string> }) {
  const shown = Object.keys(labels)
    .map((key) => ({ key, rows: groups.filter((g) => g.key === key) }))
    .filter((s) => s.rows.length > 0)
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5 text-sm">
        {shown.length === 0 ? (
          <span className="text-muted-foreground">No payments</span>
        ) : (
          shown.map((s) => (
            <div key={s.key} className="flex items-baseline justify-between gap-3">
              <span>{labels[s.key]}</span>
              <span className="tabular-nums">
                {formatMoneyList(s.rows.map((r) => r.amount))}
                <span className="text-muted-foreground ml-1.5 text-xs">({s.rows.reduce((n, r) => n + r.payments, 0)})</span>
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

/** Paid per day as inline CSS bars, like the LLM Usage page's (no chart library is installed). Bars
 * compare days within one currency only. */
export function DayTable({ days }: { days: BillingSummary["byDay"] }) {
  const maxByCurrency = new Map<string, number>()
  for (const d of days) maxByCurrency.set(d.amount.currency, Math.max(maxByCurrency.get(d.amount.currency) ?? 1, d.amount.amountMinor))
  return (
    <Card>
      <CardHeader>
        <CardTitle>Per day</CardTitle>
        <CardDescription>Payments that went through, by day (UTC). Refunds aren&apos;t taken off here.</CardDescription>
      </CardHeader>
      <CardContent>
        {days.length === 0 ? (
          <p className="text-muted-foreground text-sm">No payments in this range.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead className="w-1/2">Paid</TableHead>
                <TableHead className="text-right">Payments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {days.map((d) => (
                <TableRow key={`${d.day}-${d.amount.currency}`}>
                  <TableCell className="whitespace-nowrap">{d.day}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-3 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="bg-primary h-full" style={{ width: `${(d.amount.amountMinor / maxByCurrency.get(d.amount.currency)!) * 100}%` }} />
                      </div>
                      <span className="w-24 text-right text-xs tabular-nums">{formatMoney(d.amount)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{d.payments}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
