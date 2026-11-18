"use client"

import { useState } from "react"
import { Coins, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { formatMoney, inputToMinor } from "@/components/billing/format"
import { FeeField } from "@/components/settings/payment-plans-card"
import { type PlanCurrency, type PlanCurrencyOption, type TenantSettings, useChangePlanCurrencyMutation } from "@/lib/settings/queries"

/**
 * The currency one site's lawyers are charged in: their plan and their account AI top-up. It starts
 * as the site's local currency (pesos on PH, won on KR, US dollars on UK) and an admin can move it.
 * A currency change reprices every tier at once (PaymentPlanSvc.changeCurrency), so picking another
 * currency asks for each tier's price in it, hidden tiers included: a site never mixes currencies.
 *
 * The API refuses while a lawyer on the site has a live subscription (Stripe can't move a
 * subscription to another currency); its message is shown here as it comes.
 */
export function SiteCurrencyCard({ tenant, currencies }: { tenant: TenantSettings; currencies: PlanCurrencyOption[] }) {
  const current = tenant.planCurrency
  const [target, setTarget] = useState<PlanCurrency>(current)
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [refusal, setRefusal] = useState<string | null>(null)
  const mutation = useChangePlanCurrencyMutation()

  const tiers = [...tenant.paymentPlans].sort((a, b) => a.level - b.level)
  const option = currencies.find((c) => c.code === target)
  const switching = target !== current
  const parsed = tiers.map((t) => {
    const minor = inputToMinor(prices[t.id] ?? "", target)
    return { planId: t.id, priceMinor: minor, valid: minor !== null && (!option || minor <= option.maxMinor) }
  })
  const valid = switching && tiers.length > 0 && parsed.every((p) => p.valid)

  function pick(code: PlanCurrency) {
    setTarget(code)
    setPrices({})
    setRefusal(null)
  }

  function save() {
    if (!valid) return
    setRefusal(null)
    mutation.mutate(
      { code: tenant.code, currency: target, prices: parsed.map((p) => ({ planId: p.planId, priceMinor: p.priceMinor! })) },
      {
        onSuccess: (result) => {
          const closed = result.checkoutsClosed ? ` ${result.checkoutsClosed} open checkout${result.checkoutsClosed === 1 ? " was" : "s were"} closed.` : ""
          toast.success(`${tenant.name} now charges lawyers in ${result.currency}.${closed}`)
        },
        onError: (err) => setRefusal((err as Error).message),
      }
    )
  }

  const label = (code: PlanCurrency) => (code === tenant.defaultPlanCurrency ? `${code} (local currency)` : code)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="size-4" />
          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-xs">{tenant.code}</span>
          Lawyer currency
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`plan-currency-${tenant.code}`}>Currency</Label>
          <select
            id={`plan-currency-${tenant.code}`}
            value={target}
            onChange={(e) => pick(e.target.value as PlanCurrency)}
            disabled={mutation.isPending}
            className="border-input bg-background h-9 w-56 rounded-md border px-2 text-sm"
          >
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {label(c.code)}
              </option>
            ))}
          </select>
          <span className="text-muted-foreground text-xs">
            {current === tenant.defaultPlanCurrency
              ? `Lawyers pay in ${current}, ${tenant.name}'s local currency.`
              : `Lawyers pay in ${current}. ${tenant.name}'s local currency is ${tenant.defaultPlanCurrency}.`}
          </span>
        </div>

        {switching && (
          <div className="flex flex-col gap-3 rounded-md border border-dashed p-3">
            <p className="text-sm">
              Price every tier in {target}. They all change at once{tiers.some((t) => !t.isActive) ? ", hidden ones included" : ""}.
            </p>
            {tiers.length === 0 && <p className="text-muted-foreground text-sm">This site has no tiers yet.</p>}
            <div className="flex flex-col gap-2">
              {tiers.map((t) => (
                <div key={t.id} className="flex flex-wrap items-start gap-4">
                  <div className="flex w-40 flex-col gap-1 pt-5">
                    <span className="text-sm font-medium">{t.name}</span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      Now {formatMoney({ amountMinor: t.priceMinor, currency: t.currency })}
                      {!t.isActive && (
                        <Badge variant="outline" className="ml-1">
                          Hidden
                        </Badge>
                      )}
                    </span>
                  </div>
                  <FeeField currency={target} value={prices[t.id] ?? ""} onChange={(value) => setPrices((p) => ({ ...p, [t.id]: value }))} />
                </div>
              ))}
            </div>
            <ul className="text-muted-foreground list-disc pl-5 text-xs">
              <li>New checkouts charge the new prices in {target}. A checkout a lawyer has open now is closed, and they choose their plan again.</li>
              <li>Account AI top-ups switch to {target} too. The top-up fee (if it&apos;s a fixed amount) and the exchange rate go back to {target} defaults; set them below.</li>
              <li>Not possible while a lawyer on this site has a live subscription: Stripe can&apos;t move a subscription to another currency.</li>
            </ul>
            {refusal && <p className="text-destructive text-sm">{refusal}</p>}
          </div>
        )}
      </CardContent>
      {switching && (
        <CardFooter className="justify-end gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => pick(current)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={!valid || mutation.isPending}>
            {mutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
            Switch to {target}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
