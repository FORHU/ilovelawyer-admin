"use client"

import { useEffect, useRef, useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import {
  type AdminUserRow,
  useApproveUserMutation,
  useBlockUserMutation,
  useDenyUserMutation,
  useReactivateUserMutation,
  useUnblockUserMutation,
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
}: ConfirmActionButtonProps) {
  const [open, setOpen] = useState(false)
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
    <AlertDialog open={open} onOpenChange={(next) => !isPending && setOpen(next)}>
      <AlertDialogTrigger render={<Button variant={variant === "default" ? "default" : "outline"} size="sm" />}>
        {label}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel render={<Button variant="outline" disabled={isPending} />}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            render={<Button variant={variant === "destructive" ? "destructive" : "default"} />}
            onClick={onConfirm}
            disabled={isPending}
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
