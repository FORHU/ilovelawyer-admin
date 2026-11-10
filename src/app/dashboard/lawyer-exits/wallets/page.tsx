"use client"

import * as React from "react"

import { ListPagination } from "@/components/list-pagination"
import { formatMoney } from "@/components/billing/format"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { QUOTE_PAYMENTS_PAGE_SIZE, useWalletsQuery } from "@/lib/billing/quotation-payments"

function WalletsCard() {
  const [page, setPage] = React.useState(1)
  const { data, isLoading, isError, error } = useWalletsQuery(page)
  const rows = isError ? [] : (data?.data ?? [])
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / QUOTE_PAYMENTS_PAGE_SIZE))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lawyer wallets</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading && <p className="text-muted-foreground text-sm">Loading wallets…</p>}
        {isError && <p className="text-destructive text-sm">{(error as Error).message}</p>}
        {data && !isError && rows.length === 0 && <p className="text-muted-foreground text-sm">No wallets yet. One is made when a firm or lawyer is first paid.</p>}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payee</TableHead>
                  <TableHead className="text-right">On hold</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">On its way</TableHead>
                  <TableHead className="text-right">Paid out</TableHead>
                  <TableHead>Payouts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{w.owner.name ?? (w.owner.type === "ORGANIZATION" ? "Deleted organization" : "Deleted account")}</span>
                        <span className="text-muted-foreground text-xs">{w.owner.type === "ORGANIZATION" ? "Firm" : "Solo lawyer"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(w.balances.pending)}</TableCell>
                    <TableCell className={`text-right tabular-nums ${w.balances.available.amountMinor < 0 ? "text-destructive" : ""}`}>{formatMoney(w.balances.available)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(w.balances.reserved)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(w.balances.withdrawn)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{w.payoutAccount.payoutsEnabled ? "Set up" : w.payoutAccount.connected ? "Unfinished" : "Not set up"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {data && !isError && data.total > 0 && <ListPagination total={data.total} itemLabel="wallet" page={page} pageCount={pageCount} onPageChange={setPage} />}
      </CardContent>
    </Card>
  )
}

/** /dashboard/lawyer-exits/wallets: Lawyer exits' "Lawyer wallets" tab. The wallets the lawyers'
 * share of a payment goes into: on hold, available, on its way and paid out, and whether payouts are
 * set up. An exit keeps the lawyer's share on hold until it's settled. */
export default function LawyerWalletsPage() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        Where the lawyer&apos;s share of each client payment goes. It stays on hold for the tenant&apos;s holding period after the engagement closes, and until any
        exit is settled; then the lawyer can withdraw it to their bank.
      </p>
      <WalletsCard />
    </div>
  )
}
