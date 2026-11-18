// COPY of ilovelawyer-client/src/lib/support/match.ts, so the preview matches typed words exactly as
// the client does. Keep the two in step: change the client file first, then copy it here.

import type { SupportFlow } from "./types";

export interface FlowMatch {
  flowId: string;
  title: string;
  score: number;
}

/** A match must score at least this: one trigger word, or one trigger phrase. */
export const MATCH_THRESHOLD = 2;
export const MATCH_LIMIT = 3;

/** One word as typed or written, without a plural "s" (so "refunds" meets "refund"). */
function stem(word: string) {
  return word.length > 3 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word;
}

/** Lower case, no punctuation, single spaces, plurals folded. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map(stem)
    .join(" ");
}

/** The flows a typed message most likely means, best first: at most three, each with a trigger in
 * the text as a whole word or phrase. A phrase scores more than a word, and every trigger that
 * hits adds up. No hit worth the threshold returns nothing, so the chat can say it didn't
 * understand rather than guess. */
export function matchFlows(text: string, flows: Record<string, SupportFlow>, limit = MATCH_LIMIT): FlowMatch[] {
  const haystack = ` ${normalize(text)} `;
  if (haystack.trim() === "") return [];
  const matches: FlowMatch[] = [];
  for (const flow of Object.values(flows)) {
    let score = 0;
    for (const trigger of flow.triggers) {
      const needle = normalize(trigger);
      if (needle === "" || !haystack.includes(` ${needle} `)) continue;
      score += needle.includes(" ") ? 3 : 2;
    }
    if (score >= MATCH_THRESHOLD) matches.push({ flowId: flow.id, title: flow.title, score });
  }
  return matches.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit);
}
