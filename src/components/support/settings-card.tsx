"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useDraftStore } from "@/lib/support/draft-store"
import { SUPPORT_LIMITS } from "@/lib/support/types"

/** Who the chat is and how it opens: the name and picture in its header, the greeting, and the line
 * under it that sets how long a person's reply takes. */
export function SettingsCard() {
  const settings = useDraftStore((s) => s.content?.settings)
  const edit = useDraftStore((s) => s.edit)
  if (!settings) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assistant</CardTitle>
        <CardDescription>What clients see at the top of the chat and in its first message.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="support-assistant-name">Name</Label>
          <Input
            id="support-assistant-name"
            value={settings.assistantName}
            maxLength={SUPPORT_LIMITS.titleLength}
            onChange={(e) => edit((d) => void (d.settings.assistantName = e.target.value))}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="support-avatar">Picture address</Label>
          <Input
            id="support-avatar"
            type="url"
            inputMode="url"
            placeholder="https://…"
            value={settings.avatarUrl ?? ""}
            aria-describedby="support-avatar-hint"
            onChange={(e) => edit((d) => void (d.settings.avatarUrl = e.target.value.trim() === "" ? null : e.target.value))}
          />
          <p id="support-avatar-hint" className="text-muted-foreground text-xs">
            A link to a square image, starting with https. Leave empty to show the default icon.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="support-greeting">Greeting</Label>
          <Textarea
            id="support-greeting"
            rows={2}
            value={settings.greeting}
            maxLength={SUPPORT_LIMITS.textLength}
            aria-describedby="support-greeting-hint"
            onChange={(e) => edit((d) => void (d.settings.greeting = e.target.value))}
          />
          <p id="support-greeting-hint" className="text-muted-foreground text-xs">
            The first message. Write <code className="bg-muted rounded px-1">{"{firstName}"}</code> where the client&apos;s first name goes; a visitor who isn&apos;t signed
            in gets the greeting without it.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="support-response-time">Reply time</Label>
          <Input
            id="support-response-time"
            value={settings.responseTimeLine}
            maxLength={SUPPORT_LIMITS.textLength}
            aria-describedby="support-response-hint"
            onChange={(e) => edit((d) => void (d.settings.responseTimeLine = e.target.value))}
          />
          <p id="support-response-hint" className="text-muted-foreground text-xs">
            Shown once a client has written to the team, so they know when to expect an answer.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
