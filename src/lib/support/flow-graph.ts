import type { SupportActionKey, SupportFlow, SupportStep, SupportStepType, SupportTarget } from "@/lib/support/types"

// A flow's steps are stored as a map, and the database does not keep a map's order. So the editor
// shows them in the order a client meets them: from the start step, following each step's targets,
// then any step nothing reaches (which Publish refuses) at the end.

/** Every target a step points at, with where in the step it is. */
export function targetsOf(step: SupportStep): { target: SupportTarget; at: string }[] {
  switch (step.type) {
    case "MESSAGE":
      return step.next ? [{ target: step.next, at: "next" }] : []
    case "CHOICES":
      return step.options.map((option, i) => ({ target: option.target, at: `options[${i}].target` }))
    case "ACTION":
      return [
        { target: step.onSuccess, at: "onSuccess" },
        { target: step.onFailure, at: "onFailure" },
      ]
    default:
      return []
  }
}

/** Step ids in the order a client would meet them, then the unreachable ones. */
export function stepOrder(flow: SupportFlow): { ids: string[]; unreachable: Set<string> } {
  const seen = new Set<string>()
  const ids: string[] = []
  const queue = [flow.startStepId]
  while (queue.length > 0) {
    const id = queue.shift()!
    const step = flow.steps[id]
    if (!step || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
    for (const { target } of targetsOf(step)) if (target.kind === "STEP") queue.push(target.stepId)
  }
  const unreachable = new Set(Object.keys(flow.steps).filter((id) => !seen.has(id)).sort())
  return { ids: [...ids, ...unreachable], unreachable }
}

export const STEP_TYPE_LABEL: Record<SupportStepType, string> = {
  MESSAGE: "Message",
  CHOICES: "Choices",
  ACTION: "Action",
  DID_THAT_HELP: "Did that help?",
}

/** A step in a few words, for pickers and the outline. */
export function stepSummary(step: SupportStep): string {
  const clip = (text: string) => (text.length > 44 ? `${text.slice(0, 41)}…` : text)
  switch (step.type) {
    case "MESSAGE":
      return clip(step.text || "(empty)")
    case "CHOICES":
      return clip(step.text || step.options.map((o) => o.label).join(" / ") || "(no options)")
    case "ACTION":
      return step.actionKey
    default:
      return "Asks if it helped"
  }
}

/** Where a target leads, in words, using the steps' numbers. */
export function describeTarget(target: SupportTarget | undefined, flow: SupportFlow, order: string[], flows: Record<string, SupportFlow>): string {
  if (!target) return "ends"
  switch (target.kind) {
    case "STEP": {
      const n = order.indexOf(target.stepId)
      return n === -1 ? "a missing step" : `step ${n + 1}`
    }
    case "FLOW":
      return flows[target.flowId] ? `“${flows[target.flowId]!.title}”` : "a missing flow"
    case "LINK":
      return "a link"
    case "TALK_TO_PERSON":
      return "a person"
    case "END":
      return "ends"
  }
}

export function newStep(type: SupportStepType, id: string, action: SupportActionKey = "SHOW_CREDITS"): SupportStep {
  switch (type) {
    case "MESSAGE":
      return { id, type, text: "New message" }
    case "CHOICES":
      return { id, type, style: "BUTTONS", options: [{ label: "Option 1", target: { kind: "END" } }] }
    case "ACTION":
      return { id, type, actionKey: action, onSuccess: { kind: "END" }, onFailure: { kind: "TALK_TO_PERSON" } }
    case "DID_THAT_HELP":
      return { id, type }
  }
}
