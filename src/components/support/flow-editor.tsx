"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, X } from "lucide-react"

import { ChipInput } from "@/components/support/chip-input"
import { PhonePreview } from "@/components/support/phone-preview"
import { ProblemList, problemsAt } from "@/components/support/problem-list"
import { SimpleSelect } from "@/components/support/simple-select"
import { StepCard } from "@/components/support/step-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useDraftStore } from "@/lib/support/draft-store"
import { describeTarget, newStep, STEP_TYPE_LABEL, stepOrder, stepSummary, targetsOf } from "@/lib/support/flow-graph"
import { uniqueId } from "@/lib/support/ids"
import { useSupportActionsQuery } from "@/lib/support/queries"
import { SUPPORT_LIMITS, type SupportFlowAudience, type SupportStepType } from "@/lib/support/types"

const AUDIENCES: { value: SupportFlowAudience; label: string }[] = [
  { value: "BOTH", label: "Everyone" },
  { value: "SIGNED_IN", label: "Signed-in clients" },
  { value: "SIGNED_OUT", label: "Visitors who aren't signed in" },
]

const ADDABLE: SupportStepType[] = ["MESSAGE", "CHOICES", "ACTION", "DID_THAT_HELP"]

/** The conversation in a few lines: each step as the client meets it, and where it goes next. */
function Outline({ flowId }: { flowId: string }) {
  const flows = useDraftStore((s) => s.content?.flows)
  const flow = flows?.[flowId]
  if (!flows || !flow) return null
  const { ids } = stepOrder(flow)
  return (
    <details className="rounded-2xl border px-3 py-2">
      <summary className="cursor-pointer text-sm font-medium">How this flow runs</summary>
      <ol className="mt-2 flex flex-col gap-1 text-sm">
        {ids.map((id, i) => {
          const step = flow.steps[id]!
          const goes = targetsOf(step)
            .map(({ target }) => describeTarget(target, flow, ids, flows))
            .filter((text, n, all) => all.indexOf(text) === n)
          return (
            <li key={id} className="flex gap-2">
              <span className="text-muted-foreground w-5 shrink-0 text-right tabular-nums">{i + 1}</span>
              <a href={`#step-${id}`} className="min-w-0 underline-offset-2 hover:underline">
                {STEP_TYPE_LABEL[step.type]}: {stepSummary(step)}
              </a>
              {goes.length > 0 && <span className="text-muted-foreground shrink-0">→ {goes.join(", ")}</span>}
            </li>
          )
        })}
      </ol>
    </details>
  )
}

/**
 * One flow: its details (who sees it, the words that find it, the flows offered after a No) and its
 * steps, with the draft running in the phone beside it, starting inside this flow.
 */
export function FlowEditor({ flowId }: { flowId: string }) {
  const flows = useDraftStore((s) => s.content?.flows)
  const problems = useDraftStore((s) => s.problems)
  const edit = useDraftStore((s) => s.edit)
  const catalog = useSupportActionsQuery().data
  const [added, setAdded] = useState<string | null>(null)
  const flow = flows?.[flowId]

  const order = useMemo(() => (flow ? stepOrder(flow) : { ids: [], unreachable: new Set<string>() }), [flow])

  // Land on the step a problem pointed at, or the one just added.
  useEffect(() => {
    const id = added ?? (typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "")
    if (!id) return
    const el = document.getElementById(id.startsWith("step-") ? id : `step-${id}`)
    el?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })
  }, [added, flow ? Object.keys(flow.steps).length : 0]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!flows) return null
  if (!flow) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm">There&apos;s no flow called “{flowId}” in this draft.</p>
        <Button render={<Link href="/dashboard/support/flows" />} variant="outline">
          <ArrowLeft className="size-3.5" />
          Back to flows
        </Button>
      </div>
    )
  }

  const flowProblems = problems.filter((p) => problemsAt([p], `flows.${flowId}`).length > 0 && !p.path.startsWith(`flows.${flowId}.steps.`))
  const others = Object.values(flows).filter((f) => f.id !== flowId)
  const stepItems = order.ids.map((id, i) => ({ value: id, label: `${i + 1} · ${STEP_TYPE_LABEL[flow.steps[id]!.type]}: ${stepSummary(flow.steps[id]!)}` }))
  const patch = (fields: Partial<typeof flow>) => edit((d) => void Object.assign(d.flows[flowId]!, fields))

  const addStep = (type: SupportStepType) => {
    const id = uniqueId(STEP_TYPE_LABEL[type], Object.keys(flow.steps))
    edit((d) => void (d.flows[flowId]!.steps[id] = newStep(type, id, catalog?.[0]?.key)))
    setAdded(`step-${id}`)
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Button render={<Link href="/dashboard/support/flows" />} variant="ghost" size="sm" className="-ml-2 self-start">
            <ArrowLeft className="size-3.5" />
            All flows
          </Button>
          <h2 className="text-xl font-semibold tracking-tight">{flow.title || "Untitled flow"}</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>
              Id <code className="bg-muted rounded px-1">{flow.id}</code>, fixed once made, so cards and links keep pointing here.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ProblemList problems={flowProblems} linked={false} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="flow-title">Title</Label>
              <Input id="flow-title" value={flow.title} maxLength={SUPPORT_LIMITS.titleLength} onChange={(e) => patch({ title: e.target.value })} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Who sees it</Label>
                <SimpleSelect value={flow.audience} label="Who sees this flow" items={AUDIENCES} onChange={(audience) => patch({ audience: audience as SupportFlowAudience })} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Starts at</Label>
                <SimpleSelect value={flow.startStepId} label="Start step" items={stepItems} onChange={(startStepId) => patch({ startStepId })} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="flow-triggers">Words that find it</Label>
              <ChipInput
                id="flow-triggers"
                label="Trigger words"
                values={flow.triggers}
                max={SUPPORT_LIMITS.triggersPerFlow}
                maxLength={SUPPORT_LIMITS.triggerLength}
                placeholder="refund, forgot password… then Enter"
                describedBy="flow-triggers-hint"
                onChange={(triggers) => patch({ triggers })}
              />
              <p id="flow-triggers-hint" className="text-muted-foreground text-xs">
                When a client types, flows whose words appear in it are suggested (up to three). A phrase counts for more than a single word; plurals are treated alike. Try
                it in the phone.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Offered after “No, not really”</Label>
              {flow.relatedFlowIds.length > 0 && (
                <ul className="flex flex-wrap gap-1.5" aria-label="Related flows">
                  {flow.relatedFlowIds.map((id) => (
                    <li key={id} className="bg-muted flex items-center gap-1 rounded-2xl py-0.5 pr-1 pl-2.5 text-xs">
                      {flows[id]?.title ?? `${id} (missing)`}
                      <button
                        type="button"
                        aria-label={`Remove ${flows[id]?.title ?? id}`}
                        className="hover:bg-foreground/10 focus-visible:ring-ring/40 flex size-5 items-center justify-center rounded-full outline-none focus-visible:ring-2"
                        onClick={() => patch({ relatedFlowIds: flow.relatedFlowIds.filter((r) => r !== id) })}
                      >
                        <X className="size-3" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <SimpleSelect
                value=""
                label="Add a related flow"
                placeholder="Add a related flow"
                items={others.filter((f) => !flow.relatedFlowIds.includes(f.id)).map((f) => ({ value: f.id, label: f.title }))}
                onChange={(id) => id && flow.relatedFlowIds.length < SUPPORT_LIMITS.relatedFlows && patch({ relatedFlowIds: [...flow.relatedFlowIds, id] })}
              />
            </div>
          </CardContent>
        </Card>

        <Outline flowId={flowId} />

        <ol className="flex flex-col gap-4" aria-label="Steps">
          {order.ids.map((id, i) => (
            <li key={id}>
              <StepCard
                flowId={flowId}
                stepId={id}
                number={i + 1}
                order={order.ids}
                unreachable={order.unreachable.has(id)}
                problems={problemsAt(problems, `flows.${flowId}.steps.${id}`)}
              />
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Add a step">
          <span className="text-muted-foreground text-sm">Add a step:</span>
          {ADDABLE.map((type) => (
            <Button key={type} type="button" variant="outline" size="sm" disabled={Object.keys(flow.steps).length >= SUPPORT_LIMITS.stepsPerFlow} onClick={() => addStep(type)}>
              <Plus className="size-3.5" />
              {STEP_TYPE_LABEL[type]}
            </Button>
          ))}
        </div>
      </div>

      <PhonePreview startFlowId={flowId} className="xl:sticky xl:top-28" />
    </div>
  )
}
