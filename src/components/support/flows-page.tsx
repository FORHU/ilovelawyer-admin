"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Pencil, Plus, Trash2 } from "lucide-react"

import { SimpleSelect } from "@/components/support/simple-select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDraftStore } from "@/lib/support/draft-store"
import { uniqueId } from "@/lib/support/ids"
import { SUPPORT_LIMITS, type SupportFlow, type SupportFlowAudience } from "@/lib/support/types"

const AUDIENCE_LABEL: Record<SupportFlowAudience, string> = { BOTH: "Everyone", SIGNED_IN: "Signed in", SIGNED_OUT: "Signed out" }

/** Places that point at a flow: menu cards, other flows' steps and their related lists. */
function referencesTo(flowId: string, flows: Record<string, SupportFlow>, cards: { flowId: string }[]) {
  let steps = 0
  for (const flow of Object.values(flows)) {
    if (flow.id === flowId) continue
    for (const step of Object.values(flow.steps)) {
      const targets =
        step.type === "MESSAGE" ? [step.next] : step.type === "CHOICES" ? step.options.map((o) => o.target) : step.type === "ACTION" ? [step.onSuccess, step.onFailure] : []
      steps += targets.filter((t) => t?.kind === "FLOW" && t.flowId === flowId).length
    }
  }
  return { cards: cards.filter((c) => c.flowId === flowId).length, steps }
}

function CreateDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const edit = useDraftStore((s) => s.edit)
  const [title, setTitle] = useState("")
  const [audience, setAudience] = useState<SupportFlowAudience>("BOTH")

  const create = () => {
    const name = title.trim()
    if (!name) return
    let id = ""
    edit((d) => {
      id = uniqueId(name, Object.keys(d.flows))
      d.flows[id] = {
        id,
        title: name,
        audience,
        triggers: [],
        relatedFlowIds: [],
        startStepId: "answer",
        steps: {
          answer: { id: "answer", type: "MESSAGE", text: "Write the answer here.", next: { kind: "STEP", stepId: "helped" } },
          helped: { id: "helped", type: "DID_THAT_HELP" },
        },
      }
    })
    router.push(`/dashboard/support/flows/${encodeURIComponent(id)}`)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            create()
          }}
        >
          <DialogHeader>
            <DialogTitle>New flow</DialogTitle>
            <DialogDescription>It starts with one message and “Did that help?”. Add the rest on the next page; nothing goes live until you publish.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-flow-title">Title</Label>
            <Input id="new-flow-title" value={title} maxLength={SUPPORT_LIMITS.titleLength} placeholder="e.g. Changing my email address" autoFocus onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Who sees it</Label>
            <SimpleSelect
              value={audience}
              label="Who sees this flow"
              items={(Object.keys(AUDIENCE_LABEL) as SupportFlowAudience[]).map((a) => ({ value: a, label: AUDIENCE_LABEL[a] }))}
              onChange={(a) => setAudience(a as SupportFlowAudience)}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={!title.trim()}>
              Create flow
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Every flow in the draft, with who sees it and whether a menu card opens it. */
export function FlowsPage() {
  const flows = useDraftStore((s) => s.content?.flows)
  const menus = useDraftStore((s) => s.content?.menus)
  const edit = useDraftStore((s) => s.edit)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<SupportFlow | null>(null)
  if (!flows || !menus) return null

  const list = Object.values(flows).sort((a, b) => a.title.localeCompare(b.title))
  const cards = [...menus.SIGNED_IN, ...menus.SIGNED_OUT]
  const refs = deleting ? referencesTo(deleting.id, flows, cards) : null

  const remove = (flow: SupportFlow) => {
    edit((d) => {
      delete d.flows[flow.id]
      for (const other of Object.values(d.flows)) other.relatedFlowIds = other.relatedFlowIds.filter((id) => id !== flow.id)
    })
    setDeleting(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-muted-foreground max-w-3xl text-sm">
          A flow is one conversation the chat can have. A menu card or a typed word opens it, and its steps say what comes next. Changes stay in the draft until you publish.
        </p>
        <Button onClick={() => setCreating(true)} disabled={list.length >= SUPPORT_LIMITS.flows}>
          <Plus className="size-3.5" />
          New flow
        </Button>
      </div>

      <div className="rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Flow</TableHead>
              <TableHead className="w-32">Who sees it</TableHead>
              <TableHead className="w-24">Steps</TableHead>
              <TableHead className="w-28">Trigger words</TableHead>
              <TableHead className="w-28">In a menu</TableHead>
              <TableHead className="w-24">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground h-20 text-center">
                  No flows yet.
                </TableCell>
              </TableRow>
            )}
            {list.map((flow) => {
              const inMenus = cards.filter((c) => c.flowId === flow.id)
              return (
                <TableRow key={flow.id}>
                  <TableCell>
                    <Link href={`/dashboard/support/flows/${encodeURIComponent(flow.id)}`} className="font-medium underline-offset-2 hover:underline">
                      {flow.title}
                    </Link>
                    <span className="text-muted-foreground block text-xs">{flow.id}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{AUDIENCE_LABEL[flow.audience]}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{Object.keys(flow.steps).length}</TableCell>
                  <TableCell className="tabular-nums">{flow.triggers.length}</TableCell>
                  <TableCell>{inMenus.length > 0 ? <Badge variant="secondary">{inMenus.length === 1 ? "Yes" : `${inMenus.length} cards`}</Badge> : <span className="text-muted-foreground text-xs">No</span>}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button render={<Link href={`/dashboard/support/flows/${encodeURIComponent(flow.id)}`} />} variant="ghost" size="icon-sm" aria-label={`Edit ${flow.title}`}>
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Delete ${flow.title}`} onClick={() => setDeleting(flow)}>
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {creating && <CreateDialog onClose={() => setCreating(false)} />}

      {deleting && refs && (
        <AlertDialog open onOpenChange={(open) => !open && setDeleting(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete “{deleting.title}”?</AlertDialogTitle>
              <AlertDialogDescription>
                {refs.cards + refs.steps > 0
                  ? `${refs.cards} menu ${refs.cards === 1 ? "card" : "cards"} and ${refs.steps} ${refs.steps === 1 ? "step" : "steps"} in other flows point at it. They'll be listed as problems until you point them somewhere else, and you can't publish before then.`
                  : "Nothing points at it. It goes from the draft; clients keep seeing it until you publish."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel render={<Button variant="outline" />}>Cancel</AlertDialogCancel>
              <AlertDialogAction render={<Button variant="destructive" />} onClick={() => remove(deleting)}>
                Delete flow
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
