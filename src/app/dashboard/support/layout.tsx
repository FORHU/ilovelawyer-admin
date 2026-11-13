"use client"

import { DraftProvider } from "@/components/support/draft-bar"
import { RouteTabs } from "@/components/route-tabs"

const BASE = "/dashboard/support"

/** The Support Chat's pages: what the chat says (Content), the conversations it can have (Flows) and
 * what has been published (Versions). One draft is edited across all of them; see DraftProvider. */
export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Support Chat</h1>
      <RouteTabs
        tabs={[
          { label: "Content", href: BASE },
          { label: "Flows", href: `${BASE}/flows` },
          { label: "Versions", href: `${BASE}/versions` },
        ]}
      />
      <DraftProvider>{children}</DraftProvider>
    </div>
  )
}
