"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"

import { SimpleSelect } from "@/components/support/simple-select"
import { formatAge, OverdueBadge, StatusBadge, useFlowTitle, whenOf, STATUS_LABEL } from "@/components/support/ticket-status"
import { ListPagination } from "@/components/list-pagination"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { useSupportTicketsQuery } from "@/lib/support/queries"
import type { SupportTicketStatus } from "@/lib/support/types"

const DEBOUNCE_MS = 400
const ALL = "ALL"

const STATUS_ITEMS = [{ value: ALL, label: "Every status" }, ...(Object.keys(STATUS_LABEL) as SupportTicketStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] }))]
const SORT_ITEMS = [
  { value: "updated", label: "Latest message first" },
  { value: "age", label: "Oldest first" },
]

function useDebounced<T>(value: T): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [value])
  return debounced
}

/**
 * Every message clients have sent the team, one row per conversation. An Open ticket whose client
 * wrote more than a day ago is marked Overdue and tinted, since the chat promised a reply by then.
 * Sort by oldest to work through the longest waiting first. The list refreshes itself every 30 seconds.
 */
export function TicketsPage() {
  const [status, setStatus] = useState<string>(ALL)
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<"updated" | "age">("updated")
  const [page, setPage] = useState(1)
  const q = useDebounced(search)
  const flowTitle = useFlowTitle()

  const { data, isLoading, isError, error, isPlaceholderData } = useSupportTicketsQuery({
    status: status === ALL ? undefined : (status as SupportTicketStatus),
    q,
    sort,
    page,
  })
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const overdueCount = data?.data.filter((t) => t.overdue).length ?? 0

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground max-w-3xl text-sm">
        Messages clients and visitors sent the team after the chat couldn&apos;t help. Replying emails them, and shows live to a signed-in client who is online.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" aria-hidden />
          <Input
            aria-label="Search tickets by email"
            type="search"
            placeholder="Search by email"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <div className="w-44">
          <SimpleSelect
            value={status}
            label="Filter by status"
            items={STATUS_ITEMS}
            onChange={(next) => {
              setStatus(next)
              setPage(1)
            }}
          />
        </div>
        <div className="w-48">
          <SimpleSelect
            value={sort}
            label="Sort tickets"
            items={SORT_ITEMS}
            onChange={(next) => {
              setSort(next as "updated" | "age")
              setPage(1)
            }}
          />
        </div>
        {overdueCount > 0 && (
          <span className="text-destructive ml-auto text-sm" role="status">
            {overdueCount} overdue on this page
          </span>
        )}
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
      {isError && <p className="text-destructive text-sm">{(error as Error).message}</p>}
      {data && (
        <>
          <div className={cn("rounded-2xl border transition-opacity", isPlaceholderData && "opacity-60")} aria-busy={isPlaceholderData}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>First message</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-40">Topic</TableHead>
                  <TableHead className="w-16">Age</TableHead>
                  <TableHead className="w-44">Last message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground h-24 text-center">
                      {q || status !== ALL ? "No tickets match." : "No tickets yet."}
                    </TableCell>
                  </TableRow>
                )}
                {data.data.map((ticket) => (
                  <TableRow key={ticket.id} className={cn(ticket.overdue && "bg-destructive/5 hover:bg-destructive/10")}>
                    <TableCell className="max-w-56">
                      <Link href={`/dashboard/support/tickets/${ticket.id}`} className="block truncate font-medium underline-offset-2 hover:underline">
                        {ticket.name ?? ticket.email}
                      </Link>
                      <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                        <span className="truncate">{ticket.name ? ticket.email : ""}</span>
                        {ticket.source === "SIGNED_OUT" && <Badge variant="outline">Signed out</Badge>}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-96">
                      <p className="line-clamp-2 text-sm whitespace-normal" title={ticket.firstMessage}>
                        {ticket.firstMessage}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={ticket.status} />
                        {ticket.overdue && <OverdueBadge />}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{ticket.flowId ? flowTitle(ticket.flowId) : <span className="text-muted-foreground">None</span>}</TableCell>
                    <TableCell className="tabular-nums">{formatAge(ticket.ageHours)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{whenOf(ticket.lastMessageAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ListPagination total={data.total} itemLabel="ticket" page={data.page} pageCount={pageCount} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
