import { Clock, MessageCircleReply, CheckCircle2, Inbox } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { SupportTicketStatus } from "@/lib/support/types"
import { useSupportDraftQuery } from "@/lib/support/queries"

const STATUS: Record<SupportTicketStatus, { label: string; variant: "default" | "secondary" | "outline"; icon: typeof Inbox }> = {
  OPEN: { label: "Open", variant: "default", icon: Inbox },
  ANSWERED: { label: "Answered", variant: "secondary", icon: MessageCircleReply },
  RESOLVED: { label: "Resolved", variant: "outline", icon: CheckCircle2 },
}

export const STATUS_LABEL: Record<SupportTicketStatus, string> = { OPEN: "Open", ANSWERED: "Answered", RESOLVED: "Resolved" }

/** The ticket's status as a word and an icon, so it never rests on colour alone. */
export function StatusBadge({ status }: { status: SupportTicketStatus }) {
  const { label, variant, icon: Icon } = STATUS[status]
  return (
    <Badge variant={variant}>
      <Icon aria-hidden />
      {label}
    </Badge>
  )
}

/** Open, and the client's last message is more than a day old: the greeting promised a reply by now. */
export function OverdueBadge() {
  return (
    <Badge variant="destructive">
      <Clock aria-hidden />
      Overdue
    </Badge>
  )
}

/** "3h", "2d 4h": how long ago, in the unit that helps decide what to answer first. */
export function formatAge(hours: number): string {
  if (hours < 1) return "<1h"
  if (hours < 48) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export const whenOf = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })

/** Flow ids to titles, from the draft (cached after the editor opens), so a ticket says "Refund" and
 * not "refund". An id with no title is shown as it is. */
export function useFlowTitle(): (flowId: string) => string {
  const flows = useSupportDraftQuery().data?.content.flows
  return (flowId) => flows?.[flowId]?.title ?? flowId
}
