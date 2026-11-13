"use client"

import { useState } from "react"
import { Loader2, Undo2 } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDraftStore, useIsDirty } from "@/lib/support/draft-store"
import { supportKeys, useRollbackSupportMutation, useSupportVersionsQuery } from "@/lib/support/queries"
import type { AdminSupportDraft, AdminSupportVersion } from "@/lib/support/types"

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })

function RollbackDialog({ version, onClose }: { version: AdminSupportVersion; onClose: () => void }) {
  const rollback = useRollbackSupportMutation()
  const queryClient = useQueryClient()
  const dirty = useIsDirty()
  const unpublished = useDraftStore((s) => s.hasUnpublishedChanges)

  const confirm = () =>
    rollback.mutate(version.version, {
      onSuccess: async (result) => {
        toast.success(`Version ${version.version} is live again, as version ${result.version}`)
        // The draft now equals the restored content: take the server's copy so the editor shows it.
        await queryClient.refetchQueries({ queryKey: supportKeys.draft })
        const draft = queryClient.getQueryData<AdminSupportDraft>(supportKeys.draft)
        if (draft) {
          useDraftStore.getState().load(draft)
          useDraftStore.getState().setProblems([])
        }
        onClose()
      },
      onError: (err) => toast.error((err as Error).message),
    })

  return (
    <AlertDialog open onOpenChange={(open) => !open && !rollback.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Roll back to version {version.version}?</AlertDialogTitle>
          <AlertDialogDescription>
            Clients see version {version.version}&apos;s content again straight away. It is published as a new version, so nothing in the history is lost.
            {(dirty || unpublished) && " Your draft is replaced by it: any edits that aren't published are dropped."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel render={<Button variant="outline" disabled={rollback.isPending} />}>Cancel</AlertDialogCancel>
          <AlertDialogAction render={<Button variant="destructive" />} disabled={rollback.isPending} onClick={confirm}>
            {rollback.isPending && <Loader2 className="size-3.5 animate-spin" />}
            Roll back
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Every published version, newest first. Rolling back publishes an earlier version's content again as
 * the newest one, so the list only ever grows. */
export function VersionsPage() {
  const { data, isLoading, isError, error } = useSupportVersionsQuery()
  const [target, setTarget] = useState<AdminSupportVersion | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground max-w-3xl text-sm">
        What clients have seen, newest first. Rolling back puts an earlier version live again without deleting any version.
      </p>
      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
      {isError && <p className="text-destructive text-sm">{(error as Error).message}</p>}
      {data && (
        <div className="rounded-2xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Version</TableHead>
                <TableHead>Published</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="w-32">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground h-20 text-center">
                    Nothing published yet.
                  </TableCell>
                </TableRow>
              )}
              {data.map((v) => (
                <TableRow key={v.version}>
                  <TableCell className="tabular-nums">
                    <span className="font-medium">{v.version}</span>
                    {v.isCurrent && (
                      <Badge variant="secondary" className="ml-2">
                        Live
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{when(v.publishedAt)}</TableCell>
                  <TableCell>{v.publishedBy?.name ?? <span className="text-muted-foreground">System</span>}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {v.rolledBackFromVersion ? `Rolled back to version ${v.rolledBackFromVersion}` : v.version === 1 ? "Starting content" : ""}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" disabled={v.isCurrent} onClick={() => setTarget(v)}>
                        <Undo2 className="size-3.5" />
                        Roll back
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {target && <RollbackDialog version={target} onClose={() => setTarget(null)} />}
    </div>
  )
}
