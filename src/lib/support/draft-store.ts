import { create } from "zustand"
import type { AdminSupportDraft, SupportContent, SupportContentProblem } from "@/lib/support/types"

// The draft being edited. Every Support Chat page edits this one copy; nothing reaches the API until
// Save. `saved` is the content as the server last had it, so "Unsaved changes" is a comparison, not a
// flag that can go stale. `updatedAt` is sent back with Save: a 409 says someone else saved first.

interface DraftState {
  content: SupportContent | null
  saved: SupportContent | null
  updatedAt: string | null
  currentVersion: number
  /** The server's draft differs from the published version. */
  hasUnpublishedChanges: boolean
  /** From the last Validate or refused Publish; cleared by an edit to what they point at. */
  problems: SupportContentProblem[]
  /** A save or publish found the draft changed by someone else. */
  conflict: boolean
  load: (draft: AdminSupportDraft) => void
  edit: (mutate: (draft: SupportContent) => void) => void
  setProblems: (problems: SupportContentProblem[]) => void
  setConflict: (conflict: boolean) => void
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export const useDraftStore = create<DraftState>((set) => ({
  content: null,
  saved: null,
  updatedAt: null,
  currentVersion: 0,
  hasUnpublishedChanges: false,
  problems: [],
  conflict: false,
  load: (draft) =>
    set({
      content: clone(draft.content),
      saved: clone(draft.content),
      updatedAt: draft.updatedAt,
      currentVersion: draft.currentVersion,
      hasUnpublishedChanges: draft.hasUnpublishedChanges,
      conflict: false,
    }),
  edit: (mutate) =>
    set((state) => {
      if (!state.content) return state
      const next = clone(state.content)
      mutate(next)
      return { content: next }
    }),
  setProblems: (problems) => set({ problems }),
  setConflict: (conflict) => set({ conflict }),
}))

/** True when the editor holds changes the server doesn't. */
export function useIsDirty(): boolean {
  return useDraftStore((s) => s.content !== null && JSON.stringify(s.content) !== JSON.stringify(s.saved))
}
