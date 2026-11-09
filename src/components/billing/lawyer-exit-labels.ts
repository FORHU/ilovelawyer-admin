import type { ExitReason, LawyerExitStatus } from "@/lib/billing/lawyer-exits"

export const EXIT_STATUS_LABELS: Record<LawyerExitStatus, string> = {
  REFUNDING: "Refund on its way",
  AWAITING_REVIEW: "Waiting on a decision",
  WAITING_ON_DISPUTE: "Waiting on the bank (dispute)",
  NEEDS_ATTENTION: "Refund failed",
  SETTLED: "Settled",
}

export const EXIT_REASON_LABELS: Record<ExitReason, string> = {
  CONFLICT: "Conflict of interest",
  CAPACITY: "No capacity",
  OUT_OF_SCOPE: "Outside their expertise",
  OTHER: "Other",
}

/** The exits an admin acts on. */
export const DECIDABLE_EXIT_STATUSES: LawyerExitStatus[] = ["AWAITING_REVIEW", "NEEDS_ATTENTION"]
