"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { LawyerSite } from "@/lib/lawyers/queries"
import {
  type AdminCaseArea,
  CASE_AREA_CODE_PATTERN,
  CASE_AREA_DESCRIPTION_MAX,
  CASE_AREA_NAME_MAX,
  suggestCaseAreaCode,
  useCreateCaseAreaMutation,
  useUpdateCaseAreaMutation,
} from "@/lib/case-areas/queries"

/**
 * Adding a client case type to a site, or editing one. On add, the code follows the name until the admin
 * types their own; on edit it's read-only, since cases and practice areas hold it. Mounted only
 * while open, so each opening starts from the type as saved.
 */
export function CaseAreaDialog({ site, area, onClose }: { site: LawyerSite; area: AdminCaseArea | null; onClose: () => void }) {
  const [name, setName] = useState(area?.name ?? "")
  const [description, setDescription] = useState(area?.description ?? "")
  // null: still suggested from the name.
  const [typedCode, setTypedCode] = useState<string | null>(null)
  const create = useCreateCaseAreaMutation(site)
  const update = useUpdateCaseAreaMutation(site)
  const pending = create.isPending || update.isPending

  const trimmed = name.trim()
  const trimmedDescription = description.trim()
  const code = area?.code ?? typedCode ?? suggestCaseAreaCode(name)
  const codeValid = CASE_AREA_CODE_PATTERN.test(code)
  const changed = !area || trimmed !== area.name || trimmedDescription !== area.description
  const canSave = trimmed !== "" && trimmedDescription !== "" && codeValid && changed && !pending

  const save = () => {
    if (!canSave) return
    const fields = { name: trimmed, description: trimmedDescription }
    const done = {
      onSuccess: () => {
        toast.success(area ? `${trimmed} saved` : `${trimmed} added`)
        onClose()
      },
      onError: (err: unknown) => toast.error((err as Error).message),
    }
    if (area) update.mutate({ id: area.id, patch: fields }, done)
    else create.mutate({ code, ...fields }, done)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <DialogHeader>
            <DialogTitle>{area ? "Edit client case type" : `Add a ${site} client case type`}</DialogTitle>
            <DialogDescription>
              {area
                ? `A new name shows on every case that has it at once${area.caseCount ? ` (${area.caseCount})` : ""}.`
                : "It goes to the end of the list, and clients can pick it straight away. Map a practice area to it so lawyers get its requests."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="case-area-name">Name</Label>
            <Input id="case-area-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={CASE_AREA_NAME_MAX} placeholder="e.g. Immigration" autoFocus />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="case-area-code">Code</Label>
            <Input
              id="case-area-code"
              value={code}
              onChange={(e) => setTypedCode(e.target.value.toUpperCase())}
              readOnly={!!area}
              maxLength={40}
              className={area ? "text-muted-foreground font-mono" : "font-mono"}
              aria-invalid={!area && code !== "" && !codeValid}
            />
            <p className="text-muted-foreground text-xs">
              {area
                ? "Fixed once made: cases and practice areas hold it."
                : "Capital letters, digits and _, starting with a letter. It can't be changed later."}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="case-area-description">Description</Label>
            <Textarea
              id="case-area-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={CASE_AREA_DESCRIPTION_MAX}
              placeholder="e.g. Visas, work permits, deportation."
            />
            <p className="text-muted-foreground text-xs">What Jev reads to decide whether a case is this type. Personal injury is never one: Jev checks for it on its own.</p>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>Cancel</DialogClose>
            <Button type="submit" disabled={!canSave}>
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              {area ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
