"use client"

import * as React from "react"
import type { OnChangeFn, SortingState } from "@tanstack/react-table"
import { X } from "lucide-react"

import { DataTable } from "@/components/data-table"
import { billingColumns } from "@/components/billing/columns"
import { KIND_LABELS, PROVIDER_LABELS } from "@/components/billing/format"
import { DayTable, NetCard, SplitCard } from "@/components/billing/summary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  type BillingFilters,
  type PaymentKind,
  type PaymentProvider,
  type PaymentStatus,
  useBillingListQuery,
  useBillingSummaryQuery,
} from "@/lib/billing/queries"

const PAGE_SIZE = 25
const DEBOUNCE_MS = 400
const DEFAULT_RANGE_DAYS = 30
const NO_SORTING: SortingState = []

const DAY_MS = 24 * 60 * 60 * 1000

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Midnight UTC on the 1st of this month: the "This month" card's start. */
function startOfMonthUtc(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

function useDebounced<T>(value: T): T {
  const [debounced, setDebounced] = React.useState(value)
  React.useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [value])
  return debounced
}

const selectClass =
  "h-8 rounded-2xl border border-transparent bg-input/50 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

export default function BillingPage() {
  const [from, setFrom] = React.useState(() => toDateInput(new Date(Date.now() - DEFAULT_RANGE_DAYS * DAY_MS)))
  const [to, setTo] = React.useState("")
  const [status, setStatus] = React.useState<PaymentStatus | "">("")
  const [kind, setKind] = React.useState<PaymentKind | "">("")
  const [provider, setProvider] = React.useState<PaymentProvider | "">("")
  const [search, setSearch] = React.useState("")
  const [caseFilter, setCaseFilter] = React.useState<{ id: string; title: string } | null>(null)
  // The page a user picked, remembered with the filters it was picked under: changing a filter
  // drops back to page 1 without an effect.
  const [picked, setPicked] = React.useState({ key: "", page: 1 })

  const debouncedSearch = useDebounced(search.trim())

  // `to` is exclusive in the API, so the picked day is included by sending the day after it.
  const filters = React.useMemo<BillingFilters>(
    () => ({
      from: from ? `${from}T00:00:00.000Z` : undefined,
      to: to ? new Date(new Date(`${to}T00:00:00.000Z`).getTime() + DAY_MS).toISOString() : undefined,
      status: status || undefined,
      kind: kind || undefined,
      provider: provider || undefined,
      caseId: caseFilter?.id,
      q: debouncedSearch || undefined,
    }),
    [from, to, status, kind, provider, caseFilter, debouncedSearch],
  )

  const filtersKey = JSON.stringify(filters)
  const page = picked.key === filtersKey ? picked.page : 1
  const setPage = (next: number) => setPicked({ key: filtersKey, page: next })

  const summary = useBillingSummaryQuery(filters)
  // The same filters over this calendar month, whatever range is picked.
  const month = useBillingSummaryQuery({ ...filters, from: startOfMonthUtc(), to: undefined })
  const list = useBillingListQuery(filters, page, PAGE_SIZE)
  const handleSortingChange: OnChangeFn<SortingState> = () => {}
  const columns = React.useMemo(() => billingColumns({ onFilterCase: setCaseFilter }), [])

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-muted-foreground text-sm">
          What clients pay in the client app: chat credit top-ups (cases are free; older case fees still show here). Lawyers&apos; per-case fees aren&apos;t here.{" "}
          <Badge variant="outline">Dummy</Badge> payments are test money from before Stripe: no money changed hands, so pick
          Provider = Stripe to see real revenue.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs">
          From
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          To (included)
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Status
          <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus | "")}>
            <option value="">All</option>
            <option value="SUCCEEDED">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Kind
          <select className={selectClass} value={kind} onChange={(e) => setKind(e.target.value as PaymentKind | "")}>
            <option value="">All</option>
            {(Object.keys(KIND_LABELS) as PaymentKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Provider
          <select className={selectClass} value={provider} onChange={(e) => setProvider(e.target.value as PaymentProvider | "")}>
            <option value="">All</option>
            {(Object.keys(PROVIDER_LABELS) as PaymentProvider[]).map((p) => (
              <option key={p} value={p}>
                {PROVIDER_LABELS[p]}
              </option>
            ))}
          </select>
        </label>
        {caseFilter && (
          <div className="flex flex-col gap-1 text-xs">
            Case
            <Button variant="secondary" size="sm" className="h-8" onClick={() => setCaseFilter(null)} title="Show every case">
              {caseFilter.title}
              <X />
            </Button>
          </div>
        )}
      </div>

      {summary.isError && <p className="text-destructive text-sm">{(summary.error as Error).message}</p>}
      {summary.isLoading && <p className="text-muted-foreground text-sm">Loading billing…</p>}

      {summary.data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <NetCard title="Revenue in range (net of refunds)" totals={summary.data.totals} counts={summary.data.counts} />
            <NetCard title="This month (net)" totals={month.data?.totals ?? []} counts={month.data?.counts} />
            <SplitCard title="Case fees vs top-ups" groups={summary.data.byKind} labels={KIND_LABELS} />
            <SplitCard title="Stripe vs dummy" groups={summary.data.byProvider} labels={PROVIDER_LABELS} />
          </div>
          <DayTable days={summary.data.byDay} />
        </>
      )}

      <h2 className="text-lg font-semibold tracking-tight">Payments</h2>
      {list.isError && <p className="text-destructive text-sm">{(list.error as Error).message}</p>}
      {list.data && (
        <div className="min-w-0 overflow-x-auto">
          <DataTable
            columns={columns}
            data={list.data.rows}
            searchPlaceholder="Search clients by name or email…"
            itemLabel="payment"
            total={list.data.total}
            isFetching={list.isFetching}
            search={search}
            onSearchChange={setSearch}
            sorting={NO_SORTING}
            onSortingChange={handleSortingChange}
            page={list.data.page}
            pageCount={list.data.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  )
}
