"use client"

import * as React from "react"
import type { OnChangeFn, SortingState } from "@tanstack/react-table"

import { DataTable } from "@/components/data-table"
import { columns, formatCost, formatGroupCost, formatNumber, MODEL_NOT_REPORTED, MODEL_NOT_REPORTED_HINT } from "@/components/llm-usage/columns"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  type LlmProvider,
  type LlmUsageFilters,
  type LlmUsageSource,
  type UsageBreakdownRow,
  type UsageDayRow,
  NO_PERSON,
  useLlmUsageListQuery,
  useLlmUsagePeopleQuery,
  useLlmUsageSummaryQuery,
} from "@/lib/llm-usage/queries"

const PAGE_SIZE = 25
const DEBOUNCE_MS = 400
const DEFAULT_RANGE_DAYS = 30
const NO_SORTING: SortingState = []

const DAY_MS = 24 * 60 * 60 * 1000

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10)
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

/** "Estimated" share of a number, so nobody reads a local character count as billing-accurate. */
function estimatedShare(estimated: number, total: number): string {
  if (total === 0) return "none estimated"
  return `${Math.round((estimated / total) * 100)}% estimated`
}

function StatCard({ title, value, note }: { title: string; value: string; note: string }) {
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

function BreakdownTable({
  title,
  keyLabel,
  rows,
  labelFor,
  hintFor,
}: {
  title: string
  keyLabel: string
  rows: UsageBreakdownRow[]
  labelFor?: (row: UsageBreakdownRow) => string
  hintFor?: (row: UsageBreakdownRow) => string | undefined
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No calls in this range.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{keyLabel}</TableHead>
                <TableHead className="text-right">Calls</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Estimated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key ?? "__none__"}>
                  <TableCell title={hintFor?.(row) ?? row.key ?? undefined}>{labelFor ? labelFor(row) : (row.key ?? "Not recorded")}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(row.calls)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(row.tokens)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatGroupCost(row.costUsd, row.calls, row.unpricedCalls)}</TableCell>
                  <TableCell className="text-muted-foreground text-right text-xs">{estimatedShare(row.estimated.tokens, row.tokens)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

/** Per-day tokens as inline CSS bars: estimated part hatched lighter, reported part solid. No chart
 * library is installed and the page does not need one. */
function DayTable({ days }: { days: UsageDayRow[] }) {
  const max = Math.max(1, ...days.map((d) => d.tokens))
  return (
    <Card>
      <CardHeader>
        <CardTitle>Per day</CardTitle>
        <CardDescription>Days (UTC) with at least one call. Light = estimated, dark = reported.</CardDescription>
      </CardHeader>
      <CardContent>
        {days.length === 0 ? (
          <p className="text-muted-foreground text-sm">No calls in this range.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead className="w-1/2">Tokens</TableHead>
                <TableHead className="text-right">Calls</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {days.map((d) => (
                <TableRow key={d.day}>
                  <TableCell className="whitespace-nowrap">{d.day}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-3 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="bg-primary h-full" style={{ width: `${(d.reportedTokens / max) * 100}%` }} />
                        <div className="bg-primary/35 h-full" style={{ width: `${(d.estimatedTokens / max) * 100}%` }} />
                      </div>
                      <span className="w-20 text-right text-xs tabular-nums">{formatNumber(d.tokens)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(d.calls)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCost(d.costUsd)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

export default function LlmUsagePage() {
  const [from, setFrom] = React.useState(() => toDateInput(new Date(Date.now() - DEFAULT_RANGE_DAYS * DAY_MS)))
  const [to, setTo] = React.useState("")
  const [provider, setProvider] = React.useState<LlmProvider | "">("")
  const [source, setSource] = React.useState<LlmUsageSource | "">("")
  const [model, setModel] = React.useState("")
  const [organizationId, setOrganizationId] = React.useState("")
  const [userId, setUserId] = React.useState("")
  const [feature, setFeature] = React.useState("")
  // The page a user picked, remembered with the filters it was picked under: changing a filter
  // drops back to page 1 without an effect.
  const [picked, setPicked] = React.useState({ key: "", page: 1 })

  const debouncedModel = useDebounced(model.trim())
  const debouncedFeature = useDebounced(feature.trim())

  // `to` is exclusive in the API, so the picked day is included by sending the day after it.
  const filters = React.useMemo<LlmUsageFilters>(
    () => ({
      from: from ? `${from}T00:00:00.000Z` : undefined,
      to: to ? new Date(new Date(`${to}T00:00:00.000Z`).getTime() + DAY_MS).toISOString() : undefined,
      provider: provider || undefined,
      source: source || undefined,
      model: debouncedModel || undefined,
      organizationId: organizationId || undefined,
      userId: userId || undefined,
      feature: debouncedFeature || undefined,
    }),
    [from, to, provider, source, debouncedModel, organizationId, userId, debouncedFeature],
  )

  const filtersKey = JSON.stringify(filters)
  const page = picked.key === filtersKey ? picked.page : 1
  const setPage = (next: number) => setPicked({ key: filtersKey, page: next })

  const people = useLlmUsagePeopleQuery({ from: filters.from, to: filters.to, userId: filters.userId, organizationId: filters.organizationId })
  const summary = useLlmUsageSummaryQuery(filters)
  const list = useLlmUsageListQuery(filters, page, PAGE_SIZE)
  const handleSortingChange: OnChangeFn<SortingState> = () => {}

  const totals = summary.data?.totals

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">LLM Usage</h1>
        <p className="text-muted-foreground text-sm">
          Every call to an LLM provider. <Badge variant="outline">Estimated</Badge> numbers are a local character count
          (Chat Wonder, until it reports its own usage), not the provider&apos;s. A dash for cost means the model has no
          verified price yet, not that the call was free.
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
          Provider
          <select className={selectClass} value={provider} onChange={(e) => setProvider(e.target.value as LlmProvider | "")}>
            <option value="">All</option>
            <option value="OPENAI">OpenAI</option>
            <option value="TYPESAFE">TypeSafe</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Source
          <select className={selectClass} value={source} onChange={(e) => setSource(e.target.value as LlmUsageSource | "")}>
            <option value="">All</option>
            <option value="ESTIMATED">Estimated</option>
            <option value="REPORTED">Reported</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Model
          <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Exact name" className="w-44" />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          User
          <select className={`${selectClass} w-56`} value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">All users</option>
            {people.data?.hasNoUser && <option value={NO_PERSON}>No user recorded</option>}
            {people.data?.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email && u.label !== u.email ? `${u.label} (${u.email})` : u.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Organization
          <select className={`${selectClass} w-56`} value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
            <option value="">All organizations</option>
            {people.data?.hasNoOrganization && <option value={NO_PERSON}>No organization recorded</option>}
            {people.data?.organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {summary.isError && <p className="text-destructive text-sm">{(summary.error as Error).message}</p>}
      {summary.isLoading && <p className="text-muted-foreground text-sm">Loading usage…</p>}

      {totals && summary.data && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard title="Tokens" value={formatNumber(totals.tokens)} note={estimatedShare(totals.estimated.tokens, totals.tokens)} />
            <StatCard
              title="Cost (priced calls only)"
              value={formatCost(totals.costUsd)}
              note={
                totals.unpricedCalls > 0
                  ? `${formatNumber(totals.unpricedCalls)} of ${formatNumber(totals.calls)} calls have no verified price and are not counted`
                  : estimatedShare(totals.estimated.costUsd, totals.costUsd)
              }
            />
            <StatCard title="Calls" value={formatNumber(totals.calls)} note={estimatedShare(totals.estimated.calls, totals.calls)} />
          </div>

          <DayTable days={summary.data.byDay} />

          <div className="grid gap-4 xl:grid-cols-2">
            <BreakdownTable title="By provider" keyLabel="Provider" rows={summary.data.byProvider} />
            <BreakdownTable title="By model" keyLabel="Model" rows={summary.data.byModel} labelFor={(r) => r.key ?? MODEL_NOT_REPORTED} hintFor={(r) => (r.key === null ? MODEL_NOT_REPORTED_HINT : undefined)} />
            <BreakdownTable title="By feature" keyLabel="Feature" rows={summary.data.byFeature} />
            <BreakdownTable
              title="Top organizations"
              keyLabel="Organization"
              rows={summary.data.topOrganizations}
              labelFor={(r) => r.name ?? "Deleted organization"}
            />
            <BreakdownTable title="Top users" keyLabel="User" rows={summary.data.topUsers} labelFor={(r) => r.name ?? "Deleted account"} />
          </div>
        </>
      )}

      <h2 className="text-lg font-semibold tracking-tight">Calls</h2>
      {list.isError && <p className="text-destructive text-sm">{(list.error as Error).message}</p>}
      {/* The calls table is wider than a laptop screen. As its own scroller it scrolls sideways
          instead of stretching the whole page past the viewport. */}
      {list.data && (
        <div className="min-w-0 overflow-x-auto">
        <DataTable
          columns={columns}
          data={list.data.rows}
          searchPlaceholder="Filter by feature (exact name)…"
          itemLabel="call"
          total={list.data.total}
          isFetching={list.isFetching}
          search={feature}
          onSearchChange={setFeature}
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
