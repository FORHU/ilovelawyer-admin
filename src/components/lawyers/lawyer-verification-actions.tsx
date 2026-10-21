"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  UK_JURISDICTIONS,
  type AdminLawyerVerificationRow,
  type UkJurisdiction,
  useRejectLawyerMutation,
  useVerifyLawyerMutation,
} from "@/lib/lawyers/queries"

export function LawyerVerificationActions({ lawyer }: { lawyer: AdminLawyerVerificationRow }) {
  const status = lawyer.profile.verification.status

  if (status === "VERIFIED")
    return (
      <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
        Verified
      </Badge>
    )

  if (status === "REJECTED") {
    const badge = (
      <Badge variant="outline" className="border-destructive/40 text-destructive">
        Rejected
      </Badge>
    )
    const note = lawyer.profile.verification.note
    if (!note) return badge
    return (
      <Tooltip>
        <TooltipTrigger render={<button type="button" className="cursor-help" />}>{badge}</TooltipTrigger>
        <TooltipContent className="max-w-xs whitespace-normal">{note}</TooltipContent>
      </Tooltip>
    )
  }

  if (status === "UNSUBMITTED") return <span className="text-muted-foreground text-xs">Profile incomplete</span>

  return (
    <div className="flex items-center gap-2">
      <VerifyDialog lawyer={lawyer} />
      <RejectDialog lawyer={lawyer} />
    </div>
  )
}

function VerifyDialog({ lawyer }: { lawyer: AdminLawyerVerificationRow }) {
  const verifyMutation = useVerifyLawyerMutation()
  const [open, setOpen] = useState(false)
  const [confirmed, setConfirmed] = useState<UkJurisdiction[]>(lawyer.profile.qualifiedJurisdictions)
  const [note, setNote] = useState("")

  // The API 400s a verify with a register mismatch and no note — enforced here too, so the
  // admin finds out before submitting instead of from a failed request.
  const noteRequired = (lawyer.registerCheck?.mismatches.length ?? 0) > 0
  const canSubmit = confirmed.length > 0 && (!noteRequired || note.trim().length > 0)

  function toggleJurisdiction(jurisdiction: UkJurisdiction) {
    setConfirmed((prev) =>
      prev.includes(jurisdiction) ? prev.filter((j) => j !== jurisdiction) : [...prev, jurisdiction]
    )
  }

  function handleVerify() {
    verifyMutation.mutate(
      { userId: lawyer.userId, confirmedJurisdictions: confirmed, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`${lawyer.name} verified`)
          setOpen(false)
        },
        onError: (err) => toast.error((err as Error).message),
      }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (verifyMutation.isPending) return
        if (next) {
          setConfirmed(lawyer.profile.qualifiedJurisdictions)
          setNote("")
        }
        setOpen(next)
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>Verify</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify {lawyer.name}?</DialogTitle>
          <DialogDescription>
            Confirm which jurisdictions they&apos;re qualified in before they start receiving client requests.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {UK_JURISDICTIONS.map((jurisdiction) => {
            const id = `jurisdiction-${lawyer.userId}-${jurisdiction}`
            return (
              <div key={jurisdiction} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={confirmed.includes(jurisdiction)}
                  onCheckedChange={() => toggleJurisdiction(jurisdiction)}
                  disabled={verifyMutation.isPending}
                />
                <Label htmlFor={id} className="font-normal select-text">
                  {jurisdiction}
                </Label>
              </div>
            )
          })}
        </div>
        <div className="flex flex-col gap-2">
          <Label className="font-normal select-text">
            Note{noteRequired ? " — required, the register didn't match" : " (optional)"}
          </Label>
          <Textarea
            placeholder={noteRequired ? "Explain the mismatch" : "Optional note"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            disabled={verifyMutation.isPending}
          />
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={verifyMutation.isPending} />}>Cancel</DialogClose>
          <Button onClick={handleVerify} disabled={!canSubmit || verifyMutation.isPending}>
            {verifyMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
            {verifyMutation.isPending ? "Verifying…" : "Verify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RejectDialog({ lawyer }: { lawyer: AdminLawyerVerificationRow }) {
  const rejectMutation = useRejectLawyerMutation()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState("")

  function handleReject() {
    rejectMutation.mutate(
      { userId: lawyer.userId, note: note.trim() },
      {
        onSuccess: () => {
          toast.success(`${lawyer.name} rejected`)
          setOpen(false)
          setNote("")
        },
        onError: (err) => toast.error((err as Error).message),
      }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (rejectMutation.isPending) return
        if (next) setNote("")
        setOpen(next)
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Reject</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject {lawyer.name}?</DialogTitle>
          <DialogDescription>They&apos;ll see this note and drop out of client-request routing.</DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Reason (required)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          disabled={rejectMutation.isPending}
        />
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={rejectMutation.isPending} />}>Cancel</DialogClose>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={!note.trim() || rejectMutation.isPending}
          >
            {rejectMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
            {rejectMutation.isPending ? "Rejecting…" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
