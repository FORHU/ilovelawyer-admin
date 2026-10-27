"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { LawyerSite } from "@/lib/lawyers/queries"
import {
  type AdminPracticeArea,
  CASE_AREA_LABELS,
  CASE_AREAS,
  type CaseArea,
  useCreatePracticeAreaMutation,
  useUpdatePracticeAreaMutation,
} from "@/lib/practice-areas/queries"

/** The API's limit (PRACTICE_AREA_NAME_MAX_LENGTH). */
const NAME_MAX = 100
/** Base UI's Select needs a string value for "no case area". */
const NONE = "NONE"
const CASE_AREA_ITEMS = [{ value: NONE, label: "None (doesn't route requests)" }, ...CASE_AREAS.map((a) => ({ value: a, label: CASE_AREA_LABELS[a] }))]

/**
 * Adding a practice area to a site, or editing one: its name and, on UK, the client case area it
 * routes. Mounted only while open, so each opening starts from the area as saved.
 */
export function PracticeAreaDialog({ site, area, onClose }: { site: LawyerSite; area: AdminPracticeArea | null; onClose: () => void }) {
  const [name, setName] = useState(area?.name ?? "")
  const [caseArea, setCaseArea] = useState<string>(area?.caseArea ?? NONE)
  const create = useCreatePracticeAreaMutation(site)
  const update = useUpdatePracticeAreaMutation(site)
  const pending = create.isPending || update.isPending

  const trimmed = name.trim()
  const fields = { name: trimmed, caseArea: site === "UK" && caseArea !== NONE ? (caseArea as CaseArea) : null }
  const changed = !area || trimmed !== area.name || fields.caseArea !== area.caseArea
  const canSave = trimmed !== "" && changed && !pending

  const save = () => {
    if (!canSave) return
    const done = {
      onSuccess: () => {
        toast.success(area ? `${trimmed} saved` : `${trimmed} added`)
        onClose()
      },
      onError: (err: unknown) => toast.error((err as Error).message),
    }
    if (area) update.mutate({ id: area.id, patch: fields }, done)
    else create.mutate(fields, done)
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
            <DialogTitle>{area ? "Edit practice area" : `Add a ${site} practice area`}</DialogTitle>
            <DialogDescription>
              {area
                ? `A new name shows on every lawyer holding it at once${area.lawyerCount ? ` (${area.lawyerCount})` : ""}. Nobody is sent back for verification.`
                : "It goes to the end of the list, and lawyers can pick it straight away."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="practice-area-name">Name</Label>
            <Input id="practice-area-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={NAME_MAX} placeholder="e.g. Employment Law" autoFocus />
          </div>
          {site === "UK" && (
            <div className="flex flex-col gap-2">
              <Label>Routes client requests about</Label>
              <Select items={CASE_AREA_ITEMS} value={caseArea} onValueChange={(value) => setCaseArea(value as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CASE_AREA_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                The kind of case a client picks in the client app. Lawyers holding this area get those requests. Personal injury is never
                routed: referral fees are banned there.
              </p>
            </div>
          )}
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
