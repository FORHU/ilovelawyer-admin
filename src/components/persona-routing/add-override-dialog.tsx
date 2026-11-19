"use client"

import { useState } from "react"
import { Loader2, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { type RoutingMode, useUpdatePersonaRoutingOverrideMutation } from "@/lib/persona-routing/queries"

/** Adds a new override row. The persona name is free text -- this API only stores overrides,
 * chat-wonder-v2-api owns the actual persona list, so there is nothing here to validate it against. */
export function AddOverrideDialog({ existing }: { existing: string[] }) {
  const [open, setOpen] = useState(false)
  const [persona, setPersona] = useState("")
  const [routingMode, setRoutingMode] = useState<RoutingMode>("MANUAL")
  const [pinnedModel, setPinnedModel] = useState("")
  const update = useUpdatePersonaRoutingOverrideMutation()

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
            Persona name — as chat-wonder-v2-api knows it (e.g. legal_uk, stylist, intake)
          </Label>
          <Input id="persona-name" value={persona} onChange={(e) => setPersona(e.target.value)} aria-invalid={!!personaError} />
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
            <Input id="pinned-model" placeholder="gpt-6-luna" value={pinnedModel} onChange={(e) => setPinnedModel(e.target.value)} aria-invalid={!!pinError} />
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
