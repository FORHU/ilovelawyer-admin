"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { AddOverrideDialog, KNOWN_MODELS } from "@/components/persona-routing/add-override-dialog"
import { ToolOverridesDialog } from "@/components/persona-routing/tool-overrides-dialog"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { type PersonaRoutingOverride, usePersonaRoutingOverridesQuery, useUpdatePersonaRoutingOverrideMutation } from "@/lib/persona-routing/queries"

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

/** One row: the Switch flips AUTO<->MANUAL immediately (MANUAL needs a pinned model already on
 * the row, so it's disabled until one is set); the pinned-model Input saves on blur, only if the
 * value actually changed. Both share the row's single mutation so they never race each other. */
function OverrideRow({ override }: { override: PersonaRoutingOverride }) {
  const update = useUpdatePersonaRoutingOverrideMutation()
  const [pinnedDraft, setPinnedDraft] = useState(override.manualPinnedModel ?? "")

  const isManual = override.routingMode === "MANUAL"
  const hasPin = pinnedDraft.trim() !== ""

  function setMode(manual: boolean) {
    if (manual && !hasPin) {
      toast.error("Set a pinned model first.")
      return
    }
    update.mutate(
      { persona: override.persona, fields: { routingMode: manual ? "MANUAL" : "AUTO", manualPinnedModel: manual ? pinnedDraft.trim() : null } },
      {
        onSuccess: () => toast.success(`${override.persona} is now ${manual ? "MANUAL" : "AUTO"}`),
        onError: (err) => toast.error((err as Error).message),
      }
    )
  }

  function savePin(next: string) {
    setPinnedDraft(next)
    if (next === (override.manualPinnedModel ?? "")) return
    update.mutate(
      { persona: override.persona, fields: { routingMode: override.routingMode, manualPinnedModel: next || null } },
      { onSuccess: () => toast.success(`${override.persona}'s pinned model updated`), onError: (err) => toast.error((err as Error).message) }
    )
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{override.persona}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Switch checked={isManual} onCheckedChange={setMode} disabled={update.isPending} />
          <Badge variant={isManual ? "default" : "secondary"}>{isManual ? "MANUAL" : "AUTO"}</Badge>
        </div>
      </TableCell>
      <TableCell>
        <Select items={KNOWN_MODELS.map((m) => ({ value: m, label: m }))} value={pinnedDraft} onValueChange={(v) => savePin(v ?? "")}>
          <SelectTrigger className="h-8 w-48" disabled={update.isPending}>
            <SelectValue placeholder={isManual ? "required" : "unused while AUTO"} />
          </SelectTrigger>
          <SelectContent>
            {KNOWN_MODELS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <ToolOverridesDialog override={override} />
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">{formatDateTime(override.updatedAt)}</TableCell>
      <TableCell>{update.isPending && <Loader2 className="size-3.5 animate-spin" />}</TableCell>
    </TableRow>
  )
}

/**
 * CW-8: which personas are pinned to a model (MANUAL) vs letting chat-wonder-v2-api's turn-start
 * race pick (AUTO), and what they're pinned to. A persona with no row here is implicitly AUTO.
 * chat-wonder-v2-api polls this through a separate, api-key-guarded endpoint on its own timer —
 * a change here is not instant on its side, but needs no chat-wonder deploy either.
 */
export function PersonaRoutingPage() {
  const { data, isLoading, isError, error } = usePersonaRoutingOverridesQuery()

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Model Routing</h1>
        <p className="text-muted-foreground text-sm">
          Personas pinned to one model, or left on AUTO for chat-wonder-v2-api&apos;s turn-start race to pick. A persona not listed here is AUTO by
          default. chat-wonder-v2-api picks up a change on its next poll, not instantly.
        </p>
      </div>

      <div className="flex flex-wrap items-end justify-end gap-3">
        <AddOverrideDialog existing={data?.map((o) => o.persona) ?? []} />
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
      {isError && <p className="text-destructive text-sm">{(error as Error).message}</p>}
      {data && data.length === 0 && <p className="text-muted-foreground text-sm">No persona has an override yet — every persona is on AUTO.</p>}
      {data && data.length > 0 && (
        <div className="rounded-2xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Persona</TableHead>
                <TableHead>Routing mode</TableHead>
                <TableHead>Pinned model</TableHead>
                <TableHead>Tool overrides</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((override) => (
                <OverrideRow key={override.persona} override={override} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
