"use client"

import { useState } from "react"
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react"

import { SimpleSelect } from "@/components/support/simple-select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { flowAvailableTo } from "@/lib/support/audience"
import { useDraftStore } from "@/lib/support/draft-store"
import { moved, uniqueId } from "@/lib/support/ids"
import { SUPPORT_LIMITS, type SupportAudience, type SupportMenuCard } from "@/lib/support/types"

const TABS: { value: SupportAudience; label: string }[] = [
  { value: "SIGNED_IN", label: "Signed in" },
  { value: "SIGNED_OUT", label: "Signed out" },
]

function CardRow({ audience, card, index, count }: { audience: SupportAudience; card: SupportMenuCard; index: number; count: number }) {
  const flows = useDraftStore((s) => s.content?.flows)
  const edit = useDraftStore((s) => s.edit)
  const patch = (fields: Partial<SupportMenuCard>) => edit((d) => void Object.assign(d.menus[audience][index]!, fields))

  const available = Object.values(flows ?? {}).filter((flow) => flowAvailableTo(flow, audience))
  const items = available.map((flow) => ({ value: flow.id, label: flow.title }))
  // A card can point at a flow this audience can't reach (its audience was changed): keep it visible, marked.
  const current = flows?.[card.flowId]
  if (!items.some((item) => item.value === card.flowId)) items.unshift({ value: card.flowId, label: `${current?.title ?? card.flowId} (not available here)` })

  return (
    <li className="flex flex-col gap-3 rounded-2xl border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground w-5 text-xs tabular-nums">{index + 1}</span>
        <Input
          aria-label={`Card ${index + 1} title`}
          value={card.title}
          maxLength={SUPPORT_LIMITS.titleLength}
          placeholder="Title"
          className="min-w-40 flex-1"
          onChange={(e) => patch({ title: e.target.value })}
        />
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={card.enabled} onCheckedChange={(enabled) => patch({ enabled })} aria-label={`Show card ${index + 1} in the menu`} />
          <span className="text-muted-foreground w-8 text-xs">{card.enabled ? "On" : "Off"}</span>
        </label>
        <div className="flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Move card ${index + 1} up`}
            disabled={index === 0}
            onClick={() => edit((d) => void (d.menus[audience] = moved(d.menus[audience], index, -1)))}
          >
            <ArrowUp />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Move card ${index + 1} down`}
            disabled={index === count - 1}
            onClick={() => edit((d) => void (d.menus[audience] = moved(d.menus[audience], index, 1)))}
          >
            <ArrowDown />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Remove card ${index + 1}`}
            onClick={() => edit((d) => void d.menus[audience].splice(index, 1))}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          aria-label={`Card ${index + 1} subtitle`}
          value={card.subtitle ?? ""}
          maxLength={SUPPORT_LIMITS.subtitleLength}
          placeholder="Subtitle (optional)"
          onChange={(e) => patch({ subtitle: e.target.value === "" ? undefined : e.target.value })}
        />
        <SimpleSelect value={card.flowId} items={items} label={`Card ${index + 1} opens`} placeholder="Opens which flow?" onChange={(flowId) => patch({ flowId })} />
      </div>
    </li>
  )
}

/** The topic cards under the greeting, one list for clients signed in and one for visitors who aren't.
 * Order here is the order on screen; a card that is off, or whose flow that audience can't reach, is
 * left out. */
export function MenusCard() {
  const menus = useDraftStore((s) => s.content?.menus)
  const flows = useDraftStore((s) => s.content?.flows)
  const edit = useDraftStore((s) => s.edit)
  const [audience, setAudience] = useState<SupportAudience>("SIGNED_IN")
  if (!menus || !flows) return null
  const cards = menus[audience]
  const firstFlow = Object.values(flows).find((flow) => flowAvailableTo(flow, audience))

  const add = () =>
    edit((d) => {
      const taken = [...d.menus.SIGNED_IN, ...d.menus.SIGNED_OUT].map((c) => c.id)
      const flow = Object.values(d.flows).find((f) => flowAvailableTo(f, audience))
      d.menus[audience].push({ id: uniqueId("new-card", taken), title: "New topic", flowId: flow?.id ?? "", enabled: false })
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Menu</CardTitle>
        <CardDescription>The topic cards clients tap first. New cards start switched off so you can finish them before they show.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Tabs value={audience} onValueChange={(value) => setAudience(value as SupportAudience)}>
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="px-3">
                {tab.label} ({menus[tab.value].length})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {audience === "SIGNED_OUT" && (
          <p className="text-muted-foreground text-xs">Visitors aren&apos;t signed in, so their flows can&apos;t use actions that read an account.</p>
        )}

        {cards.length === 0 ? (
          <p className="text-muted-foreground rounded-2xl border border-dashed p-4 text-center text-sm">No cards yet. With none on, the chat has no menu to show.</p>
        ) : (
          <ul className="flex flex-col gap-2" aria-label={`${audience === "SIGNED_IN" ? "Signed in" : "Signed out"} menu cards`}>
            {cards.map((card, i) => (
              <CardRow key={card.id} audience={audience} card={card} index={i} count={cards.length} />
            ))}
          </ul>
        )}

        <Button type="button" variant="outline" className="self-start" onClick={add} disabled={!firstFlow || cards.length >= SUPPORT_LIMITS.menuCards}>
          <Plus className="size-3.5" />
          Add a card
        </Button>
        {!firstFlow && <p className="text-muted-foreground text-xs">Add a flow first: a card opens a flow.</p>}
      </CardContent>
    </Card>
  )
}
