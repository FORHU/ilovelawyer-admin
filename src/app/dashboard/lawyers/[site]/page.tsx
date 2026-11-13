"use client"

import { useParams } from "next/navigation"

import { LawyerApplicationsPage } from "@/components/lawyers/lawyer-applications-page"
import type { LawyerSite } from "@/lib/lawyers/queries"

/** /dashboard/lawyers/uk, /ph and /kr: the site's pending applications, the default tab. The layout has checked the site. */
export default function LawyersPendingPage() {
  const site = useParams<{ site: string }>().site.toUpperCase() as LawyerSite
  // Keyed so switching site starts on page 1 with the dialog closed.
  return <LawyerApplicationsPage key={site} site={site} status="PENDING" />
}
