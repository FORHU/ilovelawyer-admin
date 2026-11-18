"use client"

import * as React from "react"
import {
  type ColumnDef,
  type OnChangeFn,
  type SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchPlaceholder?: string
  /** What each row is, singular, for the "N users" count under the table. */
  itemLabel?: string
  total: number
  isFetching?: boolean
  search: string
  onSearchChange: (value: string) => void
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  /** Makes each row clickable (and Enter/Space when it has focus): e.g. to open its details.
   * Clicks on a button, link or field inside the row, or inside a dialog it opened, don't count. */
  onRowClick?: (row: TData) => void
  /** The row's accessible name when it's clickable, e.g. "View Jane Lawyer's application". */
  rowLabel?: (row: TData) => string
}

/** Whether a click or key press is the row's own, not a control inside it or a dialog it opened
 * (portalled out of the row, but React still bubbles its events through it). */
function isRowOwnEvent(event: React.SyntheticEvent<HTMLTableRowElement>): boolean {
  const target = event.target as HTMLElement
  if (!event.currentTarget.contains(target)) return false
  return !target.closest("button, a, input, select, textarea, label, [role='dialog'], [role='menu'], [role='listbox']")
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Search…",
  itemLabel = "user",
  total,
  isFetching,
  search,
  onSearchChange,
  sorting,
  onSortingChange,
  page,
  pageCount,
  onPageChange,
  onRowClick,
  rowLabel,
}: DataTableProps<TData, TValue>) {
  // TanStack Table's returned functions are intentionally unstable across renders;
  // React Compiler can't memoize this safely and flags it, but that's expected here.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
    pageCount,
    onSortingChange,
    state: { sorting },
  })

  return (
    <div className="flex flex-col gap-4">
      <Input
        placeholder={searchPlaceholder}
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        className="max-w-sm"
      />
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  {...(onRowClick
                    ? {
                        tabIndex: 0,
                        "aria-label": rowLabel?.(row.original),
                        className: "cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none",
                        onClick: (event: React.MouseEvent<HTMLTableRowElement>) => {
                          if (isRowOwnEvent(event)) onRowClick(row.original)
                        },
                        onKeyDown: (event: React.KeyboardEvent<HTMLTableRowElement>) => {
                          if ((event.key === "Enter" || event.key === " ") && event.target === event.currentTarget) {
                            event.preventDefault()
                            onRowClick(row.original)
                          }
                        },
                      }
                    : {})}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          {total} {itemLabel}{total === 1 ? "" : "s"}
          {isFetching ? " · refreshing…" : ""}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">
            Page {page} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
