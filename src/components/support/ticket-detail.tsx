"use client"

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Info, Loader2, RotateCcw, Send } from "lucide-react"
import { toast } from "sonner"

import { clientBillingHref } from "@/components/billing/columns"
import { OverdueBadge, StatusBadge, useFlowTitle, whenOf } from "@/components/support/ticket-status"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useReopenTicketMutation, useReplyToTicketMutation, useResolveTicketMutation, useSupportTicketQuery } from "@/lib/support/queries"
import type { SupportTicketDetail, SupportTicketMessage } from "@/lib/support/types"

/** The API's limit (SUPPORT_MESSAGE_MAX_LENGTH). */
const REPLY_MAX = 4000

const onError = (err: unknown) => toast.error((err as Error).message)

function Message({ message }: { message: SupportTicketMessage }) {
  if (message.author === "SYSTEM") {
    return (
      <li className="bg-muted text-muted-foreground flex items-start gap-2 self-center rounded-2xl px-3.5 py-2 text-xs">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          <span className="sr-only">Note: </span>
          {message.body}
        </span>
      </li>
    )
  }
  const team = message.author === "ADMIN"
  return (
    <li className={cn("flex max-w-[85%] flex-col gap-1", team ? "items-end self-end" : "items-start self-start")}>
      <span className="text-muted-foreground text-xs">
        {message.authorName} · {whenOf(message.createdAt)}
      </span>
      <p className={cn("rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap", team ? "bg-primary text-primary-foreground" : "bg-muted")}>{message.body}</p>
    </li>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  )
}

/** What the chat attached when the ticket opened. Ids, a status and a page path only: the chat never
 * sends case documents, AI chats or party names, and there is no request page in the admin to link to. */
function ContextPanel({ ticket }: { ticket: SupportTicketDetail }) {
  const flowTitle = useFlowTitle()
  const { context } = ticket
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">About this ticket</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-3">
          <Row label="From">
            {ticket.name ?? "Not given"}
            <span className="text-muted-foreground block">{ticket.email}</span>
            {ticket.source === "SIGNED_OUT" ? (
              <Badge variant="outline" className="mt-1">
                Signed out
              </Badge>
            ) : ticket.userId ? (
              <Link href={clientBillingHref(ticket.userId)} className="mt-1 block text-xs underline underline-offset-2">
                Open the client&apos;s billing
              </Link>
            ) : null}
          </Row>
          <Row label="Topics tried first">
            {context.flowPath.length === 0 ? (
              <span className="text-muted-foreground">None: they went straight to the team</span>
            ) : (
              <ol className="list-inside list-decimal">
                {context.flowPath.map((id, i) => (
                  <li key={`${id}-${i}`}>{flowTitle(id)}</li>
                ))}
              </ol>
            )}
          </Row>
          <Row label="Page they were on">{context.page ?? <span className="text-muted-foreground">Not recorded</span>}</Row>
          {context.caseId && (
            <Row label="Case">
              <code className="bg-muted rounded px-1 text-xs break-all">{context.caseId}</code>
            </Row>
          )}
          {context.clientRequestId && (
            <Row label="Lawyer request">
              <code className="bg-muted rounded px-1 text-xs break-all">{context.clientRequestId}</code>
              {context.clientRequestStatus && <span className="text-muted-foreground block text-xs">Status: {context.clientRequestStatus.toLowerCase()}</span>}
            </Row>
          )}
          <Row label="Opened">{whenOf(ticket.createdAt)}</Row>
          {ticket.answeredAt && <Row label="Last answered">{whenOf(ticket.answeredAt)}</Row>}
          {ticket.resolvedAt && <Row label="Resolved">{whenOf(ticket.resolvedAt)}</Row>}
          {ticket.source === "SIGNED_IN" && ticket.answeredAt && <Row label="Client has seen the reply">{ticket.clientReadAt && ticket.clientReadAt >= ticket.answeredAt ? "Yes" : "Not yet"}</Row>}
        </dl>
      </CardContent>
    </Card>
  )
}

function ResolveDialog({ ticket, onClose }: { ticket: SupportTicketDetail; onClose: () => void }) {
  const resolve = useResolveTicketMutation(ticket.id)
  return (
    <AlertDialog open onOpenChange={(open) => !open && !resolve.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Resolve this ticket?</AlertDialogTitle>
          <AlertDialogDescription>
            The conversation closes. {ticket.source === "SIGNED_IN" ? "If the client writes again it starts a new one." : "A visitor can still write again as a new ticket."} You can
            reopen it later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel render={<Button variant="outline" disabled={resolve.isPending} />}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            render={<Button />}
            disabled={resolve.isPending}
            onClick={() =>
              resolve.mutate(undefined, {
                onSuccess: () => {
                  toast.success("Ticket resolved")
                  onClose()
                },
                onError,
              })
            }
          >
            {resolve.isPending && <Loader2 className="size-3.5 animate-spin" />}
            Resolve
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * One ticket: the conversation, what the chat attached, and the reply box. A reply emails the client
 * and, for a signed-in client who is online, appears in their chat at once. A resolved ticket takes no
 * reply until it is reopened. The page checks for new messages every 30 seconds.
 */
export function TicketDetail({ id }: { id: string }) {
  const { data: ticket, isLoading, isError, error } = useSupportTicketQuery(id)
  const reply = useReplyToTicketMutation(id)
  const reopen = useReopenTicketMutation(id)
  const [text, setText] = useState("")
  const [resolving, setResolving] = useState(false)
  const scroller = useRef<HTMLOListElement>(null)
  const count = ticket?.messages.length ?? 0

  // A new message scrolls the conversation to its end.
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight })
  }, [count])

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading…</p>
  if (isError || !ticket) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-destructive text-sm">{(error as Error | null)?.message ?? "Couldn't load this ticket."}</p>
        <Button nativeButton={false} render={<Link href="/dashboard/support/tickets" />} variant="outline">
          <ArrowLeft className="size-3.5" />
          Back to tickets
        </Button>
      </div>
    )
  }

  const resolved = ticket.status === "RESOLVED"
  const body = text.trim()

  const send = () => {
    if (!body || reply.isPending || resolved) return
    reply.mutate(body, {
      onSuccess: () => {
        setText("")
        toast.success("Reply sent")
      },
      onError,
    })
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    send()
  }
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Button nativeButton={false} render={<Link href="/dashboard/support/tickets" />} variant="ghost" size="sm" className="-ml-2 self-start">
            <ArrowLeft className="size-3.5" />
            All tickets
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{ticket.name ?? ticket.email}</h2>
            <StatusBadge status={ticket.status} />
            {ticket.overdue && <OverdueBadge />}
          </div>
        </div>
        {resolved ? (
          <Button
            variant="outline"
            disabled={reopen.isPending}
            onClick={() =>
              reopen.mutate(undefined, {
                onSuccess: () => toast.success("Ticket reopened"),
                onError,
              })
            }
          >
            {reopen.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
            Reopen
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setResolving(true)}>
            <CheckCircle2 className="size-3.5" />
            Resolve
          </Button>
        )}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-3">
          <ol ref={scroller} role="log" aria-label="Messages in this ticket" className="flex max-h-[60vh] min-h-48 flex-col gap-3 overflow-y-auto rounded-2xl border p-4">
            {ticket.messages.map((message) => (
              <Message key={message.id} message={message} />
            ))}
          </ol>

          <form onSubmit={submit} className="flex flex-col gap-2">
            <Label htmlFor="ticket-reply">Reply</Label>
            <Textarea
              id="ticket-reply"
              rows={4}
              className="field-sizing-fixed"
              value={text}
              maxLength={REPLY_MAX}
              disabled={resolved}
              placeholder={resolved ? "This ticket is resolved. Reopen it to reply." : "Write your reply"}
              aria-describedby="ticket-reply-hint"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p id="ticket-reply-hint" className="text-muted-foreground text-xs">
                {ticket.source === "SIGNED_OUT"
                  ? "They aren't signed in, so the reply goes to their email as text."
                  : "Goes to their email, and into their chat if they are online. Ctrl or ⌘ + Enter sends."}
              </p>
              <Button type="submit" disabled={!body || reply.isPending || resolved}>
                {reply.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                Send reply
              </Button>
            </div>
          </form>
        </div>

        <ContextPanel ticket={ticket} />
      </div>

      {resolving && <ResolveDialog ticket={ticket} onClose={() => setResolving(false)} />}
    </div>
  )
}
