import { RouteTabs } from "@/components/route-tabs"

const BASE = "/dashboard/lawyer-exits"
const TABS = [
  { label: "Exits", href: BASE },
  { label: "Lawyer wallets", href: `${BASE}/wallets` },
]

/** Lawyer exits: the lawyers who couldn't continue after the client paid, and the wallets the
 * lawyers' share of a payment goes into, as tabs. */
export default function LawyerExitsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Lawyer exits</h1>
      <RouteTabs tabs={TABS} />
      {children}
    </div>
  )
}
