// COPY of ilovelawyer-client/src/lib/support/engine.ts, so the preview walks a flow exactly as the
// client does. Keep the two in step: change the client file first, then copy it here.

import { matchFlows } from "./match";
import type { PublishedSupportContent, SupportActionCard, SupportActionKey, SupportChoiceOption, SupportOutcomeEvent, SupportTarget } from "./types";

// The Support Chat's conversation, as a pure state machine: `reduce(content, state, action)` gives
// the next state and the outcomes to report. Nothing here waits, fetches or renders. The screen
// reveals bot messages one at a time (with a typing indicator) and shows the `prompt` once the
// last one is out.

export interface ChatMessage {
  id: number;
  from: "bot" | "user";
  text: string;
  /** A page in the app the message points to (always a path, the API checks it). */
  link?: { href: string; label: string };
  /** What an action found, shown under the message. */
  card?: SupportActionCard;
}

/** What the client can do next. */
export type Prompt =
  | { kind: "MENU" }
  | { kind: "CHOICES"; style: "BUTTONS" | "QUICK_REPLIES"; options: SupportChoiceOption[] }
  | { kind: "HELP" }
  | { kind: "SUGGESTIONS"; flowIds: string[] }
  | { kind: "TALK_OFFER" }
  | { kind: "ACTION"; actionKey: SupportActionKey; onSuccess: SupportTarget; onFailure: SupportTarget }
  /** Handed to the person-to-person layer (a Support Ticket); the chat itself has nothing more to say. */
  | { kind: "TALK" };

export interface ChatState {
  messages: ChatMessage[];
  prompt: Prompt;
  /** The flow being walked, null between flows. */
  flowId: string | null;
  /** Every flow walked in this conversation, oldest first: what a Support Ticket says was tried. */
  flowPath: string[];
  /** "No" answers to "Did that help?" about the same problem. Two offers a person. */
  noCount: number;
  /** Typed messages in a row that matched no flow. Two offers a person. */
  misses: number;
  seq: number;
}

export type ChatAction =
  | { type: "START_FLOW"; flowId: string; label?: string }
  | { type: "CHOOSE"; index: number }
  | { type: "TYPE"; text: string }
  | { type: "ANSWER_HELP"; helped: boolean }
  | { type: "PICK_SUGGESTION"; flowId: string }
  | { type: "TALK" }
  | { type: "SHOW_MENU" }
  | { type: "ACTION_RESULT"; ok: boolean; text?: string; card?: SupportActionCard };

export const COPY = {
  didItHelp: "Did that help?",
  glad: "Glad that helped.",
  anythingElse: "Is there anything else I can help with?",
  suggestions: "These might be what you're after:",
  noMatch: "I'm not sure I understood that. Pick a topic below, or try different words.",
  related: "Sorry about that. These might help instead:",
  offerPerson: "I'm sorry I couldn't sort that out. I can pass this to a person on the team.",
  broken: "Sorry, I can't carry on with that one.",
  menuAgain: "Here are the topics again.",
  yes: "Yes, thanks",
  no: "No, not really",
  talk: "Talk to a person",
  openLink: "Open this page",
} as const;

/** How long the typing dots show before a message: longer for more to read, never so long it feels
 * stuck. The client's own messages, which they just wrote, are shown at once. */
export function typingDelay(message: ChatMessage): number {
  if (message.from === "user") return 0;
  if (message.text.trim() === "") return 300;
  const words = message.text.trim().split(/\s+/).length;
  return Math.min(900, 250 + words * 30);
}

/** A flow that points back at itself through steps with nothing to wait for would never stop. */
const MAX_HOPS = 40;
const SUGGESTION_LIMIT = 3;

/** The greeting with {firstName} filled in. A visitor who isn't signed in has no name, so the
 * placeholder goes with its comma and space ("Hi {firstName}, how can we help?" reads "Hi, how can
 * we help?"), and a greeting that began with it still starts with a capital. */
export function fillGreeting(greeting: string, firstName: string | null): string {
  if (firstName) return greeting.replaceAll("{firstName}", firstName);
  const bare = greeting
    .replace(/\s*,?\s*\{firstName\}/g, "")
    .replace(/^[\s,!.:;-]+/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

type Work = ChatState & { events: SupportOutcomeEvent[]; version: number };

function say(w: Work, text: string, extra: Pick<ChatMessage, "link" | "card"> = {}) {
  w.seq += 1;
  w.messages.push({ id: w.seq, from: "bot", text, ...extra });
}

function said(w: Work, text: string) {
  w.seq += 1;
  w.messages.push({ id: w.seq, from: "user", text });
}

function endFlow(w: Work) {
  w.flowId = null;
  say(w, COPY.anythingElse);
  w.prompt = { kind: "MENU" };
}

function broken(w: Work) {
  w.flowId = null;
  say(w, COPY.broken);
  w.prompt = { kind: "TALK_OFFER" };
}

function event(w: Work, kind: SupportOutcomeEvent["kind"], rest: Partial<SupportOutcomeEvent> = {}) {
  w.events.push({ kind, contentVersion: w.version, ...rest });
}

function startFlow(w: Work, content: PublishedSupportContent, flowId: string, hops: number) {
  const flow = content.flows[flowId];
  if (!flow || hops > MAX_HOPS) return broken(w);
  w.flowId = flowId;
  if (w.flowPath[w.flowPath.length - 1] !== flowId) w.flowPath.push(flowId);
  event(w, "FLOW_STARTED", { flowId });
  runStep(w, content, flow.startStepId, hops + 1);
}

function runStep(w: Work, content: PublishedSupportContent, stepId: string, hops: number): void {
  const step = w.flowId ? content.flows[w.flowId]?.steps[stepId] : undefined;
  if (!step || hops > MAX_HOPS) return broken(w);
  switch (step.type) {
    case "MESSAGE":
      say(w, step.text);
      return step.next ? follow(w, content, step.next, hops + 1) : endFlow(w);
    case "CHOICES":
      if (step.text) say(w, step.text);
      w.prompt = { kind: "CHOICES", style: step.style, options: step.options };
      return;
    case "ACTION":
      w.prompt = { kind: "ACTION", actionKey: step.actionKey, onSuccess: step.onSuccess, onFailure: step.onFailure };
      return;
    case "DID_THAT_HELP":
      say(w, COPY.didItHelp);
      w.prompt = { kind: "HELP" };
      return;
  }
}

function follow(w: Work, content: PublishedSupportContent, target: SupportTarget, hops: number): void {
  switch (target.kind) {
    case "STEP":
      return runStep(w, content, target.stepId, hops);
    case "FLOW":
      return startFlow(w, content, target.flowId, hops);
    case "LINK":
      say(w, target.label ?? COPY.openLink, { link: { href: target.href, label: target.label ?? COPY.openLink } });
      return endFlow(w);
    case "TALK_TO_PERSON":
      w.prompt = { kind: "TALK" };
      return;
    case "END":
      return endFlow(w);
  }
}

/** The conversation's first state: the greeting and the topics. */
export function initialState(content: PublishedSupportContent, firstName: string | null): ChatState {
  const w: Work = { messages: [], prompt: { kind: "MENU" }, flowId: null, flowPath: [], noCount: 0, misses: 0, seq: 0, events: [], version: content.version };
  say(w, fillGreeting(content.settings.greeting, firstName));
  const { events, version, ...state } = w;
  void events;
  void version;
  return state;
}

export function reduce(content: PublishedSupportContent, state: ChatState, action: ChatAction): { state: ChatState; events: SupportOutcomeEvent[] } {
  const w: Work = { ...state, messages: [...state.messages], flowPath: [...state.flowPath], events: [], version: content.version };
  const { prompt } = state;
  const unchanged = { state, events: [] as SupportOutcomeEvent[] };

  switch (action.type) {
    case "START_FLOW": {
      if (action.label) said(w, action.label);
      w.misses = 0;
      w.noCount = 0;
      startFlow(w, content, action.flowId, 0);
      break;
    }
    case "CHOOSE": {
      const option = prompt.kind === "CHOICES" ? prompt.options[action.index] : undefined;
      if (!option) return unchanged;
      said(w, option.label);
      follow(w, content, option.target, 0);
      break;
    }
    case "PICK_SUGGESTION": {
      const flow = content.flows[action.flowId];
      if (prompt.kind !== "SUGGESTIONS" || !prompt.flowIds.includes(action.flowId) || !flow) return unchanged;
      said(w, flow.title);
      startFlow(w, content, action.flowId, 0);
      break;
    }
    case "TYPE": {
      const text = action.text.trim();
      if (text === "" || prompt.kind === "TALK" || prompt.kind === "ACTION") return unchanged;
      said(w, text);
      const matches = matchFlows(text, content.flows, SUGGESTION_LIMIT);
      if (matches.length > 0) {
        w.misses = 0;
        w.noCount = 0;
        say(w, COPY.suggestions);
        w.prompt = { kind: "SUGGESTIONS", flowIds: matches.map((m) => m.flowId) };
      } else {
        w.misses += 1;
        event(w, "UNMATCHED", { text });
        if (w.misses >= 2) {
          say(w, COPY.offerPerson);
          w.prompt = { kind: "TALK_OFFER" };
        } else {
          say(w, COPY.noMatch);
          w.prompt = { kind: "MENU" };
        }
      }
      break;
    }
    case "ANSWER_HELP": {
      if (prompt.kind !== "HELP") return unchanged;
      said(w, action.helped ? COPY.yes : COPY.no);
      const flowId = w.flowId ?? undefined;
      if (action.helped) {
        event(w, "HELPED_YES", { flowId });
        w.noCount = 0;
        say(w, COPY.glad);
        endFlow(w);
        break;
      }
      event(w, "HELPED_NO", { flowId });
      w.noCount += 1;
      const related = (flowId ? content.flows[flowId]?.relatedFlowIds ?? [] : []).filter((id) => id !== flowId && content.flows[id]).slice(0, SUGGESTION_LIMIT);
      if (w.noCount === 1 && related.length > 0) {
        say(w, COPY.related);
        w.prompt = { kind: "SUGGESTIONS", flowIds: related };
      } else {
        say(w, COPY.offerPerson);
        w.prompt = { kind: "TALK_OFFER" };
      }
      break;
    }
    case "TALK": {
      if (prompt.kind !== "TALK_OFFER") return unchanged;
      said(w, COPY.talk);
      w.prompt = { kind: "TALK" };
      break;
    }
    case "SHOW_MENU": {
      if (prompt.kind === "ACTION" || prompt.kind === "TALK") return unchanged;
      w.flowId = null;
      say(w, COPY.menuAgain);
      w.prompt = { kind: "MENU" };
      break;
    }
    case "ACTION_RESULT": {
      if (prompt.kind !== "ACTION") return unchanged;
      if (action.text || action.card) say(w, action.text ?? "", action.card ? { card: action.card } : {});
      follow(w, content, action.ok ? prompt.onSuccess : prompt.onFailure, 0);
      break;
    }
  }

  const { events, version, ...next } = w;
  void version;
  return { state: next, events };
}
