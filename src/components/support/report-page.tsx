"use client"

import { useMemo, useState } from "react"
import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useSupportReportQuery } from "@/lib/support/queries"

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_RANGE_DAYS = 30
/** The API's longest range (SUPPORT_REPORT_MAX_DAYS). */
const MAX_DAYS = 366

const dateInput = (date: Date) => date.toISOString().slice(0, 10)
const pct = (rate: number | null) => (rate === null ? "–" : `${Math.round(rate * 1000) / 10}%`)
const number = (n: number) => n.toLocaleString()

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

/**
 * How the chat's flows are doing over a range of days (both days included): how often a flow started,
 * ended in “Yes, thanks” or “No, not really”, or ended with a person. Flows that fail most come first,
 * each linking to its editor, and the words clients typed that matched nothing are listed so a flow
 * can be given those trigger words. Counts and redacted phrases only: no names, no transcripts.
 */
export function ReportPage() {
  const [from, setFrom] = useState(() => dateInput(new Date(Date.now() - (DEFAULT_RANGE_DAYS - 1) * DAY_MS)))
  const [to, setTo] = useState(() => dateInput(new Date()))

  const range = useMemo(() => {
    const start = new Date(`${from}T00:00:00.000Z`)
    const end = new Date(`${to}T00:00:00.000Z`)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { error: "Pick both days." }
    if (end < start) return { error: "The last day can't be before the first." }
    // The API's `to` is exclusive: the last day is included by ending at the start of the next.
    const exclusiveEnd = new Date(end.getTime() + DAY_MS)
    if ((exclusiveEnd.getTime() - start.getTime()) / DAY_MS > MAX_DAYS) return { error: `Pick a range of ${MAX_DAYS} days or fewer.` }
    return { from: start.toISOString(), to: exclusiveEnd.toISOString() }
  }, [from, to])

  const valid = "from" in range ? range : null
  const ok = valid !== null
  const { data, isLoading, isError, error, isPlaceholderData } = useSupportReportQuery(valid?.from ?? "", valid?.to ?? "", ok)
  const totals = data?.totals
  const answered = totals ? totals.helpedYes + totals.helpedNo : 0

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground max-w-3xl text-sm">
        Which flows help and which send clients to the team. Use it to rewrite the flows at the top and to give them the words clients type.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-from">From</Label>
          <Input id="report-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-to">To (included)</Label>
          <Input id="report-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>
        {!valid && "error" in range && (
          <p role="alert" className="text-destructive pb-1.5 text-sm">
            {range.error}
          </p>
        )}
      </div>

      {ok && isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
      {isError && <p className="text-destructive text-sm">{(error as Error).message}</p>}

      {ok && data && totals && (
        <div className={isPlaceholderData ? "flex flex-col gap-4 opacity-60 transition-opacity" : "flex flex-col gap-4"} aria-busy={isPlaceholderData}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Flows started" value={number(totals.started)} note={`${number(totals.unmatched)} typed ${totals.unmatched === 1 ? "message" : "messages"} matched nothing`} />
            <StatCard title="Said it helped" value={pct(answered > 0 ? totals.helpedYes / answered : null)} note={`${number(totals.helpedYes)} of ${number(answered)} answers`} />
            <StatCard title="Said it didn't help" value={pct(answered > 0 ? totals.helpedNo / answered : null)} note={`${number(totals.helpedNo)} of ${number(answered)} answers`} />
            <StatCard title="Ended with a person" value={pct(totals.escalationRate)} note={`${number(totals.escalated)} of ${number(totals.started)} flows started`} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Flows, the ones that fail most first</CardTitle>
              <CardDescription>Ordered by “No” answers plus ending with a person.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.flows.length === 0 ? (
                <p className="text-muted-foreground text-sm">No flows were started in this range.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Flow</TableHead>
                      <TableHead className="text-right">Started</TableHead>
                      <TableHead className="text-right">Yes</TableHead>
                      <TableHead className="text-right">No</TableHead>
                      <TableHead className="text-right">Yes rate</TableHead>
                      <TableHead className="text-right">With a person</TableHead>
                      <TableHead className="text-right">Person rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.flows.map((flow) => (
                      <TableRow key={flow.flowId}>
                        <TableCell>
                          {flow.flowTitle ? (
                            <Link href={`/dashboard/support/flows/${encodeURIComponent(flow.flowId)}`} className="font-medium underline-offset-2 hover:underline">
                              {flow.flowTitle}
                            </Link>
                          ) : (
                            <span title="This flow is no longer published">{flow.flowId} (removed)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{number(flow.started)}</TableCell>
                        <TableCell className="text-right tabular-nums">{number(flow.helpedYes)}</TableCell>
                        <TableCell className="text-right tabular-nums">{number(flow.helpedNo)}</TableCell>
                        <TableCell className="text-right tabular-nums">{pct(flow.helpedYesRate)}</TableCell>
                        <TableCell className="text-right tabular-nums">{number(flow.escalated)}</TableCell>
                        <TableCell className="text-right tabular-nums">{pct(flow.escalationRate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What clients typed that matched nothing</CardTitle>
              <CardDescription>Most often first. Emails, phone numbers and postcodes are taken out before they are stored.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.unmatchedPhrases.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nothing unmatched in this range.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Phrase</TableHead>
                      <TableHead className="w-24 text-right">Times</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.unmatchedPhrases.map((phrase) => (
                      <TableRow key={phrase.text}>
                        <TableCell className="break-words whitespace-normal">{phrase.text}</TableCell>
                        <TableCell className="text-right tabular-nums">{number(phrase.count)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
