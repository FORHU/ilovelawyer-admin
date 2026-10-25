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
import {
  type PaymentPlan,
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
  feeUsd: string
  includedAllowanceUsd: string
  caseLimit: string
  clientRequestLimit: string
}

function draftFrom(plan: PaymentPlan): Draft {
  return {
    name: plan.name,
    description: plan.description ?? "",
    adminNotes: plan.adminNotes ?? "",
    feeUsd: String(plan.feeUsd),
    includedAllowanceUsd: String(plan.includedAllowanceUsd),
    caseLimit: String(plan.caseLimit),
    clientRequestLimit: String(plan.clientRequestLimit ?? 0),
  }
}

function parseDraft(draft: Draft) {
  const feeUsd = Number(draft.feeUsd)
  const includedAllowanceUsd = Number(draft.includedAllowanceUsd)
  const caseLimit = Number(draft.caseLimit)
  // Left empty (a new tier) it's 0: unlimited.
  const clientRequestLimit = Number(draft.clientRequestLimit || 0)
  const valid =
    draft.name.trim() !== "" &&
    Number.isFinite(feeUsd) &&
    feeUsd >= 0 &&
    Number.isFinite(includedAllowanceUsd) &&
    includedAllowanceUsd >= 0 &&
    Number.isInteger(caseLimit) &&
    caseLimit >= 0 &&
    Number.isInteger(clientRequestLimit) &&
    clientRequestLimit >= 0
  return { feeUsd, includedAllowanceUsd, caseLimit, clientRequestLimit, valid }
}

function TierRow({
  tenantCode,
  plan,
  onDirtyChange,
}: {
  tenantCode: TenantSettings["code"]
  plan: PaymentPlan
  /** Reports this row's current save-eligibility to the parent, so "Save all" can reach it — see
   * PaymentPlansCard. Re-registers every render (not just on dirty/valid change) so the closure
   * "Save all" calls always has this row's latest draft, never a stale one from an earlier render. */
  onDirtyChange: (planId: string, canSave: boolean, save: () => void) => void
}) {
  // Seeded once from the server value at mount — the parent remounts this whole card (via `key`,
  // keyed on every tier's updatedAt) whenever a tier actually changes on the server, which re-seeds
  // naturally; a save-in-flight is never clobbered.
  const [draft, setDraft] = useState<Draft>(() => draftFrom(plan))
  const updateMutation = useUpdatePaymentPlanMutation()

  const parsed = parseDraft(draft)
  const dirty =
    draft.name !== plan.name ||
    draft.description !== (plan.description ?? "") ||
    draft.adminNotes !== (plan.adminNotes ?? "") ||
    parsed.feeUsd !== plan.feeUsd ||
    parsed.includedAllowanceUsd !== plan.includedAllowanceUsd ||
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
          feeUsd: parsed.feeUsd,
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
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Fee (USD)</Label>
          <Input type="number" min={0} step="0.01" value={draft.feeUsd} onChange={(e) => setDraft((d) => ({ ...d, feeUsd: e.target.value }))} className="h-8 w-28" />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">AI allowance (USD)</Label>
          <Input type="number" min={0} step="0.01" value={draft.includedAllowanceUsd} onChange={(e) => setDraft((d) => ({ ...d, includedAllowanceUsd: e.target.value }))} className="h-8 w-28" />
        </div>
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

function AddTierRow({ tenantCode }: { tenantCode: TenantSettings["code"] }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>({ name: "", description: "", adminNotes: "", feeUsd: "", includedAllowanceUsd: "", caseLimit: "", clientRequestLimit: "" })
  const createMutation = useCreatePaymentPlanMutation()
  const parsed = parseDraft(draft)

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
          feeUsd: parsed.feeUsd,
          includedAllowanceUsd: parsed.includedAllowanceUsd,
          caseLimit: parsed.caseLimit,
          clientRequestLimit: parsed.clientRequestLimit,
        },
      },
      {
        onSuccess: () => {
          toast.success(`${draft.name.trim()} created`)
          setDraft({ name: "", description: "", adminNotes: "", feeUsd: "", includedAllowanceUsd: "", caseLimit: "", clientRequestLimit: "" })
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
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Fee (USD)</Label>
          <Input type="number" min={0} step="0.01" value={draft.feeUsd} onChange={(e) => setDraft((d) => ({ ...d, feeUsd: e.target.value }))} className="h-8 w-28" />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">AI allowance (USD)</Label>
          <Input type="number" min={0} step="0.01" value={draft.includedAllowanceUsd} onChange={(e) => setDraft((d) => ({ ...d, includedAllowanceUsd: e.target.value }))} className="h-8 w-28" />
        </div>
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
          <TierRow key={plan.id} tenantCode={tenant.code} plan={plan} onDirtyChange={handleDirtyChange} />
        ))}
      </CardContent>
      <Separator />
      <CardFooter className="pt-4">
        <AddTierRow tenantCode={tenant.code} />
      </CardFooter>
    </Card>
  )
}
