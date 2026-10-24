"use client"

import { useState } from "react"
import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Plus, Star } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { AmountField, CreditsField, CurrencySelect, validCredits } from "@/components/settings/client-pricing-fields"
import {
  type ClientPrice,
  type ClientPricing,
  lastChanged,
  priceInRange,
  toMajor,
  toMinor,
  useCreateClientPackMutation,
  useSetDefaultClientPackMutation,
  useUpdateClientPackMutation,
} from "@/lib/settings/client-pricing"

interface Draft {
  name: string
  price: string
  credits: string
  currency: string
}

function useParsed(draft: Draft, pricing: ClientPricing) {
  const currency = pricing.currencies.find((c) => c.code === draft.currency)
  const priceMinor = toMinor(draft.price, currency)
  return { priceMinor, valid: draft.name.trim() !== "" && priceInRange(priceMinor, currency) && validCredits(draft.credits), currency }
}

const onError = (err: unknown) => toast.error((err as Error).message)

function PackRow({ pricing, pack, above, below }: { pricing: ClientPricing; pack: ClientPrice; above?: ClientPrice; below?: ClientPrice }) {
  const currency = pricing.currencies.find((c) => c.code === pack.currency)
  const [draft, setDraft] = useState<Draft>(() => ({ name: pack.name, price: toMajor(pack.priceMinor, currency), credits: String(pack.credits), currency: pack.currency }))
  const update = useUpdateClientPackMutation()
  const setDefault = useSetDefaultClientPackMutation()
  const parsed = useParsed(draft, pricing)
  const dirty = draft.name !== pack.name || parsed.priceMinor !== pack.priceMinor || Number(draft.credits) !== pack.credits || draft.currency !== pack.currency
  const busy = update.isPending || setDefault.isPending

  function save() {
    if (!parsed.valid) return
    update.mutate(
      { id: pack.id, patch: { name: draft.name.trim(), priceMinor: parsed.priceMinor, credits: Number(draft.credits), currency: draft.currency } },
      { onSuccess: () => toast.success(`${draft.name.trim()} saved`), onError }
    )
  }

  /** Swaps this pack's place with its neighbour's. */
  async function move(other: ClientPrice) {
    try {
      await update.mutateAsync({ id: pack.id, patch: { level: other.level } })
      await update.mutateAsync({ id: other.id, patch: { level: pack.level } })
    } catch (err) {
      onError(err)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} className="h-8 max-w-40 font-medium" aria-label="Pack name" />
          <span className="text-muted-foreground font-mono text-xs">{pack.code}</span>
          {pack.isDefault && <Badge>Default</Badge>}
          {!pack.isActive && <Badge variant="outline">Hidden from clients</Badge>}
        </div>
        <div className="flex items-center">
          <Button type="button" size="icon" variant="ghost" disabled={busy || !above} onClick={() => above && move(above)} title="Move up">
            <ArrowUp className="size-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" disabled={busy || !below} onClick={() => below && move(below)} title="Move down">
            <ArrowDown className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={busy || pack.isDefault || !pack.isActive}
            onClick={() => setDefault.mutate(pack.id, { onSuccess: () => toast.success(`${pack.name} is now the default pack`), onError })}
            title="Make the default pack"
          >
            <Star className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={busy || pack.isDefault}
            onClick={() =>
              update.mutate(
                { id: pack.id, patch: { isActive: !pack.isActive } },
                { onSuccess: () => toast.success(pack.isActive ? `${pack.name} hidden from clients` : `${pack.name} shown to clients`), onError }
              )
            }
            title={pack.isDefault ? "Make another pack the default before hiding this one" : pack.isActive ? "Hide from clients" : "Show to clients"}
          >
            {pack.isActive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <CurrencySelect value={draft.currency} currencies={pricing.currencies} onChange={(currency) => setDraft((d) => ({ ...d, currency }))} />
        <AmountField label="Price" value={draft.price} currency={parsed.currency} onChange={(price) => setDraft((d) => ({ ...d, price }))} />
        <CreditsField value={draft.credits} onChange={(credits) => setDraft((d) => ({ ...d, credits }))} />
        <div className="ml-auto flex items-end">
          <Button size="sm" onClick={save} disabled={!parsed.valid || !dirty || busy}>
            {update.isPending && <Loader2 className="size-3.5 animate-spin" />}
            Save
          </Button>
        </div>
      </div>
      <span className="text-muted-foreground text-xs">{lastChanged(pack)}</span>
    </div>
  )
}

function AddPackRow({ pricing }: { pricing: ClientPricing }) {
  const empty: Draft = { name: "", price: "", credits: "", currency: pricing.case?.currency ?? pricing.currencies[0]?.code ?? "USD" }
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(empty)
  const create = useCreateClientPackMutation()
  const parsed = useParsed(draft, pricing)

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} className="self-start">
        <Plus className="size-3.5" />
        Add pack
      </Button>
    )
  }

  function submit() {
    if (!parsed.valid) return
    // The code is what the client app sends back to buy the pack; derived once, never edited.
    const code = `p${draft.credits}-${draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`.slice(0, 32)
    create.mutate(
      { tenant: pricing.code, pack: { code, name: draft.name.trim(), priceMinor: parsed.priceMinor, credits: Number(draft.credits), currency: draft.currency } },
      {
        onSuccess: () => {
          toast.success(`${draft.name.trim()} created`)
          setDraft(empty)
          setOpen(false)
        },
        onError,
      }
    )
  }

  return (
    <div className="flex w-full flex-col gap-3 rounded-md border border-dashed p-3">
      <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Pack name" className="h-8 max-w-40" />
      <div className="flex flex-wrap gap-4">
        <CurrencySelect value={draft.currency} currencies={pricing.currencies} onChange={(currency) => setDraft((d) => ({ ...d, currency }))} />
        <AmountField label="Price" value={draft.price} currency={parsed.currency} onChange={(price) => setDraft((d) => ({ ...d, price }))} />
        <CreditsField value={draft.credits} onChange={(credits) => setDraft((d) => ({ ...d, credits }))} />
        <div className="ml-auto flex items-end gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={create.isPending}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={!parsed.valid || create.isPending}>
            {create.isPending && <Loader2 className="size-3.5 animate-spin" />}
            Create
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * The chat-credit packs a client can buy on a case, in the order the client app lists them. One is
 * the default (preselected); it can't be hidden until another pack takes its place. Packs are never
 * deleted, only hidden — past top-ups name them.
 */
export function ClientTopUpPacksCard({ pricing }: { pricing: ClientPricing }) {
  const packs = [...pricing.packs].sort((a, b) => a.level - b.level)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-xs">{pricing.code}</span>
          Client app · top-up packs
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <p className="text-muted-foreground">Extra chat credits a client can buy for a case. The starred pack is preselected.</p>
        {packs.length === 0 && <p className="text-muted-foreground text-sm">No packs yet.</p>}
        {packs.map((pack, i) => (
          <PackRow key={pack.id} pricing={pricing} pack={pack} above={packs[i - 1]} below={packs[i + 1]} />
        ))}
      </CardContent>
      <Separator />
      <CardFooter className="pt-4">
        <AddPackRow pricing={pricing} />
      </CardFooter>
    </Card>
  )
}
