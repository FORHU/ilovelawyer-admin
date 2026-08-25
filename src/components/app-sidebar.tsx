"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Loader2, LogOut, Users } from "lucide-react"

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
} from "@/components/ui/sidebar"
import { useLogoutMutation } from "@/lib/auth/mutations"
import { useAuthStore } from "@/lib/store/auth.store"

const navItems = [{ title: "Users", url: "/dashboard/users", icon: Users }]

export function AppSidebar() {
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const logoutMutation = useLogoutMutation()

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
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
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={pathname.startsWith(item.url)}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
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
