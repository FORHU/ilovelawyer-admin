"use client"

import { useEffect, useRef, useState } from "react"
import { Eye, EyeOff, Loader2, Plus } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { currencyDecimals, formatMoney, inputToMinor, minorToInput } from "@/components/billing/format"
import {
  type PaymentPlan,
  type PlanCurrency,
  type TenantSettings,
  useCreatePaymentPlanMutation,
  useUpdatePaymentPlanMutation,
} from "@/lib/settings/queries"

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

interface Draft {
  name: string
  description: string
  adminNotes: string
  /** The fee as typed, in major units of the site's currency: "20" dollars, or "29000" won. */
  fee: string
  /** The AI allowance as typed, in the site's currency (won on KR); stored in dollars. */
  aiAllowance: string
  caseLimit: string
  clientRequestLimit: string
}

/** How the site shows AI usage: in its plan currency, at its top-up rate (₩1,400 per $1 on KR; 1 on
 * a US-dollar site). The API keeps the allowance in dollars, which is what AI costs. */
interface AllowanceUnit {
  currency: PlanCurrency
  perUsd: number
}

/** A dollar allowance in the site currency's smallest unit: $10 is ₩14,000 at ₩1,400. */
function allowanceMinorOf(usd: number, unit: AllowanceUnit): number {
  return Math.round(usd * unit.perUsd * 10 ** currencyDecimals(unit.currency))
}

function draftFrom(plan: PaymentPlan, unit: AllowanceUnit): Draft {
  return {
    name: plan.name,
    description: plan.description ?? "",
    adminNotes: plan.adminNotes ?? "",
    fee: minorToInput(plan.priceMinor, plan.currency),
    aiAllowance: minorToInput(allowanceMinorOf(plan.includedAllowanceUsd, unit), unit.currency),
    caseLimit: String(plan.caseLimit),
    clientRequestLimit: String(plan.clientRequestLimit ?? 0),
  }
}

const EMPTY_DRAFT: Draft = { name: "", description: "", adminNotes: "", fee: "", aiAllowance: "", caseLimit: "", clientRequestLimit: "" }

function parseDraft(draft: Draft, unit: AllowanceUnit) {
  // Null for anything the currency can't hold, like part of a won.
  const priceMinor = inputToMinor(draft.fee, unit.currency)
  const allowanceMinor = inputToMinor(draft.aiAllowance, unit.currency)
  // Back to dollars for the API, unrounded, so the same won amount shows again next time.
  const includedAllowanceUsd = allowanceMinor === null ? NaN : allowanceMinor / 10 ** currencyDecimals(unit.currency) / unit.perUsd
  const caseLimit = Number(draft.caseLimit)
  // Left empty (a new tier) it's 0: unlimited.
  const clientRequestLimit = Number(draft.clientRequestLimit || 0)
  const valid =
    draft.name.trim() !== "" &&
    priceMinor !== null &&
    Number.isFinite(includedAllowanceUsd) &&
    includedAllowanceUsd >= 0 &&
    Number.isInteger(caseLimit) &&
    caseLimit >= 0 &&
    Number.isInteger(clientRequestLimit) &&
    clientRequestLimit >= 0
  return { priceMinor: priceMinor ?? 0, allowanceMinor: allowanceMinor ?? 0, includedAllowanceUsd, caseLimit, clientRequestLimit, valid }
}

/** The fee field, in the site's currency: whole won on KR, dollars and cents elsewhere. Shows the
 * price as a lawyer will see it, so an extra zero stands out. */
export function FeeField({ currency, value, onChange, label = "Fee / month" }: { currency: PlanCurrency; value: string; onChange: (value: string) => void; label?: string }) {
  const minor = inputToMinor(value, currency)
  const wholeUnits = currencyDecimals(currency) === 0
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">
        {label} ({currency})
      </Label>
      <Input
        type="number"
        min={0}
        step={wholeUnits ? "1" : "0.01"}
        inputMode={wholeUnits ? "numeric" : "decimal"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={value !== "" && minor === null}
        className={wholeUnits ? "h-8 w-32" : "h-8 w-28"}
      />
      <span className="text-muted-foreground min-h-4 text-xs tabular-nums">
        {value === "" ? null : minor === null ? (wholeUnits ? `Whole ${currency} only` : "Up to two decimals") : formatMoney({ amountMinor: minor, currency })}
      </span>
    </div>
  )
}

function TierRow({
  tenantCode,
  plan,
  unit,
  onDirtyChange,
}: {
  tenantCode: TenantSettings["code"]
  plan: PaymentPlan
  unit: AllowanceUnit
  /** Reports this row's current save-eligibility to the parent, so "Save all" can reach it — see
   * PaymentPlansCard. Re-registers every render (not just on dirty/valid change) so the closure
   * "Save all" calls always has this row's latest draft, never a stale one from an earlier render. */
  onDirtyChange: (planId: string, canSave: boolean, save: () => void) => void
}) {
  // Seeded once from the server value at mount — the parent remounts this whole card (via `key`,
  // keyed on every tier's updatedAt) whenever a tier actually changes on the server, which re-seeds
  // naturally; a save-in-flight is never clobbered.
  const [draft, setDraft] = useState<Draft>(() => draftFrom(plan, unit))
  const updateMutation = useUpdatePaymentPlanMutation()

  const parsed = parseDraft(draft, unit)
  const dirty =
    draft.name !== plan.name ||
    draft.description !== (plan.description ?? "") ||
    draft.adminNotes !== (plan.adminNotes ?? "") ||
    parsed.priceMinor !== plan.priceMinor ||
    parsed.allowanceMinor !== allowanceMinorOf(plan.includedAllowanceUsd, unit) ||
    parsed.caseLimit !== plan.caseLimit ||
    parsed.clientRequestLimit !== (plan.clientRequestLimit ?? 0)

  function save() {
    if (!parsed.valid) return
    updateMutation.mutate(
      {
        code: tenantCode,
        planId: plan.id,
        patch: {
          name: draft.name.trim(),
          description: draft.description.trim(),
          adminNotes: draft.adminNotes.trim(),
          priceMinor: parsed.priceMinor,
          includedAllowanceUsd: parsed.includedAllowanceUsd,
          caseLimit: parsed.caseLimit,
          clientRequestLimit: parsed.clientRequestLimit,
        },
      },
      { onSuccess: () => toast.success(`${draft.name.trim()} saved`), onError: (err) => toast.error((err as Error).message) }
    )
  }

  function toggleActive() {
    updateMutation.mutate(
      { code: tenantCode, planId: plan.id, patch: { isActive: !plan.isActive } },
      { onSuccess: () => toast.success(plan.isActive ? `${plan.name} hidden from new signups` : `${plan.name} reactivated`), onError: (err) => toast.error((err as Error).message) }
    )
  }

  const busy = updateMutation.isPending

  useEffect(() => {
    onDirtyChange(plan.id, parsed.valid && dirty && !busy, save)
  })

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} className="h-8 max-w-40 font-medium" aria-label="Tier name" />
          {!plan.isActive && <Badge variant="outline">Hidden from new signups</Badge>}
        </div>
        <Button type="button" size="icon" variant="ghost" onClick={toggleActive} disabled={busy} title={plan.isActive ? "Hide from new signups" : "Reactivate"}>
          {plan.isActive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Description (shown to lawyers on the plan picker)</Label>
        <Textarea
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          placeholder="What this tier is for — a lawyer sees this when choosing a plan"
          className="min-h-14 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Admin notes (internal only — never shown to lawyers)</Label>
        <Textarea
          value={draft.adminNotes}
          onChange={(e) => setDraft((d) => ({ ...d, adminNotes: e.target.value }))}
          placeholder="Context for whoever edits this tier next — why these numbers, anything to know"
          className="min-h-14 text-sm"
        />
      </div>
      <div className="flex flex-wrap gap-4">
        <FeeField currency={plan.currency} value={draft.fee} onChange={(fee) => setDraft((d) => ({ ...d, fee }))} />
        <FeeField label="AI allowance / month" currency={unit.currency} value={draft.aiAllowance} onChange={(aiAllowance) => setDraft((d) => ({ ...d, aiAllowance }))} />
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Case limit</Label>
          <Input type="number" min={0} step="1" value={draft.caseLimit} onChange={(e) => setDraft((d) => ({ ...d, caseLimit: e.target.value }))} className="h-8 w-24" />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs" title="Client requests a lawyer can take on per calendar month, from the client app (UK). 0 = unlimited.">
            Client requests / month
          </Label>
          <Input
            type="number"
            min={0}
            step="1"
            value={draft.clientRequestLimit}
            onChange={(e) => setDraft((d) => ({ ...d, clientRequestLimit: e.target.value }))}
            placeholder="0 = unlimited"
            className="h-8 w-32"
          />
        </div>
        <div className="ml-auto flex items-end">
          <Button size="sm" onClick={save} disabled={!parsed.valid || !dirty || busy}>
            {updateMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
            Save
          </Button>
        </div>
      </div>
      <span className="text-muted-foreground text-xs">
        {/* No editor and never updated since it was created: one of the default tiers, as seeded. */}
        {!plan.updatedBy && plan.updatedAt === plan.createdAt
          ? "Default tier · not changed yet"
          : `Last changed by ${plan.updatedBy?.name ?? plan.updatedBy?.email ?? "a deleted admin"} · ${formatDateTime(plan.updatedAt)}`}
      </span>
    </div>
  )
}

function AddTierRow({ tenantCode, currency, unit }: { tenantCode: TenantSettings["code"]; currency: PlanCurrency; unit: AllowanceUnit }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const createMutation = useCreatePaymentPlanMutation()
  const parsed = parseDraft(draft, unit)

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} className="self-start">
        <Plus className="size-3.5" />
        Add tier
      </Button>
    )
  }

  function create() {
    if (!parsed.valid) return
    const code = draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")
    createMutation.mutate(
      {
        code: tenantCode,
        plan: {
          code,
          name: draft.name.trim(),
          description: draft.description.trim(),
          adminNotes: draft.adminNotes.trim(),
          priceMinor: parsed.priceMinor,
          includedAllowanceUsd: parsed.includedAllowanceUsd,
          caseLimit: parsed.caseLimit,
          clientRequestLimit: parsed.clientRequestLimit,
        },
      },
      {
        onSuccess: () => {
          toast.success(`${draft.name.trim()} created`)
          setDraft(EMPTY_DRAFT)
          setOpen(false)
        },
        onError: (err) => toast.error((err as Error).message),
      }
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-dashed p-3">
      <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Tier name" className="h-8 max-w-40" />
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Description (shown to lawyers)</Label>
        <Textarea
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          placeholder="What this tier is for"
          className="min-h-14 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Admin notes (internal only)</Label>
        <Textarea
          value={draft.adminNotes}
          onChange={(e) => setDraft((d) => ({ ...d, adminNotes: e.target.value }))}
          placeholder="Context for whoever edits this tier next"
          className="min-h-14 text-sm"
        />
      </div>
      <div className="flex flex-wrap gap-4">
        <FeeField currency={currency} value={draft.fee} onChange={(fee) => setDraft((d) => ({ ...d, fee }))} />
        <FeeField label="AI allowance / month" currency={unit.currency} value={draft.aiAllowance} onChange={(aiAllowance) => setDraft((d) => ({ ...d, aiAllowance }))} />
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Case limit</Label>
          <Input type="number" min={0} step="1" value={draft.caseLimit} onChange={(e) => setDraft((d) => ({ ...d, caseLimit: e.target.value }))} className="h-8 w-24" />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs" title="Client requests a lawyer can take on per calendar month, from the client app (UK). 0 = unlimited.">
            Client requests / month
          </Label>
          <Input
            type="number"
            min={0}
            step="1"
            value={draft.clientRequestLimit}
            onChange={(e) => setDraft((d) => ({ ...d, clientRequestLimit: e.target.value }))}
            placeholder="0 = unlimited"
            className="h-8 w-32"
          />
        </div>
        <div className="ml-auto flex items-end gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <Button size="sm" onClick={create} disabled={!parsed.valid || createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
            Create
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Per-tenant B2B subscription tiers (Standard/Pro/Max are placeholders) — each tier's fee, the AI
 * usage it includes for the whole account, how many cases it allows, and how many client requests
 * (from the client app, UK) a lawyer can take on each month. Replaces the old single
 * flat subscription plan: a tenant can now offer several tiers, and a lawyer's account is on
 * exactly one of them (chosen at signup, upgradeable later). A tier is never deleted, only hidden
 * from new signups (the eye icon toggles this) — lawyers already on it keep working.
 */
export function PaymentPlansCard({ tenant }: { tenant: TenantSettings }) {
  const plans = [...tenant.paymentPlans].sort((a, b) => a.level - b.level)
  // AI allowances are shown in the site's currency at its top-up rate (won on KR).
  const unit: AllowanceUnit = { currency: tenant.planCurrency, perUsd: tenant.accountTopUp?.perUsd ?? 1 }

  // Each TierRow owns its own draft state (see its comment) and still saves independently via its
  // own Save button — this just also lets "Save all" reach every dirty row's latest save() at
  // once, without lifting that state up. A row reports itself here on every render; the ref always
  // holds the current closures, so "Save all" never calls a stale one.
  const saveable = useRef<Record<string, (() => void) | undefined>>({})
  const [saveableCount, setSaveableCount] = useState(0)

  function handleDirtyChange(planId: string, canSave: boolean, save: () => void) {
    saveable.current[planId] = canSave ? save : undefined
    const count = Object.values(saveable.current).filter(Boolean).length
    setSaveableCount((prev) => (prev === count ? prev : count))
  }

  function saveAll() {
    Object.values(saveable.current).forEach((save) => save?.())
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-xs">{tenant.code}</span>
            Subscription tiers
          </span>
          {saveableCount > 0 && (
            <Button type="button" size="sm" variant="outline" onClick={saveAll}>
              Save all ({saveableCount})
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <p className="text-muted-foreground">A lawyer picks one of these at signup and can upgrade later. Stripe billing isn&apos;t live yet, so no fee is charged.</p>
        {plans.length === 0 && <p className="text-muted-foreground text-sm">No tiers yet.</p>}
        {plans.map((plan) => (
          <TierRow key={plan.id} tenantCode={tenant.code} plan={plan} unit={unit} onDirtyChange={handleDirtyChange} />
        ))}
      </CardContent>
      <Separator />
      <CardFooter className="pt-4">
        <AddTierRow tenantCode={tenant.code} currency={tenant.planCurrency} unit={unit} />
      </CardFooter>
    </Card>
  )
}
