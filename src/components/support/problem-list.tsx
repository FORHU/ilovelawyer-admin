"use client"

import Link from "next/link"
import { AlertTriangle } from "lucide-react"

import type { SupportContentProblem } from "@/lib/support/types"

const FLOWS = "/dashboard/support/flows"

/** Where the editor shows what a problem's path points at: a flow (and the step in it), or Content. */
export function problemHref(path: string): string {
  const flow = /^flows\.([^.]+)(?:\.steps\.([^.[]+))?/.exec(path)
  if (flow) return `${FLOWS}/${encodeURIComponent(flow[1]!)}${flow[2] ? `#step-${flow[2]}` : ""}`
  return "/dashboard/support"
}

/** The problems on the part of the content at `prefix` (a flow, a step), for showing them in place. */
export const problemsAt = (problems: SupportContentProblem[], prefix: string) =>
  problems.filter((p) => p.path === prefix || p.path.startsWith(`${prefix}.`) || p.path.startsWith(`${prefix}[`))

export function ProblemList({ problems, linked = true }: { problems: SupportContentProblem[]; linked?: boolean }) {
  if (problems.length === 0) return null
  return (
    <ul className="flex flex-col gap-1.5" aria-label="Problems found">
      {problems.map((problem, i) => (
        <li key={`${problem.path}-${i}`} className="text-destructive flex items-start gap-2 text-sm">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0">
            {problem.message}
            {linked ? (
              <Link href={problemHref(problem.path)} className="text-foreground ml-2 text-xs underline underline-offset-2">
                Go to it
              </Link>
            ) : null}
            <span className="text-muted-foreground mt-0.5 block text-xs break-all">{problem.path}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
