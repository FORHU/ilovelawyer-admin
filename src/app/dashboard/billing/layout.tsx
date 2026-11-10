"use client"

import { usePathname } from "next/navigation"

import { RouteTabs } from "@/components/route-tabs"

const BASE = "/dashboard/billing"
const TABS = [
  { label: "Credit top-ups", href: BASE },
  { label: "Quote payments", href: `${BASE}/quote-payments` },
]

/** Billing: what clients pay, as tabs: chat credit top-ups, and what they paid for lawyers' quotes.
 * A client's own billing page (/dashboard/billing/clients/:id) has its own heading and no tabs. */
export default function BillingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (!TABS.some((tab) => tab.href === pathname)) return children

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
      <RouteTabs tabs={TABS} />
      {children}
    </div>
  )
}
