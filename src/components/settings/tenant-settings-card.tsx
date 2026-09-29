"use client"

import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  type TenantSettings,
  useApprovePendingMutation,
  useUpdateTenantSettingMutation,
} from "@/lib/settings/queries"

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`
}

export function TenantSettingsCard({ tenant }: { tenant: TenantSettings }) {
  const updateMutation = useUpdateTenantSettingMutation()
  const approveMutation = useApprovePendingMutation()
  const [confirmEnableOpen, setConfirmEnableOpen] = useState(false)
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false)

  const run = tenant.bulkApproval
  const running = run?.status === "running"

  function saveAutoApprove(autoApproveSignups: boolean) {
    updateMutation.mutate(
      { code: tenant.code, autoApproveSignups },
      {
        onSuccess: () => {
          toast.success(`Auto-approve ${autoApproveSignups ? "turned on" : "turned off"} for ${tenant.name}`)
          setConfirmEnableOpen(false)
        },
        onError: (err) => toast.error((err as Error).message),
      }
    )
  }

  // Turning auto-approve on lets people in with no review, so it asks first. Turning it off
  // is the safe direction and saves straight away.
  function handleSwitchChange(checked: boolean) {
    if (checked) setConfirmEnableOpen(true)
    else saveAutoApprove(false)
  }

  function startBulkApproval() {
    approveMutation.mutate(tenant.code, {
      onSuccess: ({ total }) => {
        setConfirmBulkOpen(false)
        toast.success(
          total === 0 ? "No accounts are waiting for approval" : `Approving ${plural(total, "account")} in the background`
        )
      },
      onError: (err) => {
        setConfirmBulkOpen(false)
        toast.error((err as Error).message)
      },
    })
  }

  // Announce a run finishing — including one started by another admin or before this page
  // was opened — only on the running → done edge the polling query observes.
  const queryClient = useQueryClient()
  const wasRunning = useRef(running)
  useEffect(() => {
    if (wasRunning.current && run?.status === "done") {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
      const summary = `${plural(run.approved, "account")} approved for ${tenant.name}`
      const extras = [run.skipped && `${run.skipped} skipped`, run.failed && `${run.failed} failed`].filter(Boolean)
      if (run.failed) toast.warning(`${summary} · ${extras.join(" · ")}`)
      else toast.success(extras.length ? `${summary} · ${extras.join(" · ")}` : summary)
    }
    wasRunning.current = running
  }, [running, run, tenant.name, queryClient])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-xs">{tenant.code}</span>
          {tenant.name}
        </CardTitle>
      </CardHeader>
      {/* flex-1 keeps the footers level when the two cards sit side by side at different heights. */}
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor={`auto-approve-${tenant.code}`} className="font-medium">
              Auto-approve new signups
            </label>
            <p className="text-muted-foreground">
              New {tenant.code} accounts become active as soon as the email is verified, with no admin review.
              Accounts already waiting aren&apos;t affected.
            </p>
          </div>
          <Switch
            id={`auto-approve-${tenant.code}`}
            checked={tenant.autoApproveSignups}
            onCheckedChange={handleSwitchChange}
            disabled={updateMutation.isPending}
          />
        </div>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="font-medium">Pending signups</span>
            {running ? (
              <>
                <p className="text-muted-foreground tabular-nums">
                  Approving {run.done} of {run.total}… You can leave this page.
                </p>
                <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full transition-[width]"
                    style={{ width: `${run.total ? (run.done / run.total) * 100 : 0}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-muted-foreground tabular-nums">
                {tenant.pendingCount === 0
                  ? "No verified accounts are waiting for approval."
                  : `${plural(tenant.pendingCount, "verified account")} waiting for approval.`}
                {run?.status === "done" && run.finishedAt && (
                  <>
                    {" "}
                    Last run {formatDateTime(run.finishedAt)}: {run.approved} approved
                    {run.skipped > 0 && `, ${run.skipped} skipped`}
                    {run.failed > 0 && `, ${run.failed} failed`}.
                  </>
                )}
              </p>
            )}
          </div>
          {!running && tenant.pendingCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => setConfirmBulkOpen(true)}>
              Approve all pending ({tenant.pendingCount})
            </Button>
          )}
          {running && (
            <Button variant="outline" size="sm" disabled>
              <Loader2 className="size-3.5 animate-spin" />
              Approving…
            </Button>
          )}
        </div>
      </CardContent>
      <CardFooter className="text-muted-foreground border-t text-xs">
        {tenant.updatedAt
          ? `Auto-approve last changed by ${tenant.updatedBy?.name ?? tenant.updatedBy?.email ?? "a deleted admin"} · ${formatDateTime(tenant.updatedAt)}`
          : "Auto-approve has never been changed · off by default"}
      </CardFooter>

      <AlertDialog open={confirmEnableOpen} onOpenChange={(next) => !updateMutation.isPending && setConfirmEnableOpen(next)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Turn on auto-approve for {tenant.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              From now on, anyone who signs up on the {tenant.code} site and verifies their email gets full access with no
              admin review. You can turn this off at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="outline" disabled={updateMutation.isPending} />}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              render={<Button />}
              onClick={() => saveAutoApprove(true)}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
              {updateMutation.isPending ? "Turning on…" : "Turn on"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmBulkOpen} onOpenChange={(next) => !approveMutation.isPending && setConfirmBulkOpen(next)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Approve {plural(tenant.pendingCount, "pending account")} for {tenant.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Each person gets the usual approval email with a login link. This runs in the background and can&apos;t be
              undone in bulk.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="outline" disabled={approveMutation.isPending} />}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction render={<Button />} onClick={startBulkApproval} disabled={approveMutation.isPending}>
              {approveMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
              {approveMutation.isPending ? "Starting…" : `Approve ${tenant.pendingCount}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
