"use client"

import { useParams } from "next/navigation"

import { TicketDetail } from "@/components/support/ticket-detail"

/** /dashboard/support/tickets/[id]: one ticket's conversation and context. */
export default function SupportTicketPage() {
  const id = useParams<{ id: string }>().id
  return <TicketDetail key={id} id={id} />
}
