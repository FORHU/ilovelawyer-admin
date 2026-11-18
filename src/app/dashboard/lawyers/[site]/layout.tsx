"use client"

import Link from "next/link"
import { notFound, useParams, usePathname } from "next/navigation"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { APPLICATION_STATUS_LABELS, type ApplicationStatus } from "@/components/lawyers/lawyer-applications-page"
import { LAWYER_SITE_NAMES, siteFromSlug, type LawyerSite } from "@/lib/lawyers/queries"

/** What the admin checks on each site, and what approving does there. */
const SITE_DESCRIPTION: Record<LawyerSite, string> = {
  UK: "Check the registration against the regulator's register. Approving confirms their jurisdictions and lets them receive client requests.",
  PH: "Check the Roll of Attorneys and the IBP. Approving shows an Approved badge on their profile.",
  KR: "Check the registration number and local bar against the Korean Bar Association's register. Approving lets them choose a plan and start using ilovelawyer.",
}

// Same colors as the status badges in the table, so a tab reads as the rows it shows.
const STATUS_DOT_CLASS: Record<ApplicationStatus, string> = {
  PENDING: "bg-amber-500",
  VERIFIED: "bg-emerald-500",
  REJECTED: "bg-destructive",
}

/** One site's Lawyer applications, picked from the sidebar like Practice Area, with a tab per
 * status. Each tab is its own URL, so a reload or a shared link keeps it. */
export default function LawyersSiteLayout({ children }: { children: React.ReactNode }) {
  const slug = useParams<{ site: string }>().site
  const pathname = usePathname()
  const site = siteFromSlug(slug)
  if (!site) notFound()

  const base = `/dashboard/lawyers/${slug}`
  const tabs: { value: ApplicationStatus; href: string }[] = [
    { value: "PENDING", href: base },
    { value: "VERIFIED", href: `${base}/approved` },
    { value: "REJECTED", href: `${base}/rejected` },
  ]
  const active: ApplicationStatus = pathname.startsWith(`${base}/approved`) ? "VERIFIED" : pathname.startsWith(`${base}/rejected`) ? "REJECTED" : "PENDING"

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lawyer applications · {LAWYER_SITE_NAMES[site]}</h1>
        <p className="text-muted-foreground text-sm">{SITE_DESCRIPTION[site]} Rejecting emails them the reason.</p>
      </div>
      <Tabs value={active}>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} nativeButton={false} render={<Link href={tab.href} />} className="gap-2 px-3">
              <span className={`size-1.5 rounded-full ${STATUS_DOT_CLASS[tab.value]}`} aria-hidden />
              {APPLICATION_STATUS_LABELS[tab.value]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {children}
    </div>
  )
}
