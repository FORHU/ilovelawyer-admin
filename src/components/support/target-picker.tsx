"use client"

import { SimpleSelect } from "@/components/support/simple-select"
import { Input } from "@/components/ui/input"
import { STEP_TYPE_LABEL, stepSummary } from "@/lib/support/flow-graph"
import { SUPPORT_LIMITS, type SupportFlow, type SupportTarget } from "@/lib/support/types"

type Kind = SupportTarget["kind"] | "NONE"

const KIND_LABEL: Record<Kind, string> = {
  NONE: "Nothing (the flow ends)",
  STEP: "Another step",
  FLOW: "Another flow",
  LINK: "A link",
  TALK_TO_PERSON: "Talk to a person",
  END: "End the flow",
}

/** Where a message, an option or an action's result leads. The kind comes first; the fields it needs
 * follow. A step's number is its place in the walk order, the same as on the cards. */
export function TargetPicker({
  value,
  onChange,
  flow,
  order,
  flows,
  label,
  allowNone = false,
  invalid,
}: {
  value: SupportTarget | undefined
  onChange: (target: SupportTarget | undefined) => void
  flow: SupportFlow
  /** The flow's step ids in walk order. */
  order: string[]
  flows: Record<string, SupportFlow>
  label: string
  /** The target is optional (a message's `next`). */
  allowNone?: boolean
  invalid?: boolean
}) {
  const kind: Kind = value?.kind ?? "NONE"
  const kinds: Kind[] = [...(allowNone ? (["NONE"] as const) : []), "STEP", "FLOW", "LINK", "TALK_TO_PERSON", "END"]

  const stepItems = order.map((id, i) => {
    const step = flow.steps[id]!
    return { value: id, label: `${i + 1} · ${STEP_TYPE_LABEL[step.type]}: ${stepSummary(step)}` }
  })
  const flowItems = Object.values(flows).map((f) => ({ value: f.id, label: f.title }))

  const switchKind = (next: string) => {
    switch (next as Kind) {
      case "NONE":
        return onChange(undefined)
      case "STEP":
        return onChange({ kind: "STEP", stepId: order.find((id) => id !== flow.startStepId) ?? order[0] ?? "" })
      case "FLOW":
        return onChange({ kind: "FLOW", flowId: flowItems.find((f) => f.value !== flow.id)?.value ?? "" })
      case "LINK":
        return onChange({ kind: "LINK", href: "/" })
      case "TALK_TO_PERSON":
        return onChange({ kind: "TALK_TO_PERSON" })
      case "END":
        return onChange({ kind: "END" })
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <SimpleSelect
        value={kind}
        label={label}
        items={kinds.map((k) => ({ value: k, label: KIND_LABEL[k] }))}
        onChange={switchKind}
        invalid={invalid}
      />
      {value?.kind === "STEP" && (
        <SimpleSelect
          value={value.stepId}
          label={`${label}: which step`}
          items={stepItems.some((i) => i.value === value.stepId) ? stepItems : [{ value: value.stepId, label: `${value.stepId} (missing)` }, ...stepItems]}
          onChange={(stepId) => onChange({ kind: "STEP", stepId })}
          invalid={invalid}
        />
      )}
      {value?.kind === "FLOW" && (
        <SimpleSelect
          value={value.flowId}
          label={`${label}: which flow`}
          items={flowItems.some((i) => i.value === value.flowId) ? flowItems : [{ value: value.flowId, label: `${value.flowId} (missing)` }, ...flowItems]}
          onChange={(flowId) => onChange({ kind: "FLOW", flowId })}
          invalid={invalid}
        />
      )}
      {value?.kind === "LINK" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            aria-label={`${label}: link address`}
            aria-invalid={invalid || undefined}
            placeholder="/settings or https://…"
            value={value.href}
            maxLength={500}
            onChange={(e) => onChange({ ...value, href: e.target.value })}
          />
          <Input
            aria-label={`${label}: link button text`}
            placeholder="Button text (optional)"
            value={value.label ?? ""}
            maxLength={SUPPORT_LIMITS.titleLength}
            onChange={(e) => onChange({ kind: "LINK", href: value.href, ...(e.target.value === "" ? {} : { label: e.target.value }) })}
          />
        </div>
      )}
    </div>
  )
}
