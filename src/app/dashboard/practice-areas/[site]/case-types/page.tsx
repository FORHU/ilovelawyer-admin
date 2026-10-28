"use client"

import { useParams } from "next/navigation"

import { CaseAreasPage } from "@/components/case-areas/case-areas-page"
import type { LawyerSite } from "@/lib/lawyers/queries"

/** /dashboard/practice-areas/uk/case-types and /ph/case-types: the layout has checked the site. */
export default function CaseTypesSitePage() {
  const site = useParams<{ site: string }>().site.toUpperCase() as LawyerSite
  // Keyed so switching site starts with closed dialogs.
  return <CaseAreasPage key={site} site={site} />
}
