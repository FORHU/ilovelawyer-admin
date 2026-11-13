"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { ProblemList } from "@/components/support/problem-list"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useDraftStore } from "@/lib/support/draft-store"
import { isDraftConflict, problemsOf, supportKeys, usePublishSupportMutation, useValidateSupportDraftMutation } from "@/lib/support/queries"
import type { AdminSupportDraft } from "@/lib/support/types"
import { useSaveDraft } from "@/lib/support/use-save-draft"
import { useQueryClient } from "@tanstack/react-query"

type Phase = "checking" | "blocked" | "ready" | "failed"

/**
 * Publishing: the draft is saved and checked first, so what is checked is what goes out. Problems
 * are listed with a link to each, and block publishing. A clean draft asks once more, because the
 * chat changes for every client the moment it goes out. Mounted only while open.
 */
export function PublishDialog({ onClose }: { onClose: () => void }) {
  const { save } = useSaveDraft()
  const validate = useValidateSupportDraftMutation()
  const publish = usePublishSupportMutation()
  const queryClient = useQueryClient()
  const problems = useDraftStore((s) => s.problems)
  const currentVersion = useDraftStore((s) => s.currentVersion)
  const [phase, setPhase] = useState<Phase>("checking")
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const saved = await save()
      if (cancelled) return
      if (!saved) {
        setMessage(useDraftStore.getState().conflict ? null : "The draft couldn't be saved, so it can't be checked.")
        return setPhase("failed")
      }
      try {
        const result = await validate.mutateAsync()
        if (cancelled) return
        useDraftStore.getState().setProblems(result.problems)
        setPhase(result.valid ? "ready" : "blocked")
      } catch (err) {
        if (cancelled) return
        setMessage((err as Error).message)
        setPhase("failed")
      }
    })()
    return () => {
      cancelled = true
    }
    // Runs once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const confirm = () =>
    publish.mutate(undefined, {
      onSuccess: async (result) => {
        toast.success(`Version ${result.version} is live`)
        // The server moved the draft onto the new version: take its copy as the baseline.
        await queryClient.refetchQueries({ queryKey: supportKeys.draft })
        const draft = queryClient.getQueryData<AdminSupportDraft>(supportKeys.draft)
        if (draft) useDraftStore.getState().load(draft)
        useDraftStore.getState().setProblems([])
        onClose()
      },
      onError: (err) => {
        const found = problemsOf(err)
        if (found.length > 0) {
          useDraftStore.getState().setProblems(found)
          return setPhase("blocked")
        }
        if (isDraftConflict(err)) {
          useDraftStore.getState().setConflict(true)
          return onClose()
        }
        setMessage((err as Error).message)
        setPhase("failed")
      },
    })

  return (
    <Dialog open onOpenChange={(open) => !open && !publish.isPending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Publish the Support Chat</DialogTitle>
          <DialogDescription>
            {phase === "checking" && "Saving and checking the draft…"}
            {phase === "blocked" && "The draft has problems. Fix them, then publish."}
            {phase === "ready" && `This becomes version ${currentVersion + 1}. Every client sees it as soon as it goes out; you can roll back from Versions.`}
            {phase === "failed" && (message ?? "Someone else changed the draft. Reload it from the bar, then publish again.")}
          </DialogDescription>
        </DialogHeader>
        {phase === "checking" && (
          <p className="text-muted-foreground flex items-center gap-2 text-sm" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Checking every flow
          </p>
        )}
        {phase === "blocked" && (
          <div className="max-h-72 overflow-y-auto pr-1">
            <ProblemList problems={problems} />
          </div>
        )}
        {phase === "ready" && (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-green-600" aria-hidden />
            No problems found.
          </p>
        )}
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" disabled={publish.isPending} />}>{phase === "ready" ? "Cancel" : "Close"}</DialogClose>
          {phase === "ready" && (
            <Button onClick={confirm} disabled={publish.isPending}>
              {publish.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Publish
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
