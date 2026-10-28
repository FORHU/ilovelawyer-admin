"use client"

import Link from "next/link"
import { notFound, useParams, usePathname } from "next/navigation"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LAWYER_SITES, type LawyerSite } from "@/lib/lawyers/queries"

const SITE_NAMES: Record<LawyerSite, string> = { UK: "United Kingdom", PH: "Philippines" }

/** One site's Practice Area pages, picked from the sidebar: its practice areas, and the client case
 * types they map to, as tabs. Each tab is its own URL, so a reload or a shared link keeps it. */
export default function PracticeAreasSiteLayout({ children }: { children: React.ReactNode }) {
  const slug = useParams<{ site: string }>().site
  const pathname = usePathname()
  const site = slug.toUpperCase()
  if (!(LAWYER_SITES as readonly string[]).includes(site)) notFound()

  const base = `/dashboard/practice-areas/${slug}`
  const tabs = [
    { value: "practice-areas", label: "Practice areas", href: base },
    { value: "case-types", label: "Client case types", href: `${base}/case-types` },
  ]
  const active = pathname.startsWith(`${base}/case-types`) ? "case-types" : "practice-areas"

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Practice Area · {SITE_NAMES[site as LawyerSite]}</h1>
      <Tabs value={active}>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} nativeButton={false} render={<Link href={tab.href} />} className="px-3">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {children}
    </div>
  )
}
