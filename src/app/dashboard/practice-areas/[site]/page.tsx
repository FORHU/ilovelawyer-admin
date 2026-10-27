"use client"

import { notFound, useParams } from "next/navigation"

import { PracticeAreasPage } from "@/components/practice-areas/practice-areas-page"
import { LAWYER_SITES, type LawyerSite } from "@/lib/lawyers/queries"

/** /dashboard/practice-areas/uk and /ph: one site's list, picked from the sidebar. */
export default function PracticeAreasSitePage() {
  const site = useParams<{ site: string }>().site.toUpperCase()
  if (!(LAWYER_SITES as readonly string[]).includes(site)) notFound()
  // Keyed so switching site starts with closed dialogs.
  return <PracticeAreasPage key={site} site={site as LawyerSite} />
}
