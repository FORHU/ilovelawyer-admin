"use client"

import { type ReactElement, useEffect, useId, useRef, useState } from "react"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { badgeVariants } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  type AdminUserRow,
  useApproveUserMutation,
  useBlockUserMutation,
  useDeleteUserMutation,
  useDenyUserMutation,
  useExportUserDataMutation,
  useReactivateUserMutation,
  useUnblockUserMutation,
  useVerifyEmailMutation,
} from "@/lib/users/queries"

interface ConfirmActionButtonProps {
  label: string
  confirmLabel: string
  pendingLabel: string
  title: string
  description: string
  variant?: "default" | "outline" | "destructive"
  onConfirm: () => void
  isPending: boolean
  /** Element the dialog opens from — defaults to a small Button showing `label`. */
  trigger?: ReactElement
  /** When set, the admin must type this text (case-insensitive) before the confirm button
   * enables — a second safeguard for irreversible actions. */
  confirmPhrase?: string
}

function ConfirmActionButton({
  label,
  confirmLabel,
  pendingLabel,
  title,
  description,
  variant = "default",
  onConfirm,
  isPending,
  trigger,
  confirmPhrase,
}: ConfirmActionButtonProps) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState("")
  const phraseInputId = useId()
  const phraseMatches = !confirmPhrase || typed.trim().toLowerCase() === confirmPhrase.toLowerCase()
  // AlertDialogAction here is a plain Button (see alert-dialog.tsx), not a
  // dialog-closing primitive — closing early would hide the pending state before
  // it ever renders. Instead, close once the mutation settles (isPending flips
  // back to false) while the dialog is still open.
  const wasPending = useRef(false)
  useEffect(() => {
    if (wasPending.current && !isPending) setOpen(false)
    wasPending.current = isPending
  }, [isPending])

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (isPending) return
        // Clear on every open so a half-typed phrase never carries over to the next attempt.
        if (next) setTyped("")
        setOpen(next)
      }}
    >
      <AlertDialogTrigger render={trigger ?? <Button variant={variant === "default" ? "default" : "outline"} size="sm" />}>
        {label}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {confirmPhrase && (
          <div className="flex flex-col gap-2">
            <Label htmlFor={phraseInputId} className="block leading-normal font-normal select-text">
              Type <span className="font-medium">{confirmPhrase}</span> to confirm
            </Label>
            <Input
              id={phraseInputId}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={confirmPhrase}
              autoComplete="off"
              spellCheck={false}
              disabled={isPending}
            />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel render={<Button variant="outline" disabled={isPending} />}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            render={<Button variant={variant === "destructive" ? "destructive" : "default"} />}
            onClick={onConfirm}
            disabled={isPending || !phraseMatches}
          >
            {isPending && <Loader2 className="size-3.5 animate-spin" />}
            {isPending ? pendingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function UserApprovalActions({ user }: { user: AdminUserRow }) {
  const approveMutation = useApproveUserMutation()
  const denyMutation = useDenyUserMutation()
  const reactivateMutation = useReactivateUserMutation()
  const blockMutation = useBlockUserMutation()
  const unblockMutation = useUnblockUserMutation()
  const [reason, setReason] = useState("")
  const [denyOpen, setDenyOpen] = useState(false)

  const displayName = user.name ?? user.username

  function withToast(mutation: { mutate: (id: string, opts: { onSuccess: () => void; onError: (err: unknown) => void }) => void }, verb: string) {
    mutation.mutate(user.id, {
      onSuccess: () => toast.success(`${displayName} ${verb} — notified by email`),
      onError: (err) => toast.error((err as Error).message),
    })
  }

  function handleDeny() {
    denyMutation.mutate(
      { userId: user.id, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`${displayName} denied — notified by email`)
          setDenyOpen(false)
          setReason("")
        },
        onError: (err) => toast.error((err as Error).message),
      }
    )
  }

  if (user.approvalStatus === "PENDING") {
    return (
      <div className="flex items-center gap-2">
        <ConfirmActionButton
          label="Approve"
          confirmLabel="Approve"
          pendingLabel="Approving…"
          title={`Approve ${displayName}?`}
          description={`They'll be notified by email at ${user.email} and can immediately access the app.`}
          onConfirm={() => withToast(approveMutation, "approved")}
          isPending={approveMutation.isPending}
        />
        <Dialog open={denyOpen} onOpenChange={(next) => !denyMutation.isPending && setDenyOpen(next)}>
          <DialogTrigger render={<Button variant="outline" size="sm" />}>Deny</DialogTrigger>
          <DenyDialogBody user={user} reason={reason} setReason={setReason} onDeny={handleDeny} pending={denyMutation.isPending} />
        </Dialog>
      </div>
    )
  }

  if (user.approvalStatus === "DENIED") {
    return (
      <ConfirmActionButton
        label="Reactivate"
        confirmLabel="Reactivate"
        pendingLabel="Reactivating…"
        title={`Reactivate ${displayName}?`}
        description={`They'll be notified by email at ${user.email} and can immediately access the app.`}
        onConfirm={() => withToast(reactivateMutation, "reactivated")}
        isPending={reactivateMutation.isPending}
      />
    )
  }

  if (user.approvalStatus === "ACTIVE") {
    return (
      <ConfirmActionButton
        label="Block"
        confirmLabel="Block"
        pendingLabel="Blocking…"
        title={`Block ${displayName}?`}
        description={`They'll be notified by email at ${user.email} and immediately lose access to the app.`}
        variant="destructive"
        onConfirm={() => withToast(blockMutation, "blocked")}
        isPending={blockMutation.isPending}
      />
    )
  }

  // BLOCKED
  return (
    <ConfirmActionButton
      label="Unblock"
      confirmLabel="Unblock"
      pendingLabel="Unblocking…"
      title={`Unblock ${displayName}?`}
      description={`They'll be notified by email at ${user.email} and can access the app again.`}
      onConfirm={() => withToast(unblockMutation, "unblocked")}
      isPending={unblockMutation.isPending}
    />
  )
}

/** Shown on every row regardless of approval status. The admin must type the user's email
 * before Delete enables; it then deletes immediately — no grace period, no undo, and no email
 * to the user. */
export function DeleteUserAction({ user }: { user: AdminUserRow }) {
  const deleteMutation = useDeleteUserMutation()
  const displayName = user.name ?? user.username

  return (
    <ConfirmActionButton
      label="Delete"
      confirmLabel="Delete"
      pendingLabel="Deleting…"
      title={`Delete ${displayName}'s account?`}
      description={`This permanently deletes ${user.email} and all of their data. This can't be undone.`}
      variant="destructive"
      trigger={<Button variant="destructive" size="sm" />}
      confirmPhrase={user.email}
      onConfirm={() =>
        deleteMutation.mutate(user.id, {
          onSuccess: () => toast.success(`${displayName}'s account was deleted`),
          onError: (err) => toast.error((err as Error).message),
        })
      }
      isPending={deleteMutation.isPending}
    />
  )
}

/** Produces the person's data export on their behalf, for a request that came by email or from
 * someone who can't sign in. The admin can't enter the person's password, so they confirm that
 * they have checked who is asking. The API records the export under the admin's name. */
export function ExportUserDataAction({ user }: { user: AdminUserRow }) {
  const exportMutation = useExportUserDataMutation()
  const [open, setOpen] = useState(false)
  const [verified, setVerified] = useState(false)
  const verifiedId = useId()
  const displayName = user.name ?? user.username

  function handleExport() {
    exportMutation.mutate(user.id, {
      onSuccess: () => {
        toast.success(`${displayName}'s data export downloaded`)
        setOpen(false)
      },
      onError: (err) => toast.error((err as Error).message),
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (exportMutation.isPending) return
        // A tick from an earlier attempt must never carry over to the next person.
        if (next) setVerified(false)
        setOpen(next)
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Export data</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export {displayName}&apos;s data</DialogTitle>
          <DialogDescription>
            Downloads the same zip the person can get from their own profile: a PDF summary, the complete record
            and their uploaded files. Only do this for a request you have checked. It is recorded in the audit
            trail under your name.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-3">
          <Checkbox id={verifiedId} checked={verified} onCheckedChange={(next) => setVerified(next === true)} disabled={exportMutation.isPending} />
          <Label htmlFor={verifiedId} className="block leading-normal font-normal select-text">
            I have verified that the person asking for this is the owner of <span className="font-medium">{user.email}</span>.
          </Label>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={exportMutation.isPending} />}>Cancel</DialogClose>
          <Button onClick={handleExport} disabled={!verified || exportMutation.isPending}>
            {exportMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
            {exportMutation.isPending ? "Preparing…" : "Export data"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** The Verified column's amber "Unverified" badge, clickable to mark the email verified. */
export function UnverifiedBadge({ user }: { user: AdminUserRow }) {
  const verifyMutation = useVerifyEmailMutation()
  const displayName = user.name ?? user.username

  return (
    <ConfirmActionButton
      label="Unverified"
      confirmLabel="Mark verified"
      pendingLabel="Verifying…"
      title={`Mark ${displayName}'s email as verified?`}
      description={`${user.email} will be treated as verified, so they can sign in without entering the emailed code.`}
      trigger={
        <button
          type="button"
          title="Click to mark as verified"
          className={cn(
            badgeVariants({ variant: "outline" }),
            "cursor-pointer border-amber-500/40 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
          )}
        />
      }
      onConfirm={() =>
        verifyMutation.mutate(user.id, {
          onSuccess: () => toast.success(`${displayName}'s email marked as verified`),
          onError: (err) => toast.error((err as Error).message),
        })
      }
      isPending={verifyMutation.isPending}
    />
  )
}

function DenyDialogBody({
  user,
  reason,
  setReason,
  onDeny,
  pending,
}: {
  user: AdminUserRow
  reason: string
  setReason: (value: string) => void
  onDeny: () => void
  pending: boolean
}) {
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Deny {user.name ?? user.username}&apos;s signup</DialogTitle>
        <DialogDescription>
          Optional — this reason is included in the denial email sent to {user.email}.
        </DialogDescription>
      </DialogHeader>
      <Textarea
        placeholder="Reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={500}
      />
      <DialogFooter>
        <DialogClose render={<Button variant="outline" disabled={pending} />}>Cancel</DialogClose>
        <Button variant="destructive" onClick={onDeny} disabled={pending}>
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          {pending ? "Denying…" : "Deny signup"}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
