"use client"

import { notFound, useParams } from "next/navigation"

import { SitePricingSections } from "@/components/settings/site-pricing-sections"
import { LAWYER_SITE_NAMES, siteFromSlug } from "@/lib/lawyers/queries"

/** One site's prices and fees, picked from the sidebar: the lawyer's monthly plans (in the site's own
 * currency, won on KR), the account AI top-up fee, the client app's pricing, quote payments, and
 * the lawyer fees. Signup settings stay on Settings. */
export default function PaymentPlansSitePage() {
  const site = siteFromSlug(useParams<{ site: string }>().site)
  if (!site) notFound()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payment plans · {LAWYER_SITE_NAMES[site]}</h1>
        <p className="text-muted-foreground text-sm">Everything lawyers and clients on this site pay: plans, fees and prices.</p>
      </div>
      <SitePricingSections site={site} />
    </div>
  )
}
