import { useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useDraftStore } from "@/lib/support/draft-store"
import { isDraftConflict, supportKeys, useSaveSupportDraftMutation } from "@/lib/support/queries"

/** Sends the edited draft to the API. Resolves true when the server has it (or there was nothing to
 * send), false when it didn't: a conflict is shown by the bar, any other failure as a toast. */
export function useSaveDraft() {
  const queryClient = useQueryClient()
  const { mutateAsync, isPending } = useSaveSupportDraftMutation()

  const save = useCallback(async (): Promise<boolean> => {
    const { content, saved, updatedAt, load, setConflict } = useDraftStore.getState()
    if (!content || !updatedAt) return false
    if (JSON.stringify(content) === JSON.stringify(saved)) return true
    try {
      const draft = await mutateAsync({ content, expectedUpdatedAt: updatedAt })
      // The server's copy is the new baseline, but keep what was typed while the request was out.
      const typedSince = useDraftStore.getState().content
      load(draft)
      if (typedSince && JSON.stringify(typedSince) !== JSON.stringify(content)) useDraftStore.setState({ content: typedSince })
      queryClient.setQueryData(supportKeys.draft, draft)
      return true
    } catch (err) {
      if (isDraftConflict(err)) setConflict(true)
      else toast.error((err as Error).message)
      return false
    }
  }, [mutateAsync, queryClient])

  return { save, saving: isPending }
}
