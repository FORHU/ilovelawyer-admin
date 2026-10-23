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
  REJECTION_REASONS_BY_SITE,
  UK_JURISDICTIONS,
  type AdminLawyerVerificationRow,
  type LawyerRejectionReason,
  type LawyerSite,
  type UkJurisdiction,
  useRejectLawyerMutation,
  useVerifyLawyerMutation,
} from "@/lib/lawyers/queries"

/** Each site's reasons, in its own wording. NAME_MISMATCH is in both, checked against a different
 * record. */
const REJECTION_REASON_LABELS: Record<LawyerSite, Partial<Record<LawyerRejectionReason, string>>> = {
  UK: {
    NAME_MISMATCH: "Name doesn't match the register",
    NOT_PRACTISING: "Not currently practising",
    WRONG_JURISDICTION: "Wrong jurisdiction",
    OTHER: "Other",
  },
  PH: {
    NAME_MISMATCH: "Name doesn't match the Roll of Attorneys",
    ROLL_NOT_FOUND: "Roll number not found",
    NOT_IN_GOOD_STANDING: "Not in good standing with the IBP",
    OTHER: "Other",
  },
}

const selectClass =
  "h-8 w-full rounded-2xl border border-transparent bg-input/50 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"

export function LawyerVerificationActions({ lawyer }: { lawyer: AdminLawyerVerificationRow }) {
  const status = lawyer.profile.verification.status

  if (status === "VERIFIED")
    return (
      <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
        Approved
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

/** The jurisdictions a UK lawyer claimed; none on PH. */
function claimedJurisdictions(lawyer: AdminLawyerVerificationRow): UkJurisdiction[] {
  const r = lawyer.profile.registration
  return r.country === "UK" ? r.qualifiedJurisdictions : []
}

function VerifyDialog({ lawyer }: { lawyer: AdminLawyerVerificationRow }) {
  const verifyMutation = useVerifyLawyerMutation()
  const [open, setOpen] = useState(false)
  const [confirmed, setConfirmed] = useState<UkJurisdiction[]>(() => claimedJurisdictions(lawyer))
  const [note, setNote] = useState("")
  // UK: the admin confirms the jurisdictions on the register. PH has none to confirm.
  const uk = lawyer.profile.country === "UK"

  // A register mismatch needs the admin to say why they're approving anyway. The register check
  // is deferred for now (registerCheck is always null), so this only bites once it lands.
  const noteRequired = (lawyer.registerCheck?.mismatches.length ?? 0) > 0
  const canSubmit = (!uk || confirmed.length > 0) && (!noteRequired || note.trim().length > 0)

  function toggleJurisdiction(jurisdiction: UkJurisdiction) {
    setConfirmed((prev) =>
      prev.includes(jurisdiction) ? prev.filter((j) => j !== jurisdiction) : [...prev, jurisdiction]
    )
  }

  function handleVerify() {
    verifyMutation.mutate(
      { userId: lawyer.userId, confirmedJurisdictions: uk ? confirmed : undefined, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`${lawyer.name} approved`)
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
          setConfirmed(claimedJurisdictions(lawyer))
          setNote("")
        }
        setOpen(next)
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>Approve</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve {lawyer.name}?</DialogTitle>
          <DialogDescription>
            {uk
              ? "Confirm which jurisdictions the register shows they're qualified in. They can start receiving client requests once approved."
              : "Check their Roll of Attorneys number and IBP chapter. Their profile shows an Approved badge once approved."}
          </DialogDescription>
        </DialogHeader>
        {uk && (
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
        )}
        <div className="flex flex-col gap-2">
          <Label className="font-normal select-text">
            Note for the audit log{noteRequired ? " — required, the register didn't match" : " (optional)"}
          </Label>
          <Textarea
            placeholder={noteRequired ? "Explain the mismatch" : "Only admins see this, not the lawyer"}
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
            {verifyMutation.isPending ? "Approving…" : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RejectDialog({ lawyer }: { lawyer: AdminLawyerVerificationRow }) {
  const rejectMutation = useRejectLawyerMutation()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<LawyerRejectionReason | "">("")
  const [note, setNote] = useState("")

  // Each canned reason sends the lawyer a standard sentence, with the note appended. OTHER has no
  // sentence — the note is the whole message, so the API requires it.
  const noteRequired = reason === "OTHER"
  const canSubmit = reason !== "" && (!noteRequired || note.trim().length > 0)

  function handleReject() {
    if (reason === "") return
    rejectMutation.mutate(
      { userId: lawyer.userId, reason, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(`${lawyer.name} rejected`)
          setOpen(false)
          setReason("")
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
        if (next) {
          setReason("")
          setNote("")
        }
        setOpen(next)
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Reject</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject {lawyer.name}?</DialogTitle>
          <DialogDescription>
            They&apos;ll be emailed the reason and your note, and won&apos;t receive client requests.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`reject-reason-${lawyer.userId}`} className="font-normal select-text">
            Reason
          </Label>
          <select
            id={`reject-reason-${lawyer.userId}`}
            className={selectClass}
            value={reason}
            onChange={(e) => setReason(e.target.value as LawyerRejectionReason | "")}
            disabled={rejectMutation.isPending}
          >
            <option value="" disabled>
              Choose a reason…
            </option>
            {REJECTION_REASONS_BY_SITE[lawyer.profile.country].map((r) => (
              <option key={r} value={r}>
                {REJECTION_REASON_LABELS[lawyer.profile.country][r]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`reject-note-${lawyer.userId}`} className="font-normal select-text">
            {noteRequired ? "Message to the lawyer — required" : "Extra detail for the lawyer (optional)"}
          </Label>
          <Textarea
            id={`reject-note-${lawyer.userId}`}
            placeholder={noteRequired ? "Explain why they weren't approved" : "Added after the standard sentence"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            disabled={rejectMutation.isPending}
          />
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={rejectMutation.isPending} />}>Cancel</DialogClose>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={!canSubmit || rejectMutation.isPending}
          >
            {rejectMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
            {rejectMutation.isPending ? "Rejecting…" : "Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
