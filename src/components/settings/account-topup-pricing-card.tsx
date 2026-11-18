"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { currencyDecimals } from "@/components/billing/format"
import { type TenantSettings, useUpdateAccountTopUpFeeMutation } from "@/lib/settings/queries"

/** Who last changed the fee or the rate, whichever is later. */
function lastChange(pricing: TenantSettings["accountTopUp"]): string {
  const changes = [
    { at: pricing?.feeUpdatedAt, by: pricing?.feeUpdatedBy },
    { at: pricing?.rateUpdatedAt, by: pricing?.rateUpdatedBy },
  ].filter((c): c is { at: string; by: { name: string | null; email: string } | null | undefined } => !!c.at)
  if (changes.length === 0) return "Never changed · defaults apply until saved"
  const latest = changes.sort((a, b) => b.at.localeCompare(a.at))[0]
  return `Last changed by ${latest.by?.name ?? latest.by?.email ?? "a deleted admin"} · ${formatDateTime(latest.at)}`
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

/**
 * The platform fee a lawyer sees added on top of their chosen top-up amount at Stripe checkout
 * (AccountTopUpBillingSvc.quote) when they exceed their subscription tier's included AI
 * allowance, in the site's currency (won on KR). On a site that doesn't charge in dollars, also the
 * rate that turns what the lawyer pays into dollars of AI usage, which is how the app counts it.
 * Per-tenant tiers themselves (fee/allowance/case-limit) live in PaymentPlansCard — this card is
 * only the top-up, a separate concept.
 */
export function AccountTopUpPricingCard({ tenant }: { tenant: TenantSettings }) {
  const pricing = tenant.accountTopUp
  const currency = pricing?.currency ?? "USD"
  const wholeUnits = currencyDecimals(currency) === 0
  const hasRate = pricing?.perUsd != null
  const feeMutation = useUpdateAccountTopUpFeeMutation()

  // Seeded once from the server value at mount — not kept in sync by an effect. The parent remounts
  // this card (via `key`, keyed on feeUpdatedAt) whenever the server value actually changes, which
  // re-seeds these naturally; a save-in-flight is never clobbered, since nothing changes the key
  // until that save's own invalidation lands the new value.
  const [feeType, setFeeType] = useState<"FIXED" | "PERCENT">(pricing?.feeType ?? "FIXED")
  const [feeAmount, setFeeAmount] = useState(String(pricing?.feeAmount ?? ""))
  const [perUsd, setPerUsd] = useState(String(pricing?.perUsd ?? ""))

  const parsedFee = Number(feeAmount)
  const feeValid =
    feeAmount.trim() !== "" &&
    Number.isFinite(parsedFee) &&
    parsedFee >= 0 &&
    (feeType !== "PERCENT" || parsedFee <= 100) &&
    // No part of a won.
    (feeType !== "FIXED" || !wholeUnits || Number.isInteger(parsedFee))
  const parsedRate = Number(perUsd)
  const rateValid = !hasRate || (perUsd.trim() !== "" && Number.isFinite(parsedRate) && parsedRate > 0)
  const dirty = !pricing || feeType !== pricing.feeType || parsedFee !== pricing.feeAmount || (hasRate && parsedRate !== pricing.perUsd)
  const valid = feeValid && rateValid


  function saveFee() {
    if (!valid) return
    feeMutation.mutate(
      { code: tenant.code, feeType, feeAmount: parsedFee, ...(hasRate ? { perUsd: parsedRate } : {}) },
      {
        onSuccess: () => toast.success(`Top-up settings saved for ${tenant.name}`),
        onError: (err) => toast.error((err as Error).message),
      }
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-xs">{tenant.code}</span>
          Account AI top-up
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground">
            Lawyers top up in {currency}. The fee is added on top of the amount a lawyer chooses to top up their account
            past their plan&apos;s AI allowance (shown to them at checkout, like a payment processing fee).
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant={feeType === "FIXED" ? "default" : "outline"} onClick={() => setFeeType("FIXED")}>
              Fixed {currency === "USD" ? "$" : currency}
            </Button>
            <Button type="button" size="sm" variant={feeType === "PERCENT" ? "default" : "outline"} onClick={() => setFeeType("PERCENT")}>
              Percentage %
            </Button>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`account-topup-fee-${tenant.code}`}>{feeType === "FIXED" ? `Fee (${currency})` : "Fee (% of top-up amount)"}</Label>
            <Input
              id={`account-topup-fee-${tenant.code}`}
              type="number"
              min={0}
              max={feeType === "PERCENT" ? 100 : undefined}
              step={feeType === "FIXED" && wholeUnits ? "1" : "0.01"}
              value={feeAmount}
              onChange={(e) => setFeeAmount(e.target.value)}
              aria-invalid={feeAmount.trim() !== "" && !feeValid}
              className="max-w-40"
            />
          </div>
          {hasRate && (
            <div className="flex flex-col gap-1">
              <Label htmlFor={`account-topup-rate-${tenant.code}`}>Exchange rate for AI costs ({currency})</Label>
              <Input
                id={`account-topup-rate-${tenant.code}`}
                type="number"
                min={0}
                step="any"
                value={perUsd}
                onChange={(e) => setPerUsd(e.target.value)}
                aria-invalid={perUsd.trim() !== "" && !rateValid}
                className="max-w-40"
              />
              <span className="text-muted-foreground text-xs">
                AI providers bill ilovelawyer in US dollars; this is what each dollar of that cost is worth in {currency}. It turns top-ups and the
                plans&apos; AI allowances into AI usage, so changing it changes the {currency} shown for each allowance. A new rate reaches the next
                top-up.
              </span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-4 border-t text-xs">
        <span className="text-muted-foreground">
          {lastChange(pricing)}
        </span>
        <Button size="sm" onClick={saveFee} disabled={!valid || !dirty || feeMutation.isPending}>
          {feeMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
          {feeMutation.isPending ? "Saving…" : "Save"}
        </Button>
      </CardFooter>
    </Card>
  )
}
