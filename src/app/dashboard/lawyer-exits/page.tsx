"use client"

import * as React from "react"

import { ListPagination } from "@/components/list-pagination"
import { LawyerExitDecideDialog } from "@/components/billing/lawyer-exit-decide-dialog"
import { DECIDABLE_EXIT_STATUSES, EXIT_REASON_LABELS, EXIT_STATUS_LABELS } from "@/components/billing/lawyer-exit-labels"
import { formatDateTime, formatMoney } from "@/components/billing/format"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LAWYER_EXITS_PAGE_SIZE, type LawyerExitFilter, useLawyerExitsQuery } from "@/lib/billing/lawyer-exits"

const FILTERS: { value: LawyerExitFilter; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "AWAITING_REVIEW", label: "Waiting on a decision" },
  { value: "NEEDS_ATTENTION", label: "Refund failed" },
  { value: "ALL", label: "All" },
]

/**
 * Lawyer Exits (FORHU/ilovelawyer-app#972): lawyers who stopped acting after the client paid. Nothing
 * is refunded automatically: an admin decides here how much goes back, from the lawyer's reason and
 * any work claimed, and retries a refund that failed. The lawyer's notes may name the other party: they're shown
 * here only, never in the audit log.
 */
export default function LawyerExitsPage() {
  const [filter, setFilter] = React.useState<LawyerExitFilter>("OPEN")
  const [page, setPage] = React.useState(1)
  const { data, isLoading, isError, error } = useLawyerExitsQuery(filter, page)
  const rows = isError ? [] : (data?.data ?? [])
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / LAWYER_EXITS_PAGE_SIZE))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lawyer exits</h1>
        <p className="text-muted-foreground text-sm">
          Lawyers who couldn&apos;t continue after the client paid. Nothing is refunded until you decide: read the lawyer&apos;s reason and any work they claim, then
          choose how much the client gets back. A disputed payment waits for the client&apos;s bank.
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Exits</CardTitle>
          <Tabs
            value={filter}
            onValueChange={(value) => {
              setFilter(value as LawyerExitFilter)
              setPage(1)
            }}
          >
            <TabsList>
              {FILTERS.map((f) => (
                <TabsTrigger key={f.value} value={f.value}>
                  {f.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {isLoading && <p className="text-muted-foreground text-sm">Loading exits…</p>}
          {isError && <p className="text-destructive text-sm">{(error as Error).message}</p>}
          {data && !isError && rows.length === 0 && <p className="text-muted-foreground text-sm">{filter === "OPEN" ? "Nothing waiting. Every exit is settled." : "No exits here."}</p>}
          {rows.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Closed</TableHead>
                    <TableHead>Lawyer</TableHead>
                    <TableHead>Why</TableHead>
                    <TableHead>Work claimed</TableHead>
                    <TableHead className="text-right">Client paid</TableHead>
                    <TableHead className="text-right">Refunded</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((e) => (
                    <TableRow key={e.id} className="align-top">
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{formatDateTime(e.createdAt)}</span>
                          <span className="text-muted-foreground text-xs">{e.caseName ?? "Deleted case"}</span>
                          <span className="text-muted-foreground font-mono text-xs">{e.requestId.slice(0, 8)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{e.lawyer.name ?? "Deleted account"}</span>
                          {e.lawyer.firmName && <span className="text-muted-foreground text-xs">{e.lawyer.firmName}</span>}
                          <span className="text-muted-foreground text-xs">Client: {e.client.name ?? "Deleted account"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="flex flex-col gap-1">
                          <span>{EXIT_REASON_LABELS[e.reason]}</span>
                          {e.note && <span className="text-muted-foreground text-xs break-words whitespace-normal">{e.note}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {e.workDone && e.claimed ? (
                          <div className="flex flex-col gap-1">
                            <span className="tabular-nums">{formatMoney(e.claimed)}</span>
                            {e.claimNote && <span className="text-muted-foreground text-xs break-words whitespace-normal">{e.claimNote}</span>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {e.payment ? (
                          <div className="flex flex-col items-end">
                            <span>{formatMoney(e.payment.amount)}</span>
                            <span className="text-muted-foreground text-xs">lawyer {formatMoney(e.payment.serviceFee)}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Nothing paid</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{e.refunded.amountMinor ? formatMoney(e.refunded) : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={e.status === "SETTLED" ? "default" : "outline"} className={e.status === "NEEDS_ATTENTION" ? "text-destructive" : undefined}>
                          {EXIT_STATUS_LABELS[e.status]}
                        </Badge>
                        {e.failureReason && <p className="text-destructive mt-1 text-xs">{e.failureReason}</p>}
                        {e.decision?.note && <p className="text-muted-foreground mt-1 text-xs">Decision: {e.decision.note}</p>}
                      </TableCell>
                      <TableCell className="text-right">{DECIDABLE_EXIT_STATUSES.includes(e.status) && <LawyerExitDecideDialog exit={e} />}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {data && data.total > LAWYER_EXITS_PAGE_SIZE && <ListPagination total={data.total} itemLabel="exit" page={page} pageCount={pageCount} onPageChange={setPage} />}
        </CardContent>
      </Card>
    </div>
  )
}
