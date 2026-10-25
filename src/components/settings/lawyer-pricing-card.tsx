"use client"

import { useState } from "react"
import { Eye, EyeOff, Loader2, Plus } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { AmountField } from "@/components/settings/client-pricing-fields"
import { type ClientCurrency, lastChanged, toMajor, toMinor } from "@/lib/settings/client-pricing"
import {
  type LawyerPrice,
  type LawyerTenantPricing,
  lawyerAmountInRange,
  useCreateLawyerPackMutation,
  useUpdateLawyerIntroFeeMutation,
  useUpdateLawyerPackMutation,
} from "@/lib/settings/lawyer-pricing"

const onError = (err: unknown) => toast.error((err as Error).message)

/** What a client confirming a lawyer charges the lawyer's card. A charge already made keeps the
 * amount it was charged; the next confirmation pays the new one. */
function IntroFee({ tenant, fee, currency }: { tenant: LawyerTenantPricing; fee: LawyerPrice; currency: ClientCurrency }) {
  const [price, setPrice] = useState(() => toMajor(fee.priceMinor, currency))
  const mutation = useUpdateLawyerIntroFeeMutation()
  const priceMinor = toMinor(price, currency)
  const valid = lawyerAmountInRange(priceMinor, currency)

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground">
        What a lawyer in {tenant.name} pays when a client confirms them. It also comes with the engagement&apos;s included AI budget.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <AmountField label={`Introduction fee (${currency.code})`} value={price} currency={currency} onChange={setPrice} allowZero={false} />
        <Button
          size="sm"
          disabled={!valid || priceMinor === fee.priceMinor || mutation.isPending}
          onClick={() =>
            mutation.mutate({ tenant: tenant.code, priceMinor }, { onSuccess: () => toast.success("Introduction fee saved"), onError })
          }
        >
          {mutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
          Save
        </Button>
      </div>
      <span className="text-muted-foreground text-xs">{lastChanged(fee)}</span>
    </div>
  )
}

interface PackDraft {
  name: string
  price: string
  credit: string
}

function parsePack(draft: PackDraft, currency: ClientCurrency) {
  const priceMinor = toMinor(draft.price, currency)
  const creditMinor = toMinor(draft.credit, currency)
  const valid = draft.name.trim() !== "" && lawyerAmountInRange(priceMinor, currency) && lawyerAmountInRange(creditMinor, currency)
  return { priceMinor, creditMinor, valid }
}

function PackFields({ draft, currency, onChange }: { draft: PackDraft; currency: ClientCurrency; onChange: (draft: PackDraft) => void }) {
  return (
    <div className="flex flex-wrap gap-4">
      <AmountField label="Price" value={draft.price} currency={currency} onChange={(price) => onChange({ ...draft, price })} allowZero={false} />
      <AmountField label="AI credit" value={draft.credit} currency={currency} onChange={(credit) => onChange({ ...draft, credit })} allowZero={false} />
    </div>
  )
}

function PackRow({ pack, currency }: { pack: LawyerPrice; currency: ClientCurrency }) {
  const [draft, setDraft] = useState<PackDraft>(() => ({
    name: pack.name,
    price: toMajor(pack.priceMinor, currency),
    credit: toMajor(pack.creditMinor ?? 0, currency),
  }))
  const update = useUpdateLawyerPackMutation()
  const parsed = parsePack(draft, currency)
  const dirty = draft.name !== pack.name || parsed.priceMinor !== pack.priceMinor || parsed.creditMinor !== pack.creditMinor

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} className="h-8 max-w-40 font-medium" aria-label="Pack name" />
          <span className="text-muted-foreground font-mono text-xs">{pack.code}</span>
          {!pack.isActive && <Badge variant="outline">Hidden from lawyers</Badge>}
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={update.isPending}
          title={pack.isActive ? "Hide from lawyers" : "Offer to lawyers"}
          onClick={() => update.mutate({ id: pack.id, patch: { isActive: !pack.isActive } }, { onError })}
        >
          {pack.isActive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
      </div>
      <PackFields draft={draft} currency={currency} onChange={setDraft} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-xs">{lastChanged(pack)}</span>
        <Button
          size="sm"
          disabled={!parsed.valid || !dirty || update.isPending}
          onClick={() =>
            update.mutate(
              { id: pack.id, patch: { name: draft.name.trim(), priceMinor: parsed.priceMinor, creditMinor: parsed.creditMinor } },
              { onSuccess: () => toast.success(`${draft.name.trim()} saved`), onError }
            )
          }
        >
          {update.isPending && <Loader2 className="size-3.5 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  )
}

function NewPack({ tenant, currency }: { tenant: LawyerTenantPricing; currency: ClientCurrency }) {
  const [code, setCode] = useState("")
  const [draft, setDraft] = useState<PackDraft>({ name: "", price: "", credit: "" })
  const create = useCreateLawyerPackMutation()
  const parsed = parsePack(draft, currency)
  const validCode = /^[a-z0-9][a-z0-9_-]{0,31}$/.test(code.trim().toLowerCase())

  return (
    <div className="flex flex-col gap-3 rounded-md border border-dashed p-3">
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Code</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="small" className="h-8 w-28 font-mono" />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Name</Label>
          <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Small" className="h-8 w-36" />
        </div>
      </div>
      <PackFields draft={draft} currency={currency} onChange={setDraft} />
      <Button
        size="sm"
        variant="outline"
        className="self-start"
        disabled={!validCode || !parsed.valid || create.isPending}
        onClick={() =>
          create.mutate(
            { tenant: tenant.code, pack: { code: code.trim().toLowerCase(), name: draft.name.trim(), priceMinor: parsed.priceMinor, creditMinor: parsed.creditMinor } },
            {
              onSuccess: () => {
                toast.success(`${draft.name.trim()} added`)
                setCode("")
                setDraft({ name: "", price: "", credit: "" })
              },
              onError,
            }
          )
        }
      >
        {create.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
        Add pack
      </Button>
    </div>
  )
}

/**
 * What lawyers in one tenant pay in the client hand-off (ilovelawyer-api#598): the introduction fee,
 * and the AI top-up packs an engaged lawyer can buy. Changes reach the next confirmation or top-up
 * within about a minute; a charge already made keeps its amount.
 */
export function LawyerPricingCard({ tenant, currency }: { tenant: LawyerTenantPricing; currency: ClientCurrency }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-xs">{tenant.code}</span>
          Lawyer fees
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {tenant.introFee ? (
          <IntroFee key={tenant.introFee.updatedAt} tenant={tenant} fee={tenant.introFee} currency={currency} />
        ) : (
          <p className="text-destructive text-sm">{tenant.code} has no introduction fee. Run the API&apos;s migrations or tenant seeder.</p>
        )}
        <Separator />
        <div className="flex flex-col gap-2">
          <p className="font-medium">AI top-up packs</p>
          <p className="text-muted-foreground">
            What an engaged lawyer pays for more AI on a client&apos;s case, and the AI credit it adds. Hidden packs can&apos;t be bought.
          </p>
          {tenant.packs.map((pack) => (
            <PackRow key={`${pack.id}-${pack.updatedAt}`} pack={pack} currency={currency} />
          ))}
          <NewPack tenant={tenant} currency={currency} />
        </div>
      </CardContent>
    </Card>
  )
}
