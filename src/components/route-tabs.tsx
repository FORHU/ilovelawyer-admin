"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export interface RouteTab {
  label: string
  href: string
}

/** A page's tabs where each tab is its own URL, so a reload or a shared link keeps it. The first tab
 * is the page's own address; any other is active on its address and below it. */
export function RouteTabs({ tabs }: { tabs: RouteTab[] }) {
  const pathname = usePathname()
  const active = tabs.slice(1).find((tab) => pathname === tab.href || pathname.startsWith(`${tab.href}/`)) ?? tabs[0]!
  return (
    <Tabs value={active.href}>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.href} value={tab.href} nativeButton={false} render={<Link href={tab.href} />} className="px-3">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
