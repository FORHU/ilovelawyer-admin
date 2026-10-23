"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { type TenantSettings, useUpdateAccountTopUpFeeMutation } from "@/lib/settings/queries"

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
 * allowance. Per-tenant tiers themselves (fee/allowance/case-limit) live in PaymentPlansCard —
 * this card is only the top-up overage fee, a separate concept.
 */
export function AccountTopUpPricingCard({ tenant }: { tenant: TenantSettings }) {
  const pricing = tenant.accountTopUp
  const feeMutation = useUpdateAccountTopUpFeeMutation()

  // Seeded once from the server value at mount — not kept in sync by an effect. The parent remounts
  // this card (via `key`, keyed on feeUpdatedAt) whenever the server value actually changes, which
  // re-seeds these naturally; a save-in-flight is never clobbered, since nothing changes the key
  // until that save's own invalidation lands the new value.
  const [feeType, setFeeType] = useState<"FIXED" | "PERCENT">(pricing?.feeType ?? "FIXED")
  const [feeAmount, setFeeAmount] = useState(String(pricing?.feeAmount ?? ""))

  const parsedFee = Number(feeAmount)
  const feeValid = feeAmount.trim() !== "" && Number.isFinite(parsedFee) && parsedFee >= 0 && (feeType !== "PERCENT" || parsedFee <= 100)
  const feeDirty = !pricing || feeType !== pricing.feeType || parsedFee !== pricing.feeAmount

  function saveFee() {
    if (!feeValid) return
    feeMutation.mutate(
      { code: tenant.code, feeType, feeAmount: parsedFee },
      {
        onSuccess: () => toast.success(`Top-up fee saved for ${tenant.name}`),
        onError: (err) => toast.error((err as Error).message),
      }
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-xs">{tenant.code}</span>
          Top-up fee
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground">
            Added on top of the amount a lawyer chooses to top up their account past their plan&apos;s AI allowance
            (shown to them at checkout, like a payment processing fee).
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant={feeType === "FIXED" ? "default" : "outline"} onClick={() => setFeeType("FIXED")}>
              Fixed $
            </Button>
            <Button type="button" size="sm" variant={feeType === "PERCENT" ? "default" : "outline"} onClick={() => setFeeType("PERCENT")}>
              Percentage %
            </Button>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`account-topup-fee-${tenant.code}`}>{feeType === "FIXED" ? "Fee (USD)" : "Fee (% of top-up amount)"}</Label>
            <Input
              id={`account-topup-fee-${tenant.code}`}
              type="number"
              min={0}
              max={feeType === "PERCENT" ? 100 : undefined}
              step="0.01"
              value={feeAmount}
              onChange={(e) => setFeeAmount(e.target.value)}
              aria-invalid={feeAmount.trim() !== "" && !feeValid}
              className="max-w-40"
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-4 border-t text-xs">
        <span className="text-muted-foreground">
          {pricing?.feeUpdatedAt
            ? `Last changed by ${pricing.feeUpdatedBy?.name ?? pricing.feeUpdatedBy?.email ?? "a deleted admin"} · ${formatDateTime(pricing.feeUpdatedAt)}`
            : "Never changed · a default fee applies until saved"}
        </span>
        <Button size="sm" onClick={saveFee} disabled={!feeValid || !feeDirty || feeMutation.isPending}>
          {feeMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
          {feeMutation.isPending ? "Saving…" : "Save"}
        </Button>
      </CardFooter>
    </Card>
  )
}
