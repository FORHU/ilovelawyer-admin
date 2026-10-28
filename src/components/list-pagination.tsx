"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"

export const PAGE_SIZE = 15

/**
 * Pages through a list the API sends whole (practice areas, client case types). The page is clamped
 * to what exists, so deleting the last row of the last page shows the one before. `pageOf` is the
 * page an index lands on, for following a row moved across a page edge.
 */
export function usePagination<T>(items: T[] | undefined, pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1)
  const total = items?.length ?? 0
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(page, pageCount)
  const start = (current - 1) * pageSize
  return {
    page: current,
    pageCount,
    total,
    start,
    rows: items?.slice(start, start + pageSize) ?? [],
    setPage,
    pageOf: (index: number) => Math.floor(index / pageSize) + 1,
  }
}

/** The footer under a paged table, as on the DataTable lists. */
export function ListPagination({
  total,
  itemLabel,
  page,
  pageCount,
  onPageChange,
}: {
  total: number
  itemLabel: string
  page: number
  pageCount: number
  onPageChange: (page: number) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-muted-foreground text-sm">
        {total} {itemLabel}
        {total === 1 ? "" : "s"}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">
          Page {page} of {pageCount}
        </span>
        <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount}>
          Next
        </Button>
      </div>
    </div>
  )
}
