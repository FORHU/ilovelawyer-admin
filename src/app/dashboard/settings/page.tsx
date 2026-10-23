"use client"

import { TenantSettingsCard } from "@/components/settings/tenant-settings-card"
import { AccountTopUpPricingCard } from "@/components/settings/account-topup-pricing-card"
import { useAdminSettingsQuery } from "@/lib/settings/queries"

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
              // Keyed on the server timestamps, not just tenant.code: remounts the card (re-seeding
              // its local draft state fresh) whenever the fee or plan actually changes on the
              // server, instead of syncing with an effect.
              <AccountTopUpPricingCard
                key={`${tenant.code}-${tenant.accountTopUp?.feeUpdatedAt}-${tenant.accountTopUp?.planUpdatedAt}`}
                tenant={tenant}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
