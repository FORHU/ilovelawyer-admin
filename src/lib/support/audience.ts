import type { PublishedSupportContent, SupportAudience, SupportContent, SupportFlow, SupportActionKey } from "@/lib/support/types"

// What the client app would receive for one audience, built from the draft so the preview shows
// edits before they are published. Mirrors ilovelawyer-api/src/services/support-content-audience.ts.

export const flowAvailableTo = (flow: SupportFlow, audience: SupportAudience) => flow.audience === "BOTH" || flow.audience === audience

const MOCK_ACTIONS: PublishedSupportContent["actions"] = []

export function previewContent(content: SupportContent, audience: SupportAudience): PublishedSupportContent {
  const flows = Object.fromEntries(Object.entries(content.flows).filter(([, flow]) => flowAvailableTo(flow, audience)))
  return {
    version: 0,
    publishedAt: new Date(0).toISOString(),
    settings: content.settings,
    menu: content.menus[audience].filter((card) => card.enabled && flows[card.flowId]),
    flows,
    actions: MOCK_ACTIONS,
  }
}

/** What an action answers in the preview: the real thing needs a real account. */
export const MOCK_ACTION_TEXT: Record<SupportActionKey, string> = {
  CHECK_PAYMENT: "Your last payment went through.",
  SHOW_CREDITS: "You have 40 Chat Credits on this case.",
  SHOW_LAWYER_REQUESTS: "You have one request waiting for a lawyer.",
  SEND_PASSWORD_RESET: "We've sent a reset link to your email.",
  RESEND_CODE: "We've sent your code again.",
  EXPORT_MY_DATA: "Your data export starts here.",
  DELETE_MY_ACCOUNT: "The account deletion steps start here.",
  OPEN_TICKET: "A message to the team starts here.",
}
