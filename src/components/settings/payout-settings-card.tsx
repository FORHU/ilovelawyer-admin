"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { type PayoutSettingsPatch, type PayoutSettingsResponse, useUpdatePayoutSettingsMutation } from "@/lib/settings/payout-settings"

type Tenant = PayoutSettingsResponse["tenants"][number]
type Limits = PayoutSettingsResponse["limits"]

interface Draft {
  ratePercent: string
  minFee: string
  holdDays: string
  minWithdrawal: string
}

const pounds = (minor: number) => (minor / 100).toFixed(2)

function draftOf(tenant: Tenant): Draft {
  const s = tenant.settings
  return { ratePercent: String(s.platformFeeBps / 100), minFee: pounds(s.minPlatformFeeMinor), holdDays: String(s.earningsHoldDays), minWithdrawal: pounds(s.minWithdrawalMinor) }
}

/** The draft as the API's whole-number fields; NaN where a field isn't a number. */
function parse(draft: Draft) {
  const num = (v: string) => (v.trim() === "" ? NaN : Number(v))
  return {
    platformFeeBps: Math.round(num(draft.ratePercent) * 100),
    minPlatformFeeMinor: Math.round(num(draft.minFee) * 100),
    earningsHoldDays: num(draft.holdDays),
    minWithdrawalMinor: Math.round(num(draft.minWithdrawal) * 100),
  }
}

function within(value: number, limit: { min: number; max: number }) {
  return Number.isInteger(value) && value >= limit.min && value <= limit.max
}

function Field({ id, label, hint, value, invalid, onChange }: { id: string; label: string; hint: string; value: string; invalid: boolean; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input id={id} type="number" min={0} step="any" value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid} className="h-8 w-36 tabular-nums" />
      <span className={invalid ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>{hint}</span>
    </div>
  )
}

/**
 * How quotation payments work in one tenant (PayoutSettingsSvc): the platform fee the client pays on
 * top of a lawyer's quote, how long the lawyer's fee is held before it can be withdrawn, and the
 * smallest withdrawal. A quote already sent keeps its fee, an earning its release date; changes
 * reach new quotes and withdrawals within about a minute. Audited.
 */
export function PayoutSettingsCard({ tenant, limits }: { tenant: Tenant; limits: Limits }) {
  const [draft, setDraft] = useState<Draft>(() => draftOf(tenant))
  const mutation = useUpdatePayoutSettingsMutation()
  const parsed = parse(draft)
  const valid = {
    platformFeeBps: within(parsed.platformFeeBps, limits.platformFeeBps),
    minPlatformFeeMinor: within(parsed.minPlatformFeeMinor, limits.minPlatformFeeMinor),
    earningsHoldDays: within(parsed.earningsHoldDays, limits.earningsHoldDays),
    minWithdrawalMinor: within(parsed.minWithdrawalMinor, limits.minWithdrawalMinor),
  }
  const patch: PayoutSettingsPatch = Object.fromEntries(
    (Object.keys(parsed) as (keyof typeof parsed)[]).filter((k) => parsed[k] !== tenant.settings[k]).map((k) => [k, parsed[k]])
  )
  const dirty = Object.keys(patch).length > 0
  const allValid = Object.values(valid).every(Boolean)
  const exampleFee = Math.max(Math.floor((60000 * parsed.platformFeeBps + 5000) / 10000), parsed.minPlatformFeeMinor)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-xs">{tenant.code}</span>
          Quote payments
          {tenant.isDefault && <Badge variant="outline">Defaults</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-muted-foreground">
          Clients in {tenant.name} pay a lawyer&apos;s quote plus the platform fee. The lawyer receives their full fee, available to withdraw after the hold.
        </p>
        <div className="flex flex-wrap gap-4">
          <Field
            id={`fee-rate-${tenant.code}`}
            label="Platform fee (%)"
            hint={`${limits.platformFeeBps.min / 100}–${limits.platformFeeBps.max / 100}%`}
            value={draft.ratePercent}
            invalid={!valid.platformFeeBps}
            onChange={(ratePercent) => setDraft((d) => ({ ...d, ratePercent }))}
          />
          <Field
            id={`fee-min-${tenant.code}`}
            label={`Minimum platform fee (${tenant.settings.currency})`}
            hint="Free quotes have none"
            value={draft.minFee}
            invalid={!valid.minPlatformFeeMinor}
            onChange={(minFee) => setDraft((d) => ({ ...d, minFee }))}
          />
          <Field
            id={`hold-${tenant.code}`}
            label="Hold before withdrawable (days)"
            hint={`${limits.earningsHoldDays.min}–${limits.earningsHoldDays.max} days`}
            value={draft.holdDays}
            invalid={!valid.earningsHoldDays}
            onChange={(holdDays) => setDraft((d) => ({ ...d, holdDays }))}
          />
          <Field
            id={`min-withdrawal-${tenant.code}`}
            label={`Minimum withdrawal (${tenant.settings.currency})`}
            hint={`At least ${pounds(limits.minWithdrawalMinor.min)}`}
            value={draft.minWithdrawal}
            invalid={!valid.minWithdrawalMinor}
            onChange={(minWithdrawal) => setDraft((d) => ({ ...d, minWithdrawal }))}
          />
        </div>
        {valid.platformFeeBps && valid.minPlatformFeeMinor && (
          <p className="bg-muted rounded-xl px-3 py-2 text-sm tabular-nums">
            A £600.00 quote: the client pays £{pounds(60000 + exampleFee)}, the lawyer receives £600.00, ilovelawyer keeps £{pounds(exampleFee)}.
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-xs">
            {tenant.updatedAt ? `Last changed ${new Date(tenant.updatedAt).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : "Defaults · not changed yet"}
          </span>
          <Button
            size="sm"
            disabled={!dirty || !allValid || mutation.isPending}
            onClick={() => mutation.mutate({ tenant: tenant.code, patch }, { onSuccess: () => toast.success(`${tenant.code} quote payment settings saved`), onError: (err) => toast.error((err as Error).message) })}
          >
            {mutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
