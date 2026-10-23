"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  type SubscriptionPlan,
  type TenantSettings,
  useUpdateAccountTopUpFeeMutation,
  useUpdateSubscriptionPlanMutation,
} from "@/lib/settings/queries"

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

const DEFAULT_PLAN: SubscriptionPlan = { name: "Standard", monthlyPriceUsd: 49, includedAllowanceUsd: 20 }

/**
 * Per-tenant billing settings for the account-wide AI allowance: the subscription plan (a
 * placeholder monthly price — not yet charged via recurring Stripe billing — and the AI usage it
 * includes), and the platform fee a lawyer sees added on top of their chosen top-up amount at
 * Stripe checkout (AccountTopUpBillingSvc.quote) when they exceed it. The account's own
 * cumulative spend is never shown here or anywhere else (AccountLimitsSvc) — only the lawyer's own
 * remaining balance and percentage used, on their side of the app.
 */
export function AccountTopUpPricingCard({ tenant }: { tenant: TenantSettings }) {
  const pricing = tenant.accountTopUp
  const feeMutation = useUpdateAccountTopUpFeeMutation()
  const planMutation = useUpdateSubscriptionPlanMutation()

  // Seeded once from the server value at mount — not kept in sync by an effect. The parent remounts
  // this card (via `key`, keyed on feeUpdatedAt/planUpdatedAt) whenever the server value actually
  // changes, which re-seeds these naturally; a save-in-flight is never clobbered, since nothing
  // changes the key until that save's own invalidation lands the new value.
  const [feeType, setFeeType] = useState<"FIXED" | "PERCENT">(pricing?.feeType ?? "FIXED")
  const [feeAmount, setFeeAmount] = useState(String(pricing?.feeAmount ?? ""))
  const [planName, setPlanName] = useState(pricing?.plan.name ?? DEFAULT_PLAN.name)
  const [monthlyPrice, setMonthlyPrice] = useState(String(pricing?.plan.monthlyPriceUsd ?? DEFAULT_PLAN.monthlyPriceUsd))
  const [includedAllowance, setIncludedAllowance] = useState(String(pricing?.plan.includedAllowanceUsd ?? DEFAULT_PLAN.includedAllowanceUsd))

  const parsedFee = Number(feeAmount)
  const feeValid = feeAmount.trim() !== "" && Number.isFinite(parsedFee) && parsedFee >= 0 && (feeType !== "PERCENT" || parsedFee <= 100)
  const feeDirty = !pricing || feeType !== pricing.feeType || parsedFee !== pricing.feeAmount

  const parsedPrice = Number(monthlyPrice)
  const parsedAllowance = Number(includedAllowance)
  const planValid = planName.trim() !== "" && Number.isFinite(parsedPrice) && parsedPrice >= 0 && Number.isFinite(parsedAllowance) && parsedAllowance >= 0
  const planDirty =
    !pricing || planName.trim() !== pricing.plan.name || parsedPrice !== pricing.plan.monthlyPriceUsd || parsedAllowance !== pricing.plan.includedAllowanceUsd

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

  function savePlan() {
    if (!planValid) return
    planMutation.mutate(
      { code: tenant.code, plan: { name: planName.trim(), monthlyPriceUsd: parsedPrice, includedAllowanceUsd: parsedAllowance } },
      {
        onSuccess: () => toast.success(`Subscription plan saved for ${tenant.name}`),
        onError: (err) => toast.error((err as Error).message),
      }
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-xs">{tenant.code}</span>
          AI billing
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div>
            <p className="font-medium">Subscription plan</p>
            <p className="text-muted-foreground">
              A placeholder monthly price (not yet charged automatically) and the AI usage it includes for the whole
              account — replaces billing cases individually.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`plan-name-${tenant.code}`}>Plan name</Label>
            <Input id={`plan-name-${tenant.code}`} value={planName} onChange={(e) => setPlanName(e.target.value)} className="max-w-56" />
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor={`plan-price-${tenant.code}`}>Monthly price (USD, placeholder)</Label>
              <Input
                id={`plan-price-${tenant.code}`}
                type="number"
                min={0}
                step="0.01"
                value={monthlyPrice}
                onChange={(e) => setMonthlyPrice(e.target.value)}
                className="max-w-40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`plan-allowance-${tenant.code}`}>Included AI usage (USD)</Label>
              <Input
                id={`plan-allowance-${tenant.code}`}
                type="number"
                min={0}
                step="0.01"
                value={includedAllowance}
                onChange={(e) => setIncludedAllowance(e.target.value)}
                className="max-w-40"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground text-xs">
              {pricing?.planUpdatedAt
                ? `Last changed by ${pricing.planUpdatedBy?.name ?? pricing.planUpdatedBy?.email ?? "a deleted admin"} · ${formatDateTime(pricing.planUpdatedAt)}`
                : "Never changed · a default plan applies until saved"}
            </span>
            <Button size="sm" onClick={savePlan} disabled={!planValid || !planDirty || planMutation.isPending}>
              {planMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
              {planMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-3">
          <div>
            <p className="font-medium">Top-up fee</p>
            <p className="text-muted-foreground">
              Added on top of the amount a lawyer chooses to top up their account (shown to them at checkout, like a
              payment processing fee).
            </p>
          </div>
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
