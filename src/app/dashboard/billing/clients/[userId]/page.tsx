"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import type { OnChangeFn, SortingState } from "@tanstack/react-table"
import { ArrowLeft } from "lucide-react"

import { DataTable } from "@/components/data-table"
import { billingColumns } from "@/components/billing/columns"
import { formatDateTime } from "@/components/billing/format"
import { NetCard, StatCard, countsNote } from "@/components/billing/summary"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { type AdminClientPayment, useClientBillingQuery } from "@/lib/billing/queries"

const PAGE_SIZE = 25
const NO_SORTING: SortingState = []

/** One client's billing, all time: from the Billing table's client column or the Users page. */
export default function ClientBillingPage() {
  const { userId } = useParams<{ userId: string }>()
  const [page, setPage] = React.useState(1)
  const { data, isLoading, isError, error, isFetching } = useClientBillingQuery(userId, page, PAGE_SIZE)
  const handleSortingChange: OnChangeFn<SortingState> = () => {}
  const columns = React.useMemo(() => billingColumns({ showClient: false }), [])

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Link href="/dashboard/billing" className="text-muted-foreground flex w-fit items-center gap-1 text-sm hover:underline">
        <ArrowLeft className="size-3.5" />
        Billing
      </Link>

      {isError && <p className="text-destructive text-sm">{(error as Error).message}</p>}
      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {data && (
        <>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{data.user.name ?? data.user.email}</h1>
            <p className="text-muted-foreground text-sm">
              {data.user.name ? `${data.user.email} · ` : ""}joined {formatDateTime(data.user.createdAt)}. Every payment they&apos;ve made, all time.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <NetCard title="Paid, net of refunds" totals={data.totals} />
            <StatCard title="Payments" value={String(data.counts.SUCCEEDED + data.counts.PENDING + data.counts.FAILED)} note={countsNote(data.counts)} />
            <StatCard
              title="Cases"
              value={String(data.cases.length)}
              note={`${data.cases.reduce((n, c) => n + c.credits, 0)} chat credits left across them`}
            />
          </div>

          {data.cases.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Cases</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Case</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Credits left</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.cases.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.title}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDateTime(c.createdAt)}</TableCell>
                        <TableCell className="text-right tabular-nums">{c.credits}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <h2 className="text-lg font-semibold tracking-tight">Payments</h2>
          <div className="min-w-0 overflow-x-auto">
            <ClientPaymentsTable
              columns={columns}
              rows={data.payments.rows}
              total={data.payments.total}
              page={data.payments.page}
              pageCount={data.payments.totalPages}
              isFetching={isFetching}
              onPageChange={setPage}
              onSortingChange={handleSortingChange}
            />
          </div>
        </>
      )}
    </div>
  )
}

/** DataTable, with its search box filtering the page already loaded: one client rarely has more
 * payments than fit on it. */
function ClientPaymentsTable({
  columns,
  rows,
  ...rest
}: {
  columns: ReturnType<typeof billingColumns>
  rows: AdminClientPayment[]
  total: number
  page: number
  pageCount: number
  isFetching: boolean
  onPageChange: (page: number) => void
  onSortingChange: OnChangeFn<SortingState>
}) {
  const [search, setSearch] = React.useState("")
  const q = search.trim().toLowerCase()
  const visible = q ? rows.filter((r) => (r.case?.title ?? "").toLowerCase().includes(q)) : rows
  return (
    <DataTable
      columns={columns}
      data={visible}
      searchPlaceholder="Filter by case name…"
      itemLabel="payment"
      search={search}
      onSearchChange={setSearch}
      sorting={NO_SORTING}
      {...rest}
    />
  )
}
