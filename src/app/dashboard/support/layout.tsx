"use client"

import { usePathname } from "next/navigation"

import { DraftProvider } from "@/components/support/draft-bar"
import { RouteTabs } from "@/components/route-tabs"

const BASE = "/dashboard/support"

/** Pages that read the Support Chat but don't edit its draft: no draft to load, no Save bar. */
const NO_DRAFT = [`${BASE}/tickets`, `${BASE}/report`]

/** The Support Chat's pages: what the chat says (Content), the conversations it can have (Flows), what
 * has been published (Versions), the messages clients sent to the team (Tickets) and how the flows are
 * doing (Report). One draft is edited across the first three; see DraftProvider. */
export default function SupportLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const editing = !NO_DRAFT.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Support Chat</h1>
      <RouteTabs
        tabs={[
          { label: "Content", href: BASE },
          { label: "Flows", href: `${BASE}/flows` },
          { label: "Versions", href: `${BASE}/versions` },
          { label: "Tickets", href: `${BASE}/tickets` },
          { label: "Report", href: `${BASE}/report` },
        ]}
      />
      {editing ? <DraftProvider>{children}</DraftProvider> : children}
    </div>
  )
}
