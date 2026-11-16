// The Support Chat's content and the admin endpoints that edit it. Copied from
// ilovelawyer-api/src/types/support-content.ts and src/constants/support-actions.constants.ts; copy
// from there, not the other way around, if they drift.

export type SupportActionKey =
  | "CHECK_PAYMENT"
  | "SHOW_CREDITS"
  | "SHOW_LAWYER_REQUESTS"
  | "SEND_PASSWORD_RESET"
  | "RESEND_CODE"
  | "EXPORT_MY_DATA"
  | "DELETE_MY_ACCOUNT"
  | "OPEN_TICKET"

export type SupportAudience = "SIGNED_IN" | "SIGNED_OUT"
export type SupportFlowAudience = SupportAudience | "BOTH"

export type SupportTarget =
  | { kind: "STEP"; stepId: string }
  | { kind: "FLOW"; flowId: string }
  | { kind: "LINK"; href: string; label?: string }
  | { kind: "TALK_TO_PERSON" }
  | { kind: "END" }

export interface SupportChoiceOption {
  label: string
  target: SupportTarget
}

export type SupportStep =
  | { id: string; type: "MESSAGE"; text: string; next?: SupportTarget }
  | { id: string; type: "CHOICES"; text?: string; style: "BUTTONS" | "QUICK_REPLIES"; options: SupportChoiceOption[] }
  | { id: string; type: "ACTION"; actionKey: SupportActionKey; onSuccess: SupportTarget; onFailure: SupportTarget }
  | { id: string; type: "DID_THAT_HELP" }

export type SupportStepType = SupportStep["type"]

export interface SupportFlow {
  id: string
  title: string
  audience: SupportFlowAudience
  /** Words and phrases typed text is matched against. */
  triggers: string[]
  /** Offered after "Did that help?" is answered No. */
  relatedFlowIds: string[]
  startStepId: string
  steps: Record<string, SupportStep>
}

export interface SupportMenuCard {
  id: string
  title: string
  subtitle?: string
  flowId: string
  enabled: boolean
}

export interface SupportSettings {
  assistantName: string
  avatarUrl: string | null
  /** May contain {firstName}. */
  greeting: string
  responseTimeLine: string
}

export interface SupportContent {
  schemaVersion: 1
  settings: SupportSettings
  menus: { SIGNED_IN: SupportMenuCard[]; SIGNED_OUT: SupportMenuCard[] }
  flows: Record<string, SupportFlow>
}

export interface SupportContentProblem {
  /** Where in the content, e.g. "flows.refund.steps.ask.options[1].target". */
  path: string
  code: string
  message: string
}

/** What the client app receives for one audience; the preview builds the same from the draft. */
export interface PublishedSupportContent {
  version: number
  publishedAt: string
  settings: SupportSettings
  menu: SupportMenuCard[]
  flows: Record<string, SupportFlow>
  actions: { key: SupportActionKey; label: string; safetyCopy?: string[] }[]
}

/** A result card under a message. The preview only ever shows canned ones. */
export type SupportActionCard = { kind: "PREVIEW"; title: string; lines: string[] }

export interface SupportOutcomeEvent {
  kind: "FLOW_STARTED" | "HELPED_YES" | "HELPED_NO" | "ESCALATED" | "UNMATCHED"
  flowId?: string
  contentVersion?: number
  text?: string
}

export interface SupportActor {
  id: string
  name: string | null
}

// The admin endpoints (/api/admin/support/...).

export interface AdminSupportDraft {
  content: SupportContent
  updatedAt: string
  updatedBy: SupportActor | null
  basedOnVersion: number | null
  currentVersion: number
  hasUnpublishedChanges: boolean
}

export interface AdminSupportVersion {
  version: number
  publishedAt: string
  publishedBy: SupportActor | null
  rolledBackFromVersion: number | null
  isCurrent: boolean
}

export interface AdminSupportActionDef {
  key: SupportActionKey
  label: string
  audience: "IN" | "OUT" | "BOTH"
  readsAccount: boolean
  /** Fixed by the action; the editor shows it, never edits it. */
  safetyCopy?: string[]
}

/** The API's limits (SUPPORT_CONTENT_LIMITS), so the editor stops at them instead of at a 400. */
export const SUPPORT_LIMITS = {
  flows: 100,
  stepsPerFlow: 60,
  triggersPerFlow: 40,
  triggerLength: 60,
  optionsPerStep: 10,
  menuCards: 12,
  textLength: 1500,
  titleLength: 120,
  subtitleLength: 200,
  relatedFlows: 10,
} as const
