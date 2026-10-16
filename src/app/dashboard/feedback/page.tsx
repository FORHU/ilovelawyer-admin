"use client"

import * as React from "react"
import type { OnChangeFn, SortingState } from "@tanstack/react-table"

import { makeColumns } from "@/components/feedback/columns"
import { DataTable } from "@/components/data-table"
import { useFeedbackQuery, type FeedbackRating, type FeedbackSource } from "@/lib/feedback/queries"
import type { SortDir } from "@/lib/users/queries"

const PAGE_SIZE = 25
const SEARCH_DEBOUNCE_MS = 400

const SELECT_CLASS = "border-input bg-background h-8 rounded-md border px-2 text-sm"

export default function FeedbackPage() {
  const [page, setPage] = React.useState(1)
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "createdAt", desc: true }])
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [source, setSource] = React.useState<FeedbackSource | "">("")
  const [rating, setRating] = React.useState<FeedbackRating | "">("")

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [search])

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    const next = typeof updater === "function" ? updater(sorting) : updater
    setSorting(next)
    setPage(1)
  }

  const sortDir: SortDir = sorting[0]?.desc === false ? "asc" : "desc"

  const { data, isLoading, isFetching, isError, error } = useFeedbackQuery({
    page,
    limit: PAGE_SIZE,
    sortDir,
    q: debouncedSearch || undefined,
    source: source || undefined,
    rating: rating || undefined,
  })

  const columns = React.useMemo(() => makeColumns(data?.resolved), [data?.resolved])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Feedback</h1>
        <p className="text-muted-foreground text-sm">
          What testers sent from inside the app, newest first. Search by the sender&apos;s email or name; comments are
          encrypted at rest, so they can be read here but not searched. Answer text is never stored, only which answer
          or pane it was about.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Filter by where it was sent from"
          className={SELECT_CLASS}
          value={source}
          onChange={(e) => {
            setSource(e.target.value as FeedbackSource | "")
            setPage(1)
          }}
        >
          <option value="">All sources</option>
          <option value="GENERAL">Feedback form</option>
          <option value="CHAT_ANSWER">Chat answers</option>
          <option value="TERMINAL_PANE">Terminal panes</option>
        </select>
        <select
          aria-label="Filter by rating"
          className={SELECT_CLASS}
          value={rating}
          onChange={(e) => {
            setRating(e.target.value as FeedbackRating | "")
            setPage(1)
          }}
        >
          <option value="">Any rating</option>
          <option value="UP">Helpful</option>
          <option value="DOWN">Not helpful</option>
        </select>
      </div>
      {isLoading && <p className="text-muted-foreground text-sm">Loading feedback…</p>}
      {isError && <p className="text-destructive text-sm">{(error as Error).message}</p>}
      {data && (
        <DataTable
          columns={columns}
          data={data.data}
          searchPlaceholder="Search by email or name…"
          itemLabel="item"
          total={data.total}
          isFetching={isFetching}
          search={search}
          onSearchChange={setSearch}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          page={data.page}
          pageCount={data.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
