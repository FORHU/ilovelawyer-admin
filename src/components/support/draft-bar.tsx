"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Loader2, RefreshCw, Save, ShieldCheck, Upload } from "lucide-react"
import { toast } from "sonner"

import { ProblemList } from "@/components/support/problem-list"
import { PublishDialog } from "@/components/support/publish-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useDraftStore, useIsDirty } from "@/lib/support/draft-store"
import { useSupportDraftQuery, useValidateSupportDraftMutation } from "@/lib/support/queries"
import { useSaveDraft } from "@/lib/support/use-save-draft"

/** Loads the draft into the store once, and keeps it there while the editor's pages come and go. */
export function DraftProvider({ children }: { children: React.ReactNode }) {
  const query = useSupportDraftQuery()
  const loaded = useDraftStore((s) => s.content !== null)

  useEffect(() => {
    if (query.data && !useDraftStore.getState().content) useDraftStore.getState().load(query.data)
  }, [query.data])

  if (query.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-destructive text-sm">{(query.error as Error).message}</p>
        <Button variant="outline" onClick={() => query.refetch()}>
          <RefreshCw className="size-3.5" />
          Try again
        </Button>
      </div>
    )
  }
  if (!loaded) return <p className="text-muted-foreground text-sm">Loading the draft…</p>
  return (
    <>
      <DraftBar />
      {children}
    </>
  )
}

/**
 * The draft's state and its three actions, always in view while editing: Save (sends the edits),
 * Check (saves, then asks the API what Publish would refuse) and Publish. Nothing an admin types
 * reaches clients until Publish; Save only keeps the draft. A save that finds someone else changed the
 * draft says so here and offers their version.
 */
function DraftBar() {
  const dirty = useIsDirty()
  const hasUnpublishedChanges = useDraftStore((s) => s.hasUnpublishedChanges)
  const currentVersion = useDraftStore((s) => s.currentVersion)
  const conflict = useDraftStore((s) => s.conflict)
  const problems = useDraftStore((s) => s.problems)
  const query = useSupportDraftQuery()
  const { save, saving } = useSaveDraft()
  const validate = useValidateSupportDraftMutation()
  const [publishing, setPublishing] = useState(false)
  const [reloading, setReloading] = useState(false)

  // Leaving the page would lose the edits that aren't saved.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const check = async () => {
    if (!(await save())) return
    validate.mutate(undefined, {
      onSuccess: (result) => {
        useDraftStore.getState().setProblems(result.problems)
        if (result.valid) toast.success("No problems found")
        else toast.error(`${result.problems.length} ${result.problems.length === 1 ? "problem" : "problems"} found`)
      },
      onError: (err) => toast.error((err as Error).message),
    })
  }

  const reload = async () => {
    setReloading(true)
    const result = await query.refetch()
    if (result.data) {
      useDraftStore.getState().load(result.data)
      useDraftStore.getState().setProblems([])
    } else toast.error("Couldn't reload the draft")
    setReloading(false)
  }

  const busy = saving || validate.isPending
  const changed = dirty || hasUnpublishedChanges

  return (
    <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-20 -mx-4 flex flex-col gap-3 border-b px-4 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2" role="status" aria-live="polite">
          {dirty ? (
            <Badge variant="secondary">Unsaved changes</Badge>
          ) : changed ? (
            <Badge variant="secondary">Saved, not published</Badge>
          ) : (
            <Badge variant="outline">
              <CheckCircle2 aria-hidden />
              Published
            </Badge>
          )}
          <span className="text-muted-foreground text-sm">Clients see version {currentVersion}{changed ? "; your changes aren't live" : ""}.</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={save} disabled={!dirty || busy || conflict}>
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Save
          </Button>
          <Button variant="outline" onClick={check} disabled={busy || conflict}>
            {validate.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
            Check
          </Button>
          <Button onClick={() => setPublishing(true)} disabled={busy || conflict || !changed}>
            <Upload className="size-3.5" />
            Publish
          </Button>
        </div>
      </div>

      {conflict && (
        <div role="alert" className="border-destructive/30 bg-destructive/5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-sm">
          <span>Someone else changed the draft while you were editing. Reload to see their version; your unsaved edits will be dropped.</span>
          <Button size="sm" variant="outline" onClick={reload} disabled={reloading}>
            {reloading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Reload their version
          </Button>
        </div>
      )}

      {problems.length > 0 && !publishing && (
        <details className="rounded-2xl border px-3 py-2" open>
          <summary className="cursor-pointer text-sm font-medium">
            {problems.length} {problems.length === 1 ? "problem" : "problems"} to fix before publishing
          </summary>
          <div className="mt-2 max-h-48 overflow-y-auto">
            <ProblemList problems={problems} />
          </div>
        </details>
      )}

      {publishing && <PublishDialog onClose={() => setPublishing(false)} />}
    </div>
  )
}
