"use client"

import * as React from "react"
import Link from "next/link"

import { ListPagination } from "@/components/list-pagination"
import { QuotationRefundAction } from "@/components/billing/quotation-refund-action"
import { formatDateTime, formatMoney } from "@/components/billing/format"
import { EXIT_REASON_LABELS, EXIT_STATUS_LABELS } from "@/components/billing/lawyer-exit-labels"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { QUOTE_PAYMENTS_PAGE_SIZE, type QuotationPaymentStatus, useQuotationPaymentsQuery } from "@/lib/billing/quotation-payments"

const STATUS_LABELS: Record<QuotationPaymentStatus, string> = {
  PENDING: "Waiting on the client",
  SUCCEEDED: "Paid",
  FAILED: "Declined",
  CANCELED: "Cancelled",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partly refunded",
  DISPUTED: "Disputed",
}

function PaymentsCard() {
  const [page, setPage] = React.useState(1)
  const [all, setAll] = React.useState(false)
  const { data, isLoading, isError, error } = useQuotationPaymentsQuery(page, all)
  // No rows on a failed fetch: the previous page's, kept while loading, would sit under this page's
  // number and could be refunded by mistake.
  const rows = isError ? [] : (data?.data ?? [])
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / QUOTE_PAYMENTS_PAGE_SIZE))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client payments</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            id="quote-payments-all"
            checked={all}
            onCheckedChange={(checked) => {
              setAll(checked === true)
              setPage(1)
            }}
          />
          <Label htmlFor="quote-payments-all" className="font-normal">
            Include attempts that took no money (declined, cancelled, waiting)
          </Label>
        </div>
        {isLoading && <p className="text-muted-foreground text-sm">Loading payments…</p>}
        {isError && <p className="text-destructive text-sm">{(error as Error).message}</p>}
        {data && !isError && rows.length === 0 && <p className="text-muted-foreground text-sm">No quote payments yet.</p>}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Client paid</TableHead>
                  <TableHead className="text-right">Lawyer receives</TableHead>
                  <TableHead className="text-right">Platform fee</TableHead>
                  <TableHead className="text-right">Refunded</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Request</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap">{formatDateTime(p.succeededAt ?? p.createdAt)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(p.amount)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(p.serviceFee)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(p.platformFee)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <div className="flex flex-col items-end gap-1">
                        <span>{p.refunded.amountMinor ? formatMoney(p.refunded) : "—"}</span>
                        {p.refundPending.amountMinor > 0 && <Badge variant="outline">Refund pending {formatMoney(p.refundPending)}</Badge>}
                        {p.refunds[0]?.status === "FAILED" && (
                          <Badge variant="outline" className="text-destructive" title={p.refunds[0].failureReason ?? undefined}>
                            Last refund failed
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={p.status === "SUCCEEDED" ? "default" : "outline"}>{STATUS_LABELS[p.status]}</Badge>
                        {p.provider === "DUMMY" && <Badge variant="outline">Dummy</Badge>}
                      </div>
                      {p.failureReason && <p className="text-muted-foreground mt-1 text-xs">{p.failureReason}</p>}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <span className="font-mono text-xs">{p.requestId.slice(0, 8)}</span>
                      {p.lawyerExit && (
                        <div className="mt-1 flex flex-col gap-0.5 text-xs whitespace-normal">
                          <Link href="/dashboard/lawyer-exits" className="font-medium underline-offset-2 hover:underline">
                            Lawyer exit: {EXIT_STATUS_LABELS[p.lawyerExit.status].toLowerCase()}
                          </Link>
                          <span className="text-muted-foreground">
                            {EXIT_REASON_LABELS[p.lawyerExit.reason]}
                            {p.lawyerExit.claimed ? ` · claims ${formatMoney(p.lawyerExit.claimed)}` : " · no work done"}
                          </span>
                          {p.lawyerExit.note && <span className="text-muted-foreground break-words">{p.lawyerExit.note}</span>}
                          {p.lawyerExit.claimNote && <span className="text-muted-foreground break-words">{p.lawyerExit.claimNote}</span>}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <QuotationRefundAction payment={p} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {data && !isError && data.total > 0 && <ListPagination total={data.total} itemLabel="payment" page={page} pageCount={pageCount} onPageChange={setPage} />}
      </CardContent>
    </Card>
  )
}

/** /dashboard/billing/quote-payments: Billing's "Quote payments" tab. Clients paying lawyers' quotes
 * through ilovelawyer, each payment split into what the lawyer receives and the platform fee, with
 * refunds. A refund for a lawyer who couldn't continue is decided in Lawyer exits. */
export default function QuotePaymentsPage() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        What clients have paid for lawyers&apos; quotes. ilovelawyer deducts its platform fee and the rest goes to the lawyer&apos;s wallet (Lawyer exits → Lawyer
        wallets). When a lawyer can&apos;t continue, the refund is decided in Lawyer exits. The fee and the hold are set per tenant in Settings.
      </p>
      <PaymentsCard />
    </div>
  )
}
