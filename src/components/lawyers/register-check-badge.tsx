"use client"

import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { type RegisterCheck, type RegisterMismatchReason } from "@/lib/lawyers/queries"

const MISMATCH_LABELS: Record<RegisterMismatchReason, string> = {
  NOT_FOUND: "Not found on register",
  NAME: "Name mismatch",
  NOT_PRACTISING: "Not currently practising",
  JURISDICTION: "Jurisdiction mismatch",
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

/** The acceptance criterion's "register mismatch shown" — a badge with the register's own
 * answer in a tooltip, so the admin can eyeball it against what the lawyer submitted without
 * leaving the row. */
export function RegisterCheckBadge({ registerCheck }: { registerCheck: RegisterCheck | null }) {
  if (!registerCheck) {
    return (
      <Badge variant="outline" className="border-slate-500/40 text-slate-600 dark:text-slate-400">
        Not checked
      </Badge>
    )
  }

  const clean = registerCheck.mismatches.length === 0
  const badge = clean ? (
    <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
      Register match
    </Badge>
  ) : (
    <Badge variant="outline" className="border-destructive/40 text-destructive">
      {registerCheck.mismatches.length === 1
        ? MISMATCH_LABELS[registerCheck.mismatches[0]]
        : `${registerCheck.mismatches.length} mismatches`}
    </Badge>
  )

  return (
    <Tooltip>
      <TooltipTrigger render={<button type="button" className="cursor-help" />}>{badge}</TooltipTrigger>
      <TooltipContent className="flex flex-col items-start gap-0.5 whitespace-normal">
        <span>On the register: {registerCheck.registeredName ?? "—"}</span>
        <span>Practising: {registerCheck.practising === null ? "Unknown" : registerCheck.practising ? "Yes" : "No"}</span>
        {registerCheck.admittedOn && <span>Admitted: {registerCheck.admittedOn}</span>}
        {!clean && <span>{registerCheck.mismatches.map((m) => MISMATCH_LABELS[m]).join(", ")}</span>}
        <span>Checked {formatDateTime(registerCheck.checkedAt)}</span>
      </TooltipContent>
    </Tooltip>
  )
}
