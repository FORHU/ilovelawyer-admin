"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ConfirmPriceDialog } from "@/components/settings/confirm-price-dialog"
import { CreditsField, validCredits } from "@/components/settings/client-pricing-fields"
import { type ClientPricing, type ClientPrice, lastChanged, useUpdateClientCaseMutation } from "@/lib/settings/client-pricing"

/**
 * How many chat credits a new case starts with in the client app. Cases are free; clients pay only
 * for top-ups. A new value applies to cases made from about a minute after saving.
 */
export function ClientCasePricingCard({ pricing, row }: { pricing: ClientPricing; row: ClientPrice }) {
  // Seeded once at mount; the parent remounts this card (keyed on updatedAt) when the server value
  // changes — same convention as AccountTopUpPricingCard.
  const [credits, setCredits] = useState(String(row.credits))
  const [confirming, setConfirming] = useState(false)
  const mutation = useUpdateClientCaseMutation()

  const valid = validCredits(credits)
  const dirty = Number(credits) !== row.credits

  function save() {
    if (!valid) return
    mutation.mutate(
      { code: pricing.code, patch: { credits: Number(credits) } },
      {
        onSuccess: () => {
          setConfirming(false)
          toast.success("New-case credits saved")
        },
        onError: (err) => toast.error((err as Error).message),
      }
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-xs">{pricing.code}</span>
          Client app · new case credits
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-muted-foreground">Cases are free. These are the chat credits each new case in {pricing.name} starts with; clients top up for more.</p>
        <div className="flex flex-wrap gap-4">
          <CreditsField value={credits} onChange={setCredits} />
        </div>
        <span className="text-muted-foreground text-xs">{lastChanged(row)}</span>
      </CardContent>
      <CardFooter>
        <Button size="sm" onClick={() => setConfirming(true)} disabled={!valid || !dirty || mutation.isPending}>
          Save
        </Button>
      </CardFooter>
      <ConfirmPriceDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Change new-case credits for ${pricing.name}?`}
        preview={
          <div className="rounded-md border p-3 text-left text-sm">
            Each new case starts with <span className="font-semibold">{valid ? credits : "…"} chat credits</span>.
          </div>
        }
        note={`Now ${row.credits} credits.`}
        confirmLabel="Save"
        pending={mutation.isPending}
        onConfirm={save}
      />
    </Card>
  )
}
