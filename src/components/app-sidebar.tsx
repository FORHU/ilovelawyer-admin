"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, ChevronRight, Cpu, HandCoins, Loader2, LogOut, MessageSquareText, Receipt, ScrollText, Settings, ShieldCheck, Users } from "lucide-react"

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
import { useAuthStore } from "@/lib/store/auth.store"

type NavItem = { title: string; url: string; icon: typeof Users }

// Practice Area sits between these two lists, right after Lawyer applications.
const navItemsBefore: NavItem[] = [
  { title: "Users", url: "/dashboard/users", icon: Users },
  { title: "Lawyer applications", url: "/dashboard/lawyers", icon: ShieldCheck },
]
const navItemsAfter: NavItem[] = [
  { title: "Audit trail", url: "/dashboard/audit", icon: ScrollText },
  { title: "Feedback", url: "/dashboard/feedback", icon: MessageSquareText },
  { title: "Billing", url: "/dashboard/billing", icon: Receipt },
  { title: "Quote payments", url: "/dashboard/quote-payments", icon: HandCoins },
  { title: "LLM Usage", url: "/dashboard/llm-usage", icon: Cpu },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
]

const PRACTICE_AREAS_URL = "/dashboard/practice-areas"
const practiceAreaSites = [
  { title: "UK", url: `${PRACTICE_AREAS_URL}/uk` },
  { title: "PH", url: `${PRACTICE_AREAS_URL}/ph` },
]

/** Each site's practice areas and client case types (tabs on the site's page). Clicking it opens
 * UK (the default) and shows both sites under it; it stays open while any of those pages is. */
function PracticeAreaNav({ pathname }: { pathname: string }) {
  const open = pathname.startsWith(PRACTICE_AREAS_URL)
  return (
    <Collapsible open={open} render={<SidebarMenuItem />}>
      <SidebarMenuButton render={<Link href={practiceAreaSites[0].url} />} isActive={open} aria-expanded={open}>
        <BookOpen />
        <span>Practice Area</span>
        <ChevronRight className={`ml-auto transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
      </SidebarMenuButton>
      <CollapsibleContent>
        <SidebarMenuSub>
          {practiceAreaSites.map((site) => (
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
              {navItemsBefore.map((item) => (
                <NavLink key={item.url} item={item} pathname={pathname} />
              ))}
              <PracticeAreaNav pathname={pathname} />
              {navItemsAfter.map((item) => (
                <NavLink key={item.url} item={item} pathname={pathname} />
              ))}
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
