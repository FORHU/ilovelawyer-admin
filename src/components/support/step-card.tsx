"use client"

import { Flag, Plus, Trash2 } from "lucide-react"

import { ProblemList } from "@/components/support/problem-list"
import { SimpleSelect } from "@/components/support/simple-select"
import { TargetPicker } from "@/components/support/target-picker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useDraftStore } from "@/lib/support/draft-store"
import { describeTarget, newStep, STEP_TYPE_LABEL, targetsOf } from "@/lib/support/flow-graph"
import { useSupportActionsQuery } from "@/lib/support/queries"
import {
  SUPPORT_LIMITS,
  type SupportContentProblem,
  type SupportFlow,
  type SupportStep,
  type SupportStepType,
  type SupportTarget,
} from "@/lib/support/types"

const TYPES = Object.keys(STEP_TYPE_LABEL) as SupportStepType[]

/** Points every step that led to `gone` at the end of the flow instead, so deleting a step doesn't
 * leave the others pointing at nothing. */
function detach(flow: SupportFlow, gone: string) {
  const fix = (t: SupportTarget): SupportTarget => (t.kind === "STEP" && t.stepId === gone ? { kind: "END" } : t)
  for (const step of Object.values(flow.steps)) {
    if (step.type === "MESSAGE" && step.next?.kind === "STEP" && step.next.stepId === gone) delete step.next
    else if (step.type === "CHOICES") step.options.forEach((o) => void (o.target = fix(o.target)))
    else if (step.type === "ACTION") {
      step.onSuccess = fix(step.onSuccess)
      step.onFailure = fix(step.onFailure)
    }
  }
}

/**
 * One step of a flow, as a form. The number is its place in the order a client meets the steps, so
 * "step 3" in a picker is the card numbered 3. Problems from Check or Publish show on the step they
 * are about.
 */
export function StepCard({
  flowId,
  stepId,
  number,
  order,
  unreachable,
  problems,
}: {
  flowId: string
  stepId: string
  number: number
  order: string[]
  unreachable: boolean
  problems: SupportContentProblem[]
}) {
  const flows = useDraftStore((s) => s.content?.flows)
  const edit = useDraftStore((s) => s.edit)
  const catalog = useSupportActionsQuery().data
  const flow = flows?.[flowId]
  const step = flow?.steps[stepId]
  if (!flows || !flow || !step) return null

  const base = `flows.${flowId}.steps.${stepId}`
  const bad = (at: string) => problems.some((p) => p.path === `${base}.${at}`)
  const patch = (fields: Partial<SupportStep>) => edit((d) => void Object.assign(d.flows[flowId]!.steps[stepId]!, fields))
  const isStart = flow.startStepId === stepId
  const canDelete = !isStart && Object.keys(flow.steps).length > 1

  const changeType = (type: SupportStepType) => {
    if (type === step.type) return
    edit((d) => {
      const fresh = newStep(type, stepId, catalog?.[0]?.key)
      if ((fresh.type === "MESSAGE" || fresh.type === "CHOICES") && (step.type === "MESSAGE" || step.type === "CHOICES") && step.text) {
        fresh.text = step.text
      }
      d.flows[flowId]!.steps[stepId] = fresh
    })
  }

  const picker = (target: SupportTarget | undefined, onChange: (t: SupportTarget | undefined) => void, label: string, at: string, allowNone = false) => (
    <TargetPicker value={target} onChange={onChange} flow={flow} order={order} flows={flows} label={label} allowNone={allowNone} invalid={bad(at)} />
  )

  const action = step.type === "ACTION" ? catalog?.find((a) => a.key === step.actionKey) : undefined
  const goes = targetsOf(step)
    .map(({ target }) => describeTarget(target, flow, order, flows))
    .filter((text, i, all) => all.indexOf(text) === i)

  return (
    <Card id={`step-${stepId}`} className="scroll-mt-40">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <span className="bg-muted flex size-6 items-center justify-center rounded-full text-xs tabular-nums">{number}</span>
            {STEP_TYPE_LABEL[step.type]}
          </CardTitle>
          {isStart && (
            <Badge variant="secondary">
              <Flag aria-hidden />
              Starts here
            </Badge>
          )}
          {unreachable && <Badge variant="destructive">Nothing leads here</Badge>}
          <div className="ml-auto flex items-center gap-1">
            <div className="w-40">
              <SimpleSelect
                value={step.type}
                label={`Step ${number} type`}
                items={TYPES.map((t) => ({ value: t, label: STEP_TYPE_LABEL[t] }))}
                onChange={(t) => changeType(t as SupportStepType)}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete step ${number}`}
              disabled={!canDelete}
              title={isStart ? "This is where the flow starts: pick another start step first" : undefined}
              onClick={() =>
                edit((d) => {
                  const f = d.flows[flowId]!
                  delete f.steps[stepId]
                  detach(f, stepId)
                })
              }
            >
              <Trash2 />
            </Button>
          </div>
        </div>
        {goes.length > 0 && <p className="text-muted-foreground text-xs">Leads to {goes.join(", ")}</p>}
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {step.type === "MESSAGE" && (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${base}-text`}>What the assistant says</Label>
              <Textarea
                id={`${base}-text`}
                rows={3}
                value={step.text}
                maxLength={SUPPORT_LIMITS.textLength}
                onChange={(e) => patch({ text: e.target.value })}
                aria-invalid={bad("text") || undefined}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Then</Label>
              {picker(step.next, (next) => edit((d) => void ((d.flows[flowId]!.steps[stepId] as typeof step).next = next)), `Step ${number}: then`, "next", true)}
            </div>
          </>
        )}

        {step.type === "CHOICES" && (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${base}-text`}>Question (optional)</Label>
              <Textarea
                id={`${base}-text`}
                rows={2}
                value={step.text ?? ""}
                maxLength={SUPPORT_LIMITS.textLength}
                onChange={(e) => edit((d) => void ((d.flows[flowId]!.steps[stepId] as typeof step).text = e.target.value === "" ? undefined : e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Shown as</Label>
              <div className="w-56">
                <SimpleSelect
                  value={step.style}
                  label={`Step ${number}: how the options show`}
                  items={[
                    { value: "BUTTONS", label: "Buttons" },
                    { value: "QUICK_REPLIES", label: "Quick replies" },
                  ]}
                  onChange={(style) => patch({ style: style as "BUTTONS" | "QUICK_REPLIES" })}
                />
              </div>
            </div>
            <ol className="flex flex-col gap-3" aria-label={`Step ${number} options`}>
              {step.options.map((option, i) => (
                <li key={i} className="flex flex-col gap-2 rounded-2xl border p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      aria-label={`Step ${number} option ${i + 1} label`}
                      value={option.label}
                      maxLength={SUPPORT_LIMITS.titleLength}
                      placeholder="What the client taps"
                      onChange={(e) => edit((d) => void ((d.flows[flowId]!.steps[stepId] as typeof step).options[i]!.label = e.target.value))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove option ${i + 1}`}
                      disabled={step.options.length === 1}
                      onClick={() => edit((d) => void (d.flows[flowId]!.steps[stepId] as typeof step).options.splice(i, 1))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  {picker(
                    option.target,
                    (target) => target && edit((d) => void ((d.flows[flowId]!.steps[stepId] as typeof step).options[i]!.target = target)),
                    `Step ${number} option ${i + 1} leads to`,
                    `options[${i}].target`,
                  )}
                </li>
              ))}
            </ol>
            <Button
              type="button"
              variant="outline"
              className="self-start"
              disabled={step.options.length >= SUPPORT_LIMITS.optionsPerStep}
              onClick={() =>
                edit((d) => void (d.flows[flowId]!.steps[stepId] as typeof step).options.push({ label: `Option ${step.options.length + 1}`, target: { kind: "END" } }))
              }
            >
              <Plus className="size-3.5" />
              Add an option
            </Button>
          </>
        )}

        {step.type === "ACTION" && (
          <>
            <div className="flex flex-col gap-2">
              <Label>What it does</Label>
              <SimpleSelect
                value={step.actionKey}
                label={`Step ${number}: action`}
                items={(catalog ?? []).map((a) => ({
                  value: a.key,
                  label: `${a.label}${a.audience === "IN" ? " (signed in only)" : a.audience === "OUT" ? " (signed out only)" : ""}`,
                }))}
                onChange={(actionKey) => patch({ actionKey: actionKey as never })}
                invalid={bad("actionKey")}
              />
              {action?.safetyCopy && (
                <div className="bg-muted flex flex-col gap-1 rounded-2xl p-3 text-xs" aria-label="What the chat tells the client first. Fixed; you can't change it.">
                  <p className="font-medium">The chat tells the client this first (fixed):</p>
                  {action.safetyCopy.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>If it works</Label>
                {picker(step.onSuccess, (t) => t && edit((d) => void ((d.flows[flowId]!.steps[stepId] as typeof step).onSuccess = t)), `Step ${number}: if it works`, "onSuccess")}
              </div>
              <div className="flex flex-col gap-2">
                <Label>If it fails</Label>
                {picker(step.onFailure, (t) => t && edit((d) => void ((d.flows[flowId]!.steps[stepId] as typeof step).onFailure = t)), `Step ${number}: if it fails`, "onFailure")}
              </div>
            </div>
          </>
        )}

        {step.type === "DID_THAT_HELP" && (
          <p className="text-muted-foreground text-sm">
            Asks “Did that help?”. Yes ends the flow. The first No offers this flow&apos;s related flows; a second No offers a person. Nothing to set here.
          </p>
        )}

        <ProblemList problems={problems} linked={false} />
      </CardContent>
    </Card>
  )
}
