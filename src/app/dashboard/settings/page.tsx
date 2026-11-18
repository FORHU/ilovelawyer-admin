"use client"

import Link from "next/link"

import { TenantSettingsCard } from "@/components/settings/tenant-settings-card"
import { useAdminSettingsQuery } from "@/lib/settings/queries"

/** Signup settings for each site. Prices and fees (plans, the AI top-up fee, client app pricing,
 * quote payments, lawyer fees) are per site under Payment plans. */
export default function SettingsPage() {
  const { data, isLoading, isError, error } = useAdminSettingsQuery()

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Signup settings for each tenant. Changes apply immediately. Prices and fees are under{" "}
          <Link href="/dashboard/payment-plans" className="text-foreground underline underline-offset-4">
            Payment plans
          </Link>
          .
        </p>
      </div>
      {isLoading && <p className="text-muted-foreground text-sm">Loading settings…</p>}
      {isError && <p className="text-destructive text-sm">{(error as Error).message}</p>}
      {data && (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.tenants.map((tenant) => (
            <TenantSettingsCard key={tenant.code} tenant={tenant} />
          ))}
        </div>
      )}
    </div>
  )
}
