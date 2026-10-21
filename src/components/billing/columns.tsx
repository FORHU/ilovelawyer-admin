"use client"

import Link from "next/link"
import { type ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { RefundAction } from "@/components/billing/refund-action"
import { formatDateTime, formatMoney, KIND_LABELS, PROVIDER_LABELS } from "@/components/billing/format"
import type { AdminClientPayment, PaymentStatus } from "@/lib/billing/queries"

const STATUS_BADGE: Record<PaymentStatus, { label: string; className: string }> = {
  SUCCEEDED: { label: "Paid", className: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400" },
  PENDING: { label: "Pending", className: "border-amber-500/40 text-amber-600 dark:text-amber-400" },
  FAILED: { label: "Failed", className: "border-destructive/40 text-destructive" },
}

export function clientBillingHref(userId: string): string {
  return `/dashboard/billing/clients/${encodeURIComponent(userId)}`
}

function StatusCell({ payment }: { payment: AdminClientPayment }) {
  const badge = STATUS_BADGE[payment.status]
  const content = (
    <Badge variant="outline" className={badge.className}>
      {badge.label}
    </Badge>
  )
  if (!payment.failureReason) return content
  return (
    <Tooltip>
      <TooltipTrigger render={<button type="button" className="cursor-help" />}>{content}</TooltipTrigger>
      <TooltipContent className="max-w-xs whitespace-normal">{payment.failureReason}</TooltipContent>
    </Tooltip>
  )
}

/** The amount, and under it what was refunded, with each refund (who, why, status) on hover. */
function AmountCell({ payment }: { payment: AdminClientPayment }) {
  const refunded = payment.refunded.amountMinor > 0
  const pending = payment.refundPending.amountMinor > 0
  const failed = payment.refunds.some((r) => r.status === "FAILED")
  return (
    <div className="flex flex-col">
      <span className="tabular-nums">{formatMoney(payment.amount)}</span>
      {payment.refunds.length > 0 && (
        <Tooltip>
          <TooltipTrigger render={<button type="button" className="cursor-help text-left text-xs" />}>
            {refunded && <span className="text-muted-foreground block">−{formatMoney(payment.refunded)} refunded</span>}
            {pending && <span className="block text-amber-600 dark:text-amber-400">{formatMoney(payment.refundPending)} refund pending</span>}
            {!refunded && !pending && failed && <span className="text-destructive block">Refund failed</span>}
          </TooltipTrigger>
          <TooltipContent className="max-w-sm whitespace-normal">
            <ul className="flex flex-col gap-1.5">
              {payment.refunds.map((r) => (
                <li key={r.id}>
                  {formatMoney(r.amount)} · {r.status.toLowerCase()} · {formatDateTime(r.createdAt)}
                  {r.admin ? ` · by ${r.admin.name ?? "a deleted admin"}` : ""}
                  <br />“{r.reason}”{r.failureReason ? ` — ${r.failureReason}` : ""}
                </li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

/**
 * The payments table. `showClient` is off on a client's own page; `onFilterCase` makes the case name
 * narrow the table to that case.
 */
export function billingColumns({
  showClient = true,
  onFilterCase,
}: { showClient?: boolean; onFilterCase?: (caseRef: { id: string; title: string }) => void } = {}): ColumnDef<AdminClientPayment>[] {
  return [
    {
      accessorKey: "createdAt",
      header: "Date",
      enableSorting: false,
      cell: ({ row }) => <span className="whitespace-nowrap">{formatDateTime(row.original.createdAt)}</span>,
    },
    ...(showClient
      ? [
          {
            id: "client",
            header: "Client",
            enableSorting: false,
            cell: ({ row }) => (
              <Link href={clientBillingHref(row.original.client.id)} className="flex flex-col hover:underline">
                <span>{row.original.client.name ?? row.original.client.email}</span>
                {row.original.client.name && <span className="text-muted-foreground text-xs">{row.original.client.email}</span>}
              </Link>
            ),
          } satisfies ColumnDef<AdminClientPayment>,
        ]
      : []),
    {
      id: "case",
      header: "Case",
      enableSorting: false,
      cell: ({ row }) => {
        const c = row.original.case
        if (!c) {
          // A case payment not yet used to create its case, or one whose case was deleted.
          return <span className="text-muted-foreground text-xs">{row.original.usedAt ? "Case deleted" : "No case yet"}</span>
        }
        return onFilterCase ? (
          <button type="button" className="text-left hover:underline" title="Show only this case" onClick={() => onFilterCase(c)}>
            {c.title}
          </button>
        ) : (
          c.title
        )
      },
    },
    {
      id: "kind",
      header: "Kind",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {KIND_LABELS[row.original.kind]}
          <span className="text-muted-foreground block text-xs">{row.original.credits} credits</span>
        </span>
      ),
    },
    { id: "amount", header: "Amount", enableSorting: false, cell: ({ row }) => <AmountCell payment={row.original} /> },
    { id: "status", header: "Status", enableSorting: false, cell: ({ row }) => <StatusCell payment={row.original} /> },
    {
      id: "provider",
      header: "Provider",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="flex flex-col">
          <Badge variant={row.original.provider === "STRIPE" ? "secondary" : "outline"}>{PROVIDER_LABELS[row.original.provider]}</Badge>
          {row.original.promoCode && <span className="text-muted-foreground mt-0.5 text-xs">{row.original.promoCode}</span>}
        </span>
      ),
    },
    { id: "actions", header: "", enableSorting: false, cell: ({ row }) => <RefundAction payment={row.original} /> },
  ]
}
