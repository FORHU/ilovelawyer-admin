"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AmountField, CreditsField, CurrencySelect, validCredits } from "@/components/settings/client-pricing-fields"
import { type ClientPricing, type ClientPrice, lastChanged, priceInRange, toMajor, toMinor, useUpdateClientCaseMutation } from "@/lib/settings/client-pricing"

/**
 * What one new case costs a client in the client app, and how many chat credits it comes with.
 * Reaches checkout within about a minute of saving; a client already part-way through paying keeps
 * the price they were shown.
 */
export function ClientCasePricingCard({ pricing, row }: { pricing: ClientPricing; row: ClientPrice }) {
  // Seeded once at mount; the parent remounts this card (keyed on updatedAt) when the server value
  // changes — same convention as AccountTopUpPricingCard.
  const [currencyCode, setCurrencyCode] = useState(row.currency)
  const currency = pricing.currencies.find((c) => c.code === currencyCode)
  const [price, setPrice] = useState(() => toMajor(row.priceMinor, currency))
  const [credits, setCredits] = useState(String(row.credits))
  const mutation = useUpdateClientCaseMutation()

  const priceMinor = toMinor(price, currency)
  const valid = priceInRange(priceMinor, currency) && validCredits(credits)
  const dirty = priceMinor !== row.priceMinor || Number(credits) !== row.credits || currencyCode !== row.currency

  function save() {
    if (!valid) return
    mutation.mutate(
      { code: pricing.code, patch: { priceMinor, credits: Number(credits), currency: currencyCode } },
      { onSuccess: () => toast.success("Case price saved"), onError: (err) => toast.error((err as Error).message) }
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-xs">{pricing.code}</span>
          Client app · case price
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-muted-foreground">What a client in {pricing.name} pays for each new case, and the chat credits it includes. 0 makes cases free.</p>
        <div className="flex flex-wrap gap-4">
          <CurrencySelect value={currencyCode} currencies={pricing.currencies} onChange={setCurrencyCode} />
          <AmountField label="Price" value={price} currency={currency} onChange={setPrice} />
          <CreditsField value={credits} onChange={setCredits} />
        </div>
        <span className="text-muted-foreground text-xs">{lastChanged(row)}</span>
      </CardContent>
      <CardFooter>
        <Button size="sm" onClick={save} disabled={!valid || !dirty || mutation.isPending}>
          {mutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
          Save
        </Button>
      </CardFooter>
    </Card>
  )
}
