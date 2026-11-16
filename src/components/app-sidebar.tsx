"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, ChevronRight, Cpu, DoorOpen, Loader2, Repeat, LogOut, MessageSquareText, Receipt, ScrollText, Settings, ShieldCheck, Tags, Users } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { useLogoutMutation } from "@/lib/auth/mutations"
import { LAWYER_SITES } from "@/lib/lawyers/queries"
import { useAuthStore } from "@/lib/store/auth.store"

/** A sidebar item. `perSite`: a section split by site, with one sub-item per site under it (UK, PH,
 * KR), each its own page. */
type NavItem = { title: string; url: string; icon: typeof Users; perSite?: boolean }

const navItems: NavItem[] = [
  { title: "Users", url: "/dashboard/users", icon: Users },
  { title: "Lawyer applications", url: "/dashboard/lawyers", icon: ShieldCheck, perSite: true },
  { title: "Practice Area", url: "/dashboard/practice-areas", icon: BookOpen, perSite: true },
  { title: "Audit trail", url: "/dashboard/audit", icon: ScrollText },
  { title: "Feedback", url: "/dashboard/feedback", icon: MessageSquareText },
  { title: "Billing", url: "/dashboard/billing", icon: Receipt },
  // Each site's plans are priced in its own currency (won on KR), so plans and subscriptions are
  // per site too.
  { title: "Payment plans", url: "/dashboard/payment-plans", icon: Tags, perSite: true },
  { title: "Lawyer subscriptions", url: "/dashboard/lawyer-subscriptions", icon: Repeat, perSite: true },
  { title: "Lawyer exits", url: "/dashboard/lawyer-exits", icon: DoorOpen },
  { title: "LLM Usage", url: "/dashboard/llm-usage", icon: Cpu },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
]

/** A section split by site, like Lawyer applications (status tabs), Practice Area (practice areas
 * and case types), Payment plans and Lawyer subscriptions. Clicking it opens UK (the default) and shows every site under it; it stays open
 * while any of those pages is. */
function SiteNav({ item, pathname }: { item: NavItem; pathname: string }) {
  const open = pathname === item.url || pathname.startsWith(`${item.url}/`)
  const sites = LAWYER_SITES.map((site) => ({ title: site, url: `${item.url}/${site.toLowerCase()}` }))
  return (
    <Collapsible open={open} render={<SidebarMenuItem />}>
      <SidebarMenuButton render={<Link href={sites[0].url} />} isActive={open} aria-expanded={open}>
        <item.icon />
        <span>{item.title}</span>
        <ChevronRight className={`ml-auto transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
      </SidebarMenuButton>
      <CollapsibleContent>
        <SidebarMenuSub>
          {sites.map((site) => (
            <SidebarMenuSubItem key={site.url}>
              <SidebarMenuSubButton render={<Link href={site.url} />} isActive={pathname === site.url || pathname.startsWith(`${site.url}/`)}>
                <span>{site.title}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  )
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton render={<Link href={item.url} />} isActive={pathname.startsWith(item.url)}>
        <item.icon />
        <span>{item.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const logoutMutation = useLogoutMutation()

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          {/* The dark mark's "iL" is white, so each theme gets its own file. */}
          <Image src="/ilovelawyer-mark-light.png" alt="" width={24} height={24} className="size-6 shrink-0 dark:hidden" priority />
          <Image src="/ilovelawyer-mark-dark.png" alt="" width={24} height={24} className="hidden size-6 shrink-0 dark:block" priority />
          <span
            className="text-lg tracking-[-0.4px]"
            style={{ fontFamily: "var(--font-libre-caslon-text), serif" }}
          >
            ilovelawyer admin
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) =>
                item.perSite ? <SiteNav key={item.url} item={item} pathname={pathname} /> : <NavLink key={item.url} item={item} pathname={pathname} />
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {user && (
              <div className="flex flex-col gap-0.5 px-2 py-1.5">
                <span className="truncate text-sm font-medium">{user.name ?? user.username}</span>
                <span className="text-muted-foreground truncate text-xs">{user.email}</span>
              </div>
            )}
            <AlertDialog>
              <AlertDialogTrigger render={<SidebarMenuButton />}>
                <LogOut />
                <span>Log out</span>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Log out?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You&apos;ll need to sign in again to access the admin dashboard.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel render={<Button variant="outline" disabled={logoutMutation.isPending} />}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    render={<Button />}
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                  >
                    {logoutMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                    {logoutMutation.isPending ? "Logging out…" : "Log out"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
