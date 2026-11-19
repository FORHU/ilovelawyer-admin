"use client"

import { useState } from "react"
import { Loader2, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { KNOWN_MODELS, PERSONA_TOOLS } from "@/components/persona-routing/add-override-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { type PersonaRoutingOverride, useUpdatePersonaRoutingOverrideMutation } from "@/lib/persona-routing/queries"

/** CW-7 (decide_tool_model): pins a specific tool call, within this persona's turn, to one
 * model -- independent of (and always wins over) the persona's own routingMode/manualPinnedModel.
 * Wired into the real tool-call loop (run_function_chain/legal_responses_chain), not display-only. */
export function ToolOverridesDialog({ override }: { override: PersonaRoutingOverride }) {
  const [open, setOpen] = useState(false)
  const [tool, setTool] = useState("")
  const [model, setModel] = useState("")
  const update = useUpdatePersonaRoutingOverrideMutation()

  const current = override.toolOverrides ?? {}
  const availableTools = (PERSONA_TOOLS[override.persona as keyof typeof PERSONA_TOOLS] ?? []).filter((t) => !(t in current))
  const canAdd = tool.trim() !== "" && model.trim() !== ""

  function save(next: Record<string, string>) {
    const cleaned = Object.keys(next).length > 0 ? next : null
    update.mutate(
      { persona: override.persona, fields: { routingMode: override.routingMode, manualPinnedModel: override.manualPinnedModel, toolOverrides: cleaned } },
      { onError: (err) => toast.error((err as Error).message) }
    )
  }

  function addOverride() {
    if (!canAdd) return
    save({ ...current, [tool]: model })
    toast.success(`${override.persona}: ${tool} → ${model}`)
    setTool("")
    setModel("")
  }

  function removeOverride(toolName: string) {
    const next = { ...current }
    delete next[toolName]
    save(next)
    toast.success(`Removed ${override.persona}'s ${toolName} override`)
  }

  const toolCount = Object.keys(current).length

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" className="h-7 gap-1 px-2" />}>
        <Pencil className="size-3" />
        {toolCount > 0 ? `${toolCount} tool${toolCount === 1 ? "" : "s"}` : "none"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{override.persona}: tool overrides</DialogTitle>
          <DialogDescription>
            Pins a specific tool call to one model, independent of (and always ahead of) this persona&apos;s own routing mode. Only tools {override.persona}{" "}
            actually calls are listed.
          </DialogDescription>
        </DialogHeader>

        {toolCount > 0 && (
          <div className="flex flex-col gap-2">
            {Object.entries(current).map(([toolName, pinnedModel]) => (
              <div key={toolName} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                <span>
                  <span className="font-medium">{toolName}</span> → {pinnedModel}
                </span>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeOverride(toolName)} disabled={update.isPending}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {availableTools.length > 0 ? (
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Select items={availableTools.map((t) => ({ value: t, label: t }))} value={tool} onValueChange={(v) => setTool(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Tool..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTools.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Select items={KNOWN_MODELS.map((m) => ({ value: m, label: m }))} value={model} onValueChange={(v) => setModel(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Model..." />
                </SelectTrigger>
                <SelectContent>
                  {KNOWN_MODELS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addOverride} disabled={!canAdd || update.isPending}>
              {update.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Add
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Every tool {override.persona} calls already has an override.</p>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Done</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
