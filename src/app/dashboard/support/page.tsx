"use client"

import { MenusCard } from "@/components/support/menus-card"
import { PhonePreview } from "@/components/support/phone-preview"
import { SettingsCard } from "@/components/support/settings-card"

/** /dashboard/support: the chat's name, greeting and menus, with the draft running beside them. */
export default function SupportContentPage() {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex min-w-0 flex-col gap-4">
        <SettingsCard />
        <MenusCard />
      </div>
      <PhonePreview className="xl:sticky xl:top-28" />
    </div>
  )
}
