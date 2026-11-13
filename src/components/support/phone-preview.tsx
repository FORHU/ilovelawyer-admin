"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { ArrowUp, ExternalLink, LifeBuoy, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { MOCK_ACTION_TEXT, previewContent } from "@/lib/support/audience"
import { useDraftStore } from "@/lib/support/draft-store"
import { type ChatAction, type ChatMessage, type ChatState, COPY, fillGreeting, initialState, reduce } from "@/lib/support/engine"
import { useSupportActionsQuery } from "@/lib/support/queries"
import type { PublishedSupportContent, SupportAudience } from "@/lib/support/types"

const AUDIENCES: { value: SupportAudience; label: string }[] = [
  { value: "SIGNED_IN", label: "Signed in" },
  { value: "SIGNED_OUT", label: "Signed out" },
]

const FIRST_NAME = "Alex"

function begin(content: PublishedSupportContent, audience: SupportAudience, startFlowId: string | undefined): ChatState {
  const first = initialState(content, audience === "SIGNED_IN" ? FIRST_NAME : null)
  if (!startFlowId || !content.flows[startFlowId]) return first
  return reduce(content, first, { type: "START_FLOW", flowId: startFlowId }).state
}

const choiceButton =
  "border-border bg-background hover:bg-muted focus-visible:ring-ring/40 w-full rounded-2xl border px-3 py-2 text-left text-[13px] leading-snug outline-none focus-visible:ring-2"

function Bubble({ message }: { message: ChatMessage }) {
  const mine = message.from === "user"
  return (
    <li className={cn("flex max-w-[86%] flex-col gap-1.5", mine ? "items-end self-end" : "items-start self-start")}>
      {message.text && (
        <p className={cn("rounded-2xl px-3 py-2 text-[13px] leading-snug break-words whitespace-pre-wrap", mine ? "bg-primary text-primary-foreground" : "bg-muted")}>
          {message.text}
        </p>
      )}
      {message.card && (
        <div className="bg-background w-full rounded-2xl border p-2.5 text-[12px]">
          <p className="font-medium">{message.card.title}</p>
          {message.card.lines.map((line) => (
            <p key={line} className="text-muted-foreground">
              {line}
            </p>
          ))}
        </div>
      )}
      {message.link && (
        <span className="bg-background inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium">
          {message.link.label}
          <ExternalLink className="size-3" aria-hidden />
        </span>
      )}
    </li>
  )
}

/** The conversation as a client would have it, run by the same engine and matcher as the client app
 * (lib/support/engine.ts), on the draft. Remount to start over. */
function Conversation({ audience, startFlowId }: { audience: SupportAudience; startFlowId?: string }) {
  const draft = useDraftStore((s) => s.content)
  const catalog = useSupportActionsQuery().data
  const content = useMemo(() => (draft ? previewContent(draft, audience) : null), [draft, audience])
  const [state, setState] = useState<ChatState | null>(() => (content ? begin(content, audience, startFlowId) : null))
  const [text, setText] = useState("")
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" })
  }, [state?.messages.length, state?.prompt.kind])

  if (!content || !state) return null
  const { prompt } = state

  const act = (action: ChatAction) => setState((current) => (current ? reduce(content, current, action).state : current))
  const type = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    act({ type: "TYPE", text })
    setText("")
  }
  const safety = prompt.kind === "ACTION" ? catalog?.find((a) => a.key === prompt.actionKey) : undefined

  return (
    <>
      <ol className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-3" aria-label="Preview conversation">
        {state.messages.map((message) => (
          <Bubble key={message.id} message={message} />
        ))}
        <div ref={end} />
      </ol>

      <div className="flex max-h-[45%] shrink-0 flex-col gap-1.5 overflow-y-auto border-t px-3 py-2.5">
        {prompt.kind === "MENU" &&
          content.menu.map((card) => (
            <button key={card.id} type="button" className={choiceButton} onClick={() => act({ type: "START_FLOW", flowId: card.flowId, label: card.title })}>
              <span className="font-medium">{card.title}</span>
              {card.subtitle && <span className="text-muted-foreground block text-[12px]">{card.subtitle}</span>}
            </button>
          ))}
        {prompt.kind === "MENU" && content.menu.length === 0 && <p className="text-muted-foreground text-[12px]">No menu cards are switched on for this audience.</p>}

        {prompt.kind === "CHOICES" &&
          prompt.options.map((option, i) => (
            <button key={`${option.label}-${i}`} type="button" className={choiceButton} onClick={() => act({ type: "CHOOSE", index: i })}>
              {option.label}
            </button>
          ))}

        {prompt.kind === "SUGGESTIONS" &&
          prompt.flowIds.map((id) => (
            <button key={id} type="button" className={choiceButton} onClick={() => act({ type: "PICK_SUGGESTION", flowId: id })}>
              {content.flows[id]?.title ?? id}
            </button>
          ))}

        {prompt.kind === "HELP" && (
          <div className="flex gap-1.5">
            <button type="button" className={choiceButton} onClick={() => act({ type: "ANSWER_HELP", helped: true })}>
              {COPY.yes}
            </button>
            <button type="button" className={choiceButton} onClick={() => act({ type: "ANSWER_HELP", helped: false })}>
              {COPY.no}
            </button>
          </div>
        )}

        {prompt.kind === "TALK_OFFER" && (
          <>
            <button type="button" className={choiceButton} onClick={() => act({ type: "TALK" })}>
              {COPY.talk}
            </button>
            <button type="button" className={choiceButton} onClick={() => act({ type: "SHOW_MENU" })}>
              Back to topics
            </button>
          </>
        )}

        {prompt.kind === "ACTION" && (
          <div className="flex flex-col gap-1.5">
            <p className="text-muted-foreground text-[12px]">
              <span className="text-foreground font-medium">{safety?.label ?? prompt.actionKey}</span> runs here for a real client. In this preview it answers with an example.
            </p>
            {safety?.safetyCopy?.map((line) => (
              <p key={line} className="bg-muted rounded-xl px-2.5 py-1.5 text-[12px]">
                {line}
              </p>
            ))}
            <div className="flex gap-1.5">
              <button
                type="button"
                className={choiceButton}
                onClick={() => act({ type: "ACTION_RESULT", ok: true, text: MOCK_ACTION_TEXT[prompt.actionKey] })}
              >
                Act as succeeded
              </button>
              <button type="button" className={choiceButton} onClick={() => act({ type: "ACTION_RESULT", ok: false, text: "That didn't work." })}>
                Act as failed
              </button>
            </div>
          </div>
        )}

        {prompt.kind === "TALK" && (
          <p className="text-muted-foreground flex items-start gap-2 text-[12px]">
            <LifeBuoy className="mt-0.5 size-3.5 shrink-0" aria-hidden />A person takes over here: the client writes a message to the team.
          </p>
        )}

        {prompt.kind !== "ACTION" && prompt.kind !== "TALK" && prompt.kind !== "MENU" && (
          <Button type="button" variant="ghost" size="xs" className="self-start" onClick={() => act({ type: "SHOW_MENU" })}>
            Show the topics
          </Button>
        )}
      </div>

      {prompt.kind !== "ACTION" && prompt.kind !== "TALK" && (
        <form onSubmit={type} className="flex shrink-0 items-center gap-1.5 border-t px-3 py-2">
          <label htmlFor="preview-type" className="sr-only">
            Type a message to try the keyword matching
          </label>
          <Input id="preview-type" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type to try the keyword matching" className="h-8" />
          <Button type="submit" size="icon" aria-label="Send" disabled={!text.trim()}>
            <ArrowUp />
          </Button>
        </form>
      )}
    </>
  )
}

/**
 * A phone-sized view of the chat running the draft, to try what an edit does before publishing it.
 * The signed in/out switch shows each audience's menu and flows. Actions answer with examples, since
 * the real ones need a client's account. `startFlowId` opens the chat inside that flow.
 */
export function PhonePreview({ startFlowId, className }: { startFlowId?: string; className?: string }) {
  const settings = useDraftStore((s) => s.content?.settings)
  const [audience, setAudience] = useState<SupportAudience>("SIGNED_IN")
  const [run, setRun] = useState(0)
  if (!settings) return null
  const greeting = fillGreeting(settings.greeting, null)

  return (
    <aside aria-label="Preview" className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <div role="group" aria-label="Preview as" className="bg-muted inline-flex rounded-2xl p-0.5">
          {AUDIENCES.map((a) => (
            <button
              key={a.value}
              type="button"
              aria-pressed={audience === a.value}
              onClick={() => setAudience(a.value)}
              className={cn(
                "focus-visible:ring-ring/40 rounded-2xl px-3 py-1 text-xs font-medium outline-none focus-visible:ring-2",
                audience === a.value ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
        <Button type="button" variant="ghost" size="xs" onClick={() => setRun((n) => n + 1)}>
          <RotateCcw />
          Restart
        </Button>
      </div>

      <div className="bg-background mx-auto flex h-[640px] w-full max-w-[375px] flex-col overflow-hidden rounded-[28px] border-4 border-neutral-800 shadow-sm dark:border-neutral-600">
        <header className="flex shrink-0 items-center gap-2.5 border-b px-3 py-2.5">
          <span className="bg-muted flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
            {settings.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.avatarUrl} alt="" className="size-full object-cover" />
            ) : (
              <LifeBuoy className="size-4" aria-hidden />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{settings.assistantName || "Assistant"}</p>
            <p className="text-muted-foreground truncate text-[11px]">{settings.responseTimeLine}</p>
          </div>
        </header>
        <Conversation key={`${audience}-${startFlowId ?? ""}-${run}`} audience={audience} startFlowId={startFlowId} />
      </div>
      <p className="text-muted-foreground text-center text-xs">
        Runs your draft, not what clients see. Greeting as a signed-out visitor reads: “{greeting}”
      </p>
    </aside>
  )
}
