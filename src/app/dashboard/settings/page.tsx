"use client"

import { TenantSettingsCard } from "@/components/settings/tenant-settings-card"
import { AccountTopUpPricingCard } from "@/components/settings/account-topup-pricing-card"
import { PaymentPlansCard } from "@/components/settings/payment-plans-card"
import { ClientCasePricingCard } from "@/components/settings/client-case-pricing-card"
import { ClientTopUpPacksCard } from "@/components/settings/client-topup-packs-card"
import { ClientPromosCard } from "@/components/settings/client-promos-card"
import { useAdminSettingsQuery } from "@/lib/settings/queries"
import { useClientPricingQuery } from "@/lib/settings/client-pricing"

/** The client app's prices, per tenant like the subscription tiers: a client pays their own
 * tenant's. Each card is keyed on its rows' updatedAt so a change saved anywhere re-seeds its draft
 * state, as with the tenant cards above. */
function ClientPricingSection() {
  const { data, isLoading, isError, error } = useClientPricingQuery()
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Client app pricing</h2>
        <p className="text-muted-foreground text-sm">What clients pay in the client app, for each tenant. Changes reach checkout within about a minute.</p>
      </div>
      {isLoading && <p className="text-muted-foreground text-sm">Loading client pricing…</p>}
      {isError && <p className="text-destructive text-sm">{(error as Error).message}</p>}
      {data && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {data.tenants.map((tenant) =>
              tenant.case ? (
                <ClientCasePricingCard key={`${tenant.code}-${tenant.case.updatedAt}`} pricing={{ ...tenant, currencies: data.currencies }} row={tenant.case} />
              ) : (
                <p key={tenant.code} className="text-destructive text-sm">
                  {tenant.code} has no case price. Run the API&apos;s migrations or tenant seeder.
                </p>
              )
            )}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {data.tenants.map((tenant) => (
              <ClientTopUpPacksCard
                key={`${tenant.code}-${tenant.packs.map((p) => `${p.id}:${p.updatedAt}:${p.isDefault}`).join(",")}`}
                pricing={{ ...tenant, currencies: data.currencies }}
              />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {data.tenants.map((tenant) => (
              <ClientPromosCard
                key={`${tenant.code}-${tenant.promos.map((p) => `${p.id}:${p.updatedAt}:${p.redemptions}`).join(",")}`}
                pricing={{ ...tenant, currencies: data.currencies }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const { data, isLoading, isError, error } = useAdminSettingsQuery()

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">Signup settings for each tenant. Changes apply immediately.</p>
      </div>
      {isLoading && <p className="text-muted-foreground text-sm">Loading settings…</p>}
      {isError && <p className="text-destructive text-sm">{(error as Error).message}</p>}
      {data && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {data.tenants.map((tenant) => (
              <TenantSettingsCard key={tenant.code} tenant={tenant} />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {data.tenants.map((tenant) => (
              // Keyed on the server timestamp, not just tenant.code: remounts the card (re-seeding
              // its local draft state fresh) whenever the fee actually changes on the server,
              // instead of syncing with an effect.
              <AccountTopUpPricingCard key={`${tenant.code}-${tenant.accountTopUp?.feeUpdatedAt}`} tenant={tenant} />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {data.tenants.map((tenant) => (
              // Same remount-by-key convention, keyed on every tier's own updatedAt so adding,
              // editing or hiding a tier elsewhere (another admin, another tab) re-seeds this
              // card's draft state instead of silently diverging from the server.
              <PaymentPlansCard
                key={`${tenant.code}-${tenant.paymentPlans.map((p) => p.updatedAt).join(",")}`}
                tenant={tenant}
              />
            ))}
          </div>
        </>
      )}
      <ClientPricingSection />
    </div>
  )
}
