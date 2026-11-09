"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatMoney } from "@/components/billing/format"
import { EXIT_REASON_LABELS } from "@/components/billing/lawyer-exit-labels"
import { type AdminLawyerExit, useDecideLawyerExitMutation } from "@/lib/billing/lawyer-exits"

const NOTE_MAX = 1000

/** An amount typed in major units, 0 included ("nothing back"): "12.5" -> 1250; null otherwise. */
function amountToMinor(input: string): number | null {
  const trimmed = input.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null
  return Math.round(Number(trimmed) * 100)
}

/**
 * An admin's decision on a Lawyer Exit waiting on one: the lawyer claimed work done, or the refund
 * failed. How much the client gets back: nothing; part of it, out of the lawyer's share (the platform
 * fee is kept), the unworked part by default; or everything left, the platform fee too, when the
 * reason wasn't good enough. Asks once more before anything goes to Stripe.
 */
export function LawyerExitDecideDialog({ exit }: { exit: AdminLawyerExit }) {
  const mutation = useDecideLawyerExitMutation()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"form" | "confirm">("form")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const payment = exit.payment
  if (!payment) return null

  const currency = payment.amount.currency
  const left = payment.refundable.amountMinor
  const serviceLeft = payment.refundableServiceFee.amountMinor
  // The unworked part: the lawyer's share less what they claimed, never below nothing.
  const unworked = Math.max(0, Math.min(serviceLeft, serviceLeft - (exit.claimed?.amountMinor ?? 0)))
  const amountMinor = amountToMinor(amount)
  const full = amountMinor !== null && amountMinor === left && left > 0
  const amountError =
    amount.trim() === ""
      ? "Enter an amount, 0.00 for none"
      : amountMinor === null
        ? "Enter an amount like 49.99"
        : amountMinor > left
          ? `At most ${formatMoney({ amountMinor: left, currency })}`
          : !full && amountMinor > serviceLeft
            ? `Part of it comes out of the lawyer's share: at most ${formatMoney({ amountMinor: serviceLeft, currency })}. Or refund everything, ${formatMoney({ amountMinor: left, currency })}.`
            : null
  const refund = { amountMinor: amountMinor ?? 0, currency }

  async function decide() {
    try {
      const after = await mutation.mutateAsync({ id: exit.id, refund, note: note.trim() || undefined })
      if (after.status === "REFUNDING") toast.success(`Refund of ${formatMoney(refund)} sent to Stripe; the exit settles once Stripe finishes it`)
      else toast.success(refund.amountMinor > 0 ? `Refunded ${formatMoney(refund)} to the client` : "Settled with no refund")
      setOpen(false)
    } catch (err) {
      toast.error((err as Error).message)
      setStep("form")
    }
  }

  const preset = (minor: number) => setAmount((minor / 100).toFixed(2))

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (mutation.isPending) return
        if (next) {
          setStep("form")
          // No work done: everything. Work claimed: the unworked part. The admin can change it.
          setAmount(((exit.workDone ? unworked : left) / 100).toFixed(2))
          setNote("")
        }
        setOpen(next)
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>Decide</DialogTrigger>
      <DialogContent>
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>Decide the refund</DialogTitle>
              <DialogDescription>
                {exit.lawyer.name ?? "The lawyer"} stopped acting ({EXIT_REASON_LABELS[exit.reason].toLowerCase()}).{" "}
                {exit.workDone && exit.claimed ? `They claim ${formatMoney(exit.claimed)} for work done.` : "They did no work."} The client paid {formatMoney(payment.amount)}:{" "}
                {formatMoney(payment.serviceFee)} for the lawyer and {formatMoney(payment.platformFee)} platform fee.
              </DialogDescription>
            </DialogHeader>
            {exit.note && (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">The lawyer&apos;s note</span>
                <p className="bg-muted rounded-xl px-3 py-2 text-sm break-words whitespace-pre-wrap">{exit.note}</p>
              </div>
            )}
            {exit.claimNote && (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">The work they did</span>
                <p className="bg-muted rounded-xl px-3 py-2 text-sm break-words whitespace-pre-wrap">{exit.claimNote}</p>
              </div>
            )}
            {exit.failureReason && <p className="text-destructive text-sm">Last refund failed: {exit.failureReason}</p>}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => preset(0)}>
                Nothing
              </Button>
              {exit.workDone && (
                <Button type="button" variant="outline" size="sm" onClick={() => preset(unworked)}>
                  Unworked part ({formatMoney({ amountMinor: unworked, currency })})
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => preset(left)}>
                Everything ({formatMoney({ amountMinor: left, currency })})
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`exit-amount-${exit.id}`} className="font-normal select-text">
                Refund to the client ({currency})
              </Label>
              <Input id={`exit-amount-${exit.id}`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={!!amountError} />
              {amountError && <p className="text-destructive text-xs">{amountError}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`exit-note-${exit.id}`} className="font-normal select-text">
                Note (optional) — kept on the exit, not in the audit log
              </Label>
              <Textarea id={`exit-note-${exit.id}`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={NOTE_MAX} />
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <Button onClick={() => setStep("confirm")} disabled={!!amountError}>
                Review decision
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{refund.amountMinor > 0 ? `Refund ${formatMoney(refund)}?` : "Settle with no refund?"}</DialogTitle>
              <DialogDescription>
                {refund.amountMinor === 0
                  ? "The client gets nothing back. The lawyer's fee starts its hold, counted from when they closed."
                  : full
                    ? "Everything left, the platform fee included, goes back to the client, and the lawyer's fee is reversed."
                    : `${formatMoney(refund)} of the lawyer's share goes back to the client; the platform fee is kept. The rest of the lawyer's fee starts its hold.`}{" "}
                This can&apos;t be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("form")} disabled={mutation.isPending}>
                Back
              </Button>
              <Button variant={refund.amountMinor > 0 ? "destructive" : "default"} onClick={decide} disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                {mutation.isPending ? "Deciding…" : refund.amountMinor > 0 ? `Refund ${formatMoney(refund)}` : "Settle"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
