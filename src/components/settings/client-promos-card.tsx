"use client"

import { useState } from "react"
import { Eye, EyeOff, Loader2, Plus } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { AmountField, CurrencySelect } from "@/components/settings/client-pricing-fields"
import {
  type ClientPricing,
  type ClientPromo,
  type PromoFields,
  lastChanged,
  toMajor,
  toMinor,
  useCreateClientPromoMutation,
  useUpdateClientPromoMutation,
} from "@/lib/settings/client-pricing"

interface Draft {
  description: string
  discount: string
  currency: string
  firstTopUpOnly: boolean
  oncePerClient: boolean
  /** yyyy-mm-dd, or "" for no expiry. The code stops working at the start of that day (UTC). */
  expiresOn: string
  maxRedemptions: string
}

function draftFrom(promo: ClientPromo, pricing: ClientPricing): Draft {
  const currency = pricing.currencies.find((c) => c.code === promo.currency)
  return {
    description: promo.description,
    discount: toMajor(promo.discountMinor, currency),
    currency: promo.currency,
    firstTopUpOnly: promo.firstTopUpOnly,
    oncePerClient: promo.oncePerClient,
    expiresOn: promo.expiresAt ? promo.expiresAt.slice(0, 10) : "",
    maxRedemptions: promo.maxRedemptions === null ? "" : String(promo.maxRedemptions),
  }
}

/** The draft as the API takes it, or null while something in it is invalid. */
function parse(draft: Draft, pricing: ClientPricing): Omit<PromoFields, "isActive"> | null {
  const currency = pricing.currencies.find((c) => c.code === draft.currency)
  const discountMinor = toMinor(draft.discount, currency)
  const max = draft.maxRedemptions.trim() === "" ? null : Number(draft.maxRedemptions)
  if (!currency || !draft.description.trim() || !(discountMinor > 0 && discountMinor <= currency.maxMinor)) return null
  if (max !== null && !(Number.isInteger(max) && max >= 1)) return null
  return {
    description: draft.description.trim(),
    discountMinor,
    currency: draft.currency,
    firstTopUpOnly: draft.firstTopUpOnly,
    oncePerClient: draft.oncePerClient,
    expiresAt: draft.expiresOn ? new Date(`${draft.expiresOn}T00:00:00Z`).toISOString() : null,
    maxRedemptions: max,
  }
}

const onError = (err: unknown) => toast.error((err as Error).message)

function PromoFieldsEditor({ draft, setDraft, pricing }: { draft: Draft; setDraft: (f: (d: Draft) => Draft) => void; pricing: ClientPricing }) {
  const currency = pricing.currencies.find((c) => c.code === draft.currency)
  return (
    <>
      <Input value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} placeholder="Shown to the client, e.g. $5 off your first top-up" className="h-8" aria-label="Description" />
      <div className="flex flex-wrap gap-4">
        <CurrencySelect value={draft.currency} currencies={pricing.currencies} onChange={(c) => setDraft((d) => ({ ...d, currency: c }))} />
        <AmountField label="Discount" value={draft.discount} currency={currency} allowZero={false} onChange={(discount) => setDraft((d) => ({ ...d, discount }))} />
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Expires on (UTC)</Label>
          <Input type="date" value={draft.expiresOn} onChange={(e) => setDraft((d) => ({ ...d, expiresOn: e.target.value }))} className="h-8 w-40" />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Max uses (empty = no limit)</Label>
          <Input type="number" min={1} step="1" value={draft.maxRedemptions} onChange={(e) => setDraft((d) => ({ ...d, maxRedemptions: e.target.value }))} className="h-8 w-28" />
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <Label className="flex items-center gap-2 text-sm font-normal">
          <Checkbox checked={draft.firstTopUpOnly} onCheckedChange={(v) => setDraft((d) => ({ ...d, firstTopUpOnly: v === true }))} />
          First top-up only
        </Label>
        <Label className="flex items-center gap-2 text-sm font-normal">
          <Checkbox checked={draft.oncePerClient} onCheckedChange={(v) => setDraft((d) => ({ ...d, oncePerClient: v === true }))} />
          Once per client
        </Label>
      </div>
    </>
  )
}

function PromoRow({ pricing, promo }: { pricing: ClientPricing; promo: ClientPromo }) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(promo, pricing))
  const update = useUpdateClientPromoMutation()
  const parsed = parse(draft, pricing)
  const dirty = JSON.stringify(draft) !== JSON.stringify(draftFrom(promo, pricing))
  const expired = promo.expiresAt !== null && new Date(promo.expiresAt) <= new Date()
  const usedUp = promo.maxRedemptions !== null && promo.redemptions >= promo.maxRedemptions

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono font-medium">{promo.code}</span>
          <span className="text-muted-foreground text-xs">
            used {promo.redemptions}
            {promo.maxRedemptions !== null && ` of ${promo.maxRedemptions}`}
          </span>
          {!promo.isActive && <Badge variant="outline">Off</Badge>}
          {expired && <Badge variant="outline">Expired</Badge>}
          {usedUp && <Badge variant="outline">Used up</Badge>}
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={update.isPending}
          onClick={() =>
            update.mutate(
              { id: promo.id, patch: { isActive: !promo.isActive } },
              { onSuccess: () => toast.success(promo.isActive ? `${promo.code} turned off` : `${promo.code} turned on`), onError }
            )
          }
          title={promo.isActive ? "Turn off" : "Turn on"}
        >
          {promo.isActive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
      </div>
      <PromoFieldsEditor draft={draft} setDraft={setDraft} pricing={pricing} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs">{lastChanged(promo)}</span>
        <Button
          size="sm"
          disabled={!parsed || !dirty || update.isPending}
          onClick={() => parsed && update.mutate({ id: promo.id, patch: parsed }, { onSuccess: () => toast.success(`${promo.code} saved`), onError })}
        >
          {update.isPending && <Loader2 className="size-3.5 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  )
}

function AddPromoRow({ pricing }: { pricing: ClientPricing }) {
  const empty: Draft = {
    description: "",
    discount: "",
    currency: (pricing.packs.find((p) => p.isDefault) ?? pricing.packs[0])?.currency ?? pricing.currencies[0]?.code ?? "USD",
    firstTopUpOnly: false,
    oncePerClient: true,
    expiresOn: "",
    maxRedemptions: "",
  }
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState("")
  const [draft, setDraft] = useState<Draft>(empty)
  const create = useCreateClientPromoMutation()
  const parsed = parse(draft, pricing)
  const codeValid = /^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code.trim().toUpperCase())

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} className="self-start">
        <Plus className="size-3.5" />
        Add promo code
      </Button>
    )
  }

  function submit() {
    if (!parsed || !codeValid) return
    create.mutate(
      { tenant: pricing.code, promo: { code: code.trim().toUpperCase(), ...parsed, isActive: true } },
      {
        onSuccess: () => {
          toast.success(`${code.trim().toUpperCase()} created`)
          setCode("")
          setDraft(empty)
          setOpen(false)
        },
        onError,
      }
    )
  }

  return (
    <div className="flex w-full flex-col gap-3 rounded-md border border-dashed p-3">
      <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="CODE" className="h-8 max-w-40 font-mono" aria-label="Code" />
      <PromoFieldsEditor draft={draft} setDraft={setDraft} pricing={pricing} />
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={create.isPending}>
          Cancel
        </Button>
        <Button size="sm" onClick={submit} disabled={!parsed || !codeValid || create.isPending}>
          {create.isPending && <Loader2 className="size-3.5 animate-spin" />}
          Create
        </Button>
      </div>
    </div>
  )
}

/**
 * One tenant's promo codes: what a client in that tenant can enter when buying a chat-credit top-up. A code only applies when its currency
 * matches the pack's. Codes are never deleted (past payments name them), only turned off.
 */
export function ClientPromosCard({ pricing }: { pricing: ClientPricing }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-xs">{pricing.code}</span>
          Client app · promo codes
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <p className="text-muted-foreground">Money off a chat-credit top-up, for clients in {pricing.name}, in the packs&apos; currency. Uses count paid payments (old case payments included) and ones still at checkout.</p>
        {pricing.promos.length === 0 && <p className="text-muted-foreground text-sm">No promo codes yet.</p>}
        {pricing.promos.map((promo) => (
          <PromoRow key={promo.id} pricing={pricing} promo={promo} />
        ))}
      </CardContent>
      <Separator />
      <CardFooter className="pt-4">
        <AddPromoRow pricing={pricing} />
      </CardFooter>
    </Card>
  )
}
