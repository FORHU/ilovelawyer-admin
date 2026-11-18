"use client"

import { useParams } from "next/navigation"

import { FlowEditor } from "@/components/support/flow-editor"

/** /dashboard/support/flows/[flowId]: one flow's details and steps, with the preview beside it. */
export default function SupportFlowPage() {
  const flowId = decodeURIComponent(useParams<{ flowId: string }>().flowId)
  // Keyed so moving between flows starts with that flow's own scroll and added-step state.
  return <FlowEditor key={flowId} flowId={flowId} />
}
