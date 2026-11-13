"use client"

import { useParams } from "next/navigation"

import { LawyerApplicationsPage } from "@/components/lawyers/lawyer-applications-page"
import type { LawyerSite } from "@/lib/lawyers/queries"

/** /dashboard/lawyers/[site]/rejected: the site's rejected applications. The layout has checked the site. */
export default function LawyersRejectedPage() {
  const site = useParams<{ site: string }>().site.toUpperCase() as LawyerSite
  // Keyed so switching site starts on page 1 with the dialog closed.
  return <LawyerApplicationsPage key={site} site={site} status="REJECTED" />
}
