"use client"

import * as React from "react"
import type { OnChangeFn, SortingState } from "@tanstack/react-table"

import { DataTable } from "@/components/data-table"
import { clientRequestColumns } from "@/components/client-requests/columns"
import { FeesSummary } from "@/components/client-requests/fees-summary"
import { REQUEST_STATUS_LABELS } from "@/components/client-requests/format"
import {
  CLIENT_REQUEST_STATUSES,
  type ClientRequestFilters,
  type ClientRequestStatus,
  useClientRequestsQuery,
} from "@/lib/client-requests/queries"

const PAGE_SIZE = 25
const NO_SORTING: SortingState = []

const VIEWS = [
  { id: "requests", label: "Requests" },
  { id: "fees", label: "Fees by firm or lawyer" },
] as const

const selectClass =
  "h-8 rounded-2xl border border-transparent bg-input/50 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

function RequestsQueue() {
  const [status, setStatus] = React.useState<ClientRequestStatus | "">("")
  const [unclaimedOnly, setUnclaimedOnly] = React.useState(false)
  // The page a user picked, remembered with the filters it was picked under: changing a filter
  // drops back to page 1 without an effect.
  const [picked, setPicked] = React.useState({ key: "", page: 1 })

  const filters = React.useMemo<ClientRequestFilters>(
    () => ({ status: status || undefined, unclaimedOver48h: unclaimedOnly || undefined }),
    [status, unclaimedOnly],
  )
  const filtersKey = JSON.stringify(filters)
  const page = picked.key === filtersKey ? picked.page : 1
  const setPage = (next: number) => setPicked({ key: filtersKey, page: next })

  const list = useClientRequestsQuery(filters, page, PAGE_SIZE)
  const handleSortingChange: OnChangeFn<SortingState> = () => {}
  const columns = React.useMemo(() => clientRequestColumns(), [])

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs">
          Status
          <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value as ClientRequestStatus | "")}>
            <option value="">All</option>
            {CLIENT_REQUEST_STATUSES.map((s) => (
              <option key={s} value={s}>
                {REQUEST_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex h-8 items-center gap-2 text-sm">
          <input type="checkbox" checked={unclaimedOnly} onChange={(e) => setUnclaimedOnly(e.target.checked)} className="size-4 accent-foreground" />
          Unclaimed for over 48h
        </label>
      </div>

      {list.isError && <p className="text-destructive text-sm">{(list.error as Error).message}</p>}
      {list.isLoading && <p className="text-muted-foreground text-sm">Loading requests…</p>}
      {list.data && (
        <div className="min-w-0 overflow-x-auto">
          <DataTable
            columns={columns}
            data={list.data.data}
            itemLabel="request"
            total={list.data.total}
            isFetching={list.isFetching}
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

export default function ClientRequestsPage() {
  const [view, setView] = React.useState<(typeof VIEWS)[number]["id"]>("requests")

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Client requests</h1>
        <p className="text-muted-foreground text-sm">
          UK clients asking for a lawyer: who has each request, what they quoted and what the firm was charged. Newest first.
        </p>
      </div>

      <div role="tablist" aria-label="Client requests views" className="flex w-fit gap-1 rounded-2xl bg-muted p-1">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            id={`client-requests-tab-${v.id}`}
            aria-selected={view === v.id}
            aria-controls={`client-requests-panel-${v.id}`}
            onClick={() => setView(v.id)}
            className={`h-8 cursor-pointer rounded-xl px-3 text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/30 ${
              view === v.id ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`client-requests-panel-${view}`} aria-labelledby={`client-requests-tab-${view}`}>
        {view === "fees" ? <FeesSummary /> : <RequestsQueue />}
      </div>
    </div>
  )
}
