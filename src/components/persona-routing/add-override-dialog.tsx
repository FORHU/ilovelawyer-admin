"use client"

import { useState } from "react"
import { Loader2, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { type RoutingMode, useUpdatePersonaRoutingOverrideMutation } from "@/lib/persona-routing/queries"

/** Personas chat-wonder-v2-api's model_router.py actually calls decide_turn_model for
 * (the_server.py's _legal_model_override/_intake_model_override call sites). Every other
 * persona (stylist, garment, maps, cosmetics, nav, tailor) runs on CHAT_MODEL and ignores
 * routing overrides entirely -- listing them here would let an admin "set" something inert. */
const KNOWN_PERSONAS = ["legal", "legal_uk", "legal_kr", "intake", "intake_kr"] as const

/** Models model_registry.py knows about and the_server.py can actually call. run_function_chain
 * (the real completion path _model flows into) calls model_registry.get_client/shape_chat_args
 * for every model, including deepseek-chat/deepseek-reasoner -- that dispatch is real: a real
 * DeepSeek client, real base URL, real thinking-mode/reasoning_effort handling. */
export const KNOWN_MODELS = ["gpt-5.6-luna", "gpt-6-luna", "gpt-5.6-terra", "deepseek-chat", "deepseek-reasoner"] as const

export function AddOverrideDialog({ existing }: { existing: string[] }) {
  const [open, setOpen] = useState(false)
  const [persona, setPersona] = useState("")
  const [routingMode, setRoutingMode] = useState<RoutingMode>("MANUAL")
  const [pinnedModel, setPinnedModel] = useState("")
  const update = useUpdatePersonaRoutingOverrideMutation()

  const availablePersonas = KNOWN_PERSONAS.filter((p) => !existing.includes(p))
  const personaError = persona.trim() === "" ? null : existing.includes(persona.trim()) ? "Already has an override — edit it in the table instead." : null
  const pinError = routingMode === "MANUAL" && pinnedModel.trim() === "" ? "Required for MANUAL." : null
  const canSave = persona.trim() !== "" && !personaError && !pinError

  function reset() {
    setPersona("")
    setRoutingMode("MANUAL")
    setPinnedModel("")
  }

  function save() {
    update.mutate(
      { persona: persona.trim(), fields: { routingMode, manualPinnedModel: routingMode === "MANUAL" ? pinnedModel.trim() : null } },
      {
        onSuccess: () => {
          toast.success(`${persona.trim()} is now ${routingMode === "MANUAL" ? `pinned to ${pinnedModel.trim()}` : "on AUTO"}`)
          setOpen(false)
          reset()
        },
        onError: (err) => toast.error((err as Error).message),
      }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (update.isPending) return
        if (next) reset()
        setOpen(next)
      }}
    >
      <DialogTrigger render={<Button />}>
        <Plus className="size-3.5" />
        Add persona override
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add persona override</DialogTitle>
          <DialogDescription>
            Pins a persona to one model (MANUAL) or lets chat-wonder&apos;s turn-start race pick (AUTO). chat-wonder-v2-api picks this up on its next
            poll — no deploy needed.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="persona-name" className="font-normal select-text">
            Persona
          </Label>
          <Select
            items={availablePersonas.map((p) => ({ value: p, label: p }))}
            value={persona}
            onValueChange={(v) => setPersona(v ?? "")}
          >
            <SelectTrigger id="persona-name" aria-invalid={!!personaError}>
              <SelectValue placeholder="Select a persona..." />
            </SelectTrigger>
            <SelectContent>
              {availablePersonas.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {personaError && <p className="text-destructive text-xs">{personaError}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label className="font-normal select-text">Routing mode</Label>
          <Select
            items={[
              { value: "AUTO", label: "AUTO — let the turn-start race pick" },
              { value: "MANUAL", label: "MANUAL — always use one model" },
            ]}
            value={routingMode}
            onValueChange={(v) => setRoutingMode(v as RoutingMode)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AUTO">AUTO — let the turn-start race pick</SelectItem>
              <SelectItem value="MANUAL">MANUAL — always use one model</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {routingMode === "MANUAL" && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="pinned-model" className="font-normal select-text">
              Pinned model
            </Label>
            <Select items={KNOWN_MODELS.map((m) => ({ value: m, label: m }))} value={pinnedModel} onValueChange={(v) => setPinnedModel(v ?? "")}>
              <SelectTrigger id="pinned-model" aria-invalid={!!pinError}>
                <SelectValue placeholder="Select a model..." />
              </SelectTrigger>
              <SelectContent>
                {KNOWN_MODELS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pinError && <p className="text-destructive text-xs">{pinError}</p>}
          </div>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={save} disabled={!canSave || update.isPending}>
            {update.isPending && <Loader2 className="size-3.5 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
