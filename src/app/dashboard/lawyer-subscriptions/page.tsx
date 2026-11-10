"use client"

import * as React from "react"

import { ListPagination } from "@/components/list-pagination"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  LAWYER_SUBSCRIPTIONS_PAGE_SIZE,
  type AdminLawyerSubscription,
  type LawyerSubscriptionFilter,
  useLawyerSubscriptionsQuery,
} from "@/lib/billing/lawyer-subscriptions"

const FILTERS: { value: LawyerSubscriptionFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAST_DUE", label: "Past due" },
  { value: "CHANGING", label: "Cancelling or downgrading" },
  { value: "ENDED", label: "Ended" },
  { value: "PENDING", label: "Checkout open" },
]

const usd = (amount: number) => amount.toLocaleString("en-US", { style: "currency", currency: "USD" })
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
const shortDay = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })

/** How a subscription reads in the Status column: what it is now, and the badge's tone. */
function statusOf(s: AdminLawyerSubscription): { label: string; tone: "ok" | "warn" | "bad" | "plain" } {
  if (s.status === "PAST_DUE") return { label: "Past due", tone: "bad" }
  if (s.status === "CANCELED") return { label: "Cancelled", tone: "plain" }
  if (s.status === "EXPIRED") return { label: "Checkout abandoned", tone: "plain" }
  if (s.status === "PENDING") return { label: "Checkout open", tone: "plain" }
  if (s.cancelAtPeriodEnd) return { label: "Cancelling", tone: "warn" }
  if (s.scheduledPlan) return { label: "Downgrading", tone: "warn" }
  return { label: "Active", tone: "ok" }
}

const TONE: Record<"ok" | "warn" | "bad" | "plain", string> = {
  ok: "border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  warn: "border-transparent bg-amber-500/10 text-amber-700 dark:text-amber-400",
  bad: "border-transparent bg-red-500/10 text-red-700 dark:text-red-400",
  plain: "",
}

/** What happens next: the renewal, the end, the downgrade, or why the last renewal failed. */
function nextOf(s: AdminLawyerSubscription): string {
  const end = s.currentPeriodEnd
  if (s.status === "PAST_DUE") return s.failureReason ?? "The last renewal failed"
  if (s.status === "CANCELED") return end ? `Ended ${shortDay(end)}` : "Ended"
  if (s.status !== "ACTIVE" || !end) return "—"
  if (s.cancelAtPeriodEnd) return `Ends ${shortDay(end)}`
  if (s.scheduledPlan) return `${s.scheduledPlan.name ?? "A lower plan"} from ${shortDay(end)}`
  return `Renews ${shortDay(end)}`
}

function Kpi({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-2xl border px-4 py-3">
      <span className="text-xl font-semibold tabular-nums">{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  )
}

/**
 * Lawyer subscriptions: what lawyers pay ilovelawyer each month for their plan (Standard, Pro, Max,
 * set per tenant in Settings). Who's on which plan, who's behind on payment, and who's cancelling or
 * downgrading. Read only: lawyers change their own plan, and Stripe takes the payments.
 */
export default function LawyerSubscriptionsPage() {
  const [filter, setFilter] = React.useState<LawyerSubscriptionFilter>("ALL")
  const [page, setPage] = React.useState(1)
  const { data, isLoading, isError, error } = useLawyerSubscriptionsQuery(filter, page)
  const rows = isError ? [] : (data?.data ?? [])
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / LAWYER_SUBSCRIPTIONS_PAGE_SIZE))
  const summary = isError ? undefined : data?.summary

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lawyer subscriptions</h1>
        <p className="text-muted-foreground text-sm">
          What lawyers pay ilovelawyer each month for their plan. Plans and prices are set per tenant in Settings, and Stripe takes the payments. A failed renewal shows
          as Past due until the lawyer updates their card.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi value={summary ? summary.active : "—"} label="Active subscriptions" />
        <Kpi value={summary ? usd(summary.monthlyUsd) : "—"} label="Billed each month, at today's plan fees" />
        <Kpi value={summary ? summary.pastDue : "—"} label="Past due" />
        <Kpi value={summary ? summary.changing : "—"} label="Cancelling or downgrading" />
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Subscriptions</CardTitle>
          <Tabs
            value={filter}
            onValueChange={(value) => {
              setFilter(value as LawyerSubscriptionFilter)
              setPage(1)
            }}
          >
            <TabsList className="flex-wrap">
              {FILTERS.map((f) => (
                <TabsTrigger key={f.value} value={f.value}>
                  {f.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {isLoading && <p className="text-muted-foreground text-sm">Loading subscriptions…</p>}
          {isError && <p className="text-destructive text-sm">{(error as Error).message}</p>}
          {data && !isError && rows.length === 0 && (
            <p className="text-muted-foreground text-sm">{filter === "ALL" ? "No lawyer has subscribed to a plan yet." : "No subscriptions here."}</p>
          )}
          {rows.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lawyer</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Per month</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Current period</TableHead>
                    <TableHead>Next</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((s) => {
                    const status = statusOf(s)
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{s.lawyer.name ?? "Deleted account"}</span>
                            <span className="text-muted-foreground text-xs">{s.lawyer.firmName ? `${s.lawyer.firmName} · Firm` : "Solo lawyer"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{s.plan.name}</span>
                            <span className="text-muted-foreground text-xs">{s.plan.tenantCode}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{usd(s.plan.feeUsd)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={TONE[status.tone]}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {s.currentPeriodStart && s.currentPeriodEnd ? `${shortDay(s.currentPeriodStart)} – ${day(s.currentPeriodEnd)}` : "—"}
                        </TableCell>
                        <TableCell className={`max-w-xs text-sm whitespace-normal ${s.status === "PAST_DUE" ? "text-destructive" : "text-muted-foreground"}`}>{nextOf(s)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {data && !isError && data.total > 0 && (
            <ListPagination total={data.total} itemLabel="subscription" page={page} pageCount={pageCount} onPageChange={setPage} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
