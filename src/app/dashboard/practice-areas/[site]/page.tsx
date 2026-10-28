"use client"

import { useParams } from "next/navigation"

import { PracticeAreasPage } from "@/components/practice-areas/practice-areas-page"
import type { LawyerSite } from "@/lib/lawyers/queries"

/** /dashboard/practice-areas/uk and /ph: one site's list, picked from the sidebar. The layout has
 * checked the site. */
export default function PracticeAreasSitePage() {
  const site = useParams<{ site: string }>().site.toUpperCase() as LawyerSite
  // Keyed so switching site starts with closed dialogs.
  return <PracticeAreasPage key={site} site={site} />
}
