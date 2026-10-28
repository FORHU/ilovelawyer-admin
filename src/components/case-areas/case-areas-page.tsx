"use client"

import { useState } from "react"
import { ArrowDown, ArrowUp, Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { ListPagination, usePagination } from "@/components/list-pagination"
import { CaseAreaDialog } from "@/components/case-areas/case-area-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { LawyerSite } from "@/lib/lawyers/queries"
import {
  type AdminCaseArea,
  CLIENT_CASE_SITE,
  OTHER_CASE_AREA,
  useCaseAreasQuery,
  useDeleteCaseAreaMutation,
  useReorderCaseAreasMutation,
  useUpdateCaseAreaMutation,
} from "@/lib/case-areas/queries"

const onError = (err: unknown) => toast.error((err as Error).message)

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

/** The ids in their new order after moving one row up or down. */
function moved(areas: AdminCaseArea[], index: number, by: -1 | 1): string[] {
  const ids = areas.map((a) => a.id)
  ;[ids[index], ids[index + by]] = [ids[index + by], ids[index]]
  return ids
}

/** Why a type can't be deleted, or null when it can. */
function undeletableReason(area: AdminCaseArea): string | null {
  if (area.code === OTHER_CASE_AREA) return "Other is where a case nothing else fits goes, so it always stays."
  const uses = [
    area.caseCount > 0 && `${plural(area.caseCount, "case has", "cases have")} it`,
    area.practiceAreaCount > 0 && `${plural(area.practiceAreaCount, "practice area maps", "practice areas map")} to it`,
  ].filter(Boolean)
  return uses.length ? `${uses.join(" and ")}. Switch it off instead.` : null
}

function DeleteDialog({ site, area, onClose }: { site: LawyerSite; area: AdminCaseArea; onClose: () => void }) {
  const remove = useDeleteCaseAreaMutation(site)
  return (
    <AlertDialog open onOpenChange={(open) => !open && !remove.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {area.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            No case has it and no practice area maps to it. It goes from the {site} list for good; you can add it again later as a new type.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel render={<Button variant="outline" disabled={remove.isPending} />}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            render={<Button variant="destructive" />}
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate(area.id, {
                onSuccess: () => {
                  toast.success(`${area.name} deleted`)
                  onClose()
                },
                onError,
              })
            }
          >
            {remove.isPending && <Loader2 className="size-3.5 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * One site's client case types: what a client picks as their case's "Type of issue" in the client
 * app, in this order, and what Jev chooses from when it decides a case's types. The site's practice
 * areas map to them. Client cases are UK only for now, so PH's list waits for them. Switching a type
 * off hides it from the picker and from Jev; cases that have it keep it. Only a type no case has and
 * no practice area maps to can be deleted, and Other always stays. Every change is in the audit
 * trail.
 */
export function CaseAreasPage({ site }: { site: LawyerSite }) {
  const { data, isLoading, isError, error } = useCaseAreasQuery(site)
  const update = useUpdateCaseAreaMutation(site)
  const reorder = useReorderCaseAreasMutation(site)
  const paged = usePagination(data)
  // Moving a row across a page edge follows it onto the next page.
  const move = (areas: AdminCaseArea[], index: number, by: -1 | 1) => {
    reorder.mutate(moved(areas, index, by), { onError })
    paged.setPage(paged.pageOf(index + by))
  }
  // undefined: closed; null: adding; an area: editing it.
  const [editing, setEditing] = useState<AdminCaseArea | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<AdminCaseArea | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-muted-foreground max-w-3xl text-sm">
          What clients pick as their case&apos;s type of issue, in this order. Jev reads each description to decide a case&apos;s types, and the lawyers
          holding a practice area mapped to a type get its requests. Switching a type off hides it from clients and from Jev; cases that have it keep it.
          {site !== CLIENT_CASE_SITE && ` ${site} clients can't open cases yet, so this list is ready for when they can.`}
        </p>
        <Button onClick={() => setEditing(null)}>
          <Plus className="size-3.5" />
          Add case type
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
      {isError && <p className="text-destructive text-sm">{(error as Error).message}</p>}
      {data && (
        <div className="rounded-2xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Order</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-20">Cases</TableHead>
                <TableHead className="w-28">Practice areas</TableHead>
                <TableHead className="w-24">Active</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground h-20 text-center">
                    No case types yet.
                  </TableCell>
                </TableRow>
              )}
              {paged.rows.map((area, i) => {
                const index = paged.start + i
                const isOther = area.code === OTHER_CASE_AREA
                const cantDelete = undeletableReason(area)
                return (
                  <TableRow key={area.id} className={area.isActive ? undefined : "text-muted-foreground"}>
                    <TableCell>
                      <div className="flex gap-0.5">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Move ${area.name} up`}
                          disabled={index === 0 || reorder.isPending}
                          onClick={() => move(data, index, -1)}
                        >
                          <ArrowUp />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Move ${area.name} down`}
                          disabled={index === data.length - 1 || reorder.isPending}
                          onClick={() => move(data, index, 1)}
                        >
                          <ArrowDown />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {area.name}
                      {!area.isActive && (
                        <Badge variant="outline" className="ml-2">
                          Off
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{area.code}</TableCell>
                    <TableCell className="max-w-sm truncate" title={area.description}>
                      {area.description}
                    </TableCell>
                    <TableCell className="tabular-nums">{area.caseCount}</TableCell>
                    <TableCell className="tabular-nums">{area.practiceAreaCount}</TableCell>
                    <TableCell>
                      {isOther ? (
                        <Tooltip>
                          <TooltipTrigger render={<span />}>
                            <Switch checked disabled aria-label={`${area.name} is always on`} />
                          </TooltipTrigger>
                          <TooltipContent>Always on: it&apos;s where a case nothing else fits goes.</TooltipContent>
                        </Tooltip>
                      ) : (
                        <Switch
                          checked={area.isActive}
                          disabled={update.isPending}
                          aria-label={area.isActive ? `Switch ${area.name} off` : `Switch ${area.name} on`}
                          onCheckedChange={(isActive) =>
                            update.mutate(
                              { id: area.id, patch: { isActive } },
                              { onSuccess: () => toast.success(isActive ? `${area.name} is on` : `${area.name} is off: clients can't pick it now`), onError }
                            )
                          }
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label={`Actions for ${area.name}`} />}>
                          <MoreHorizontal />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditing(area)}>
                            <Pencil />
                            Edit
                          </DropdownMenuItem>
                          {cantDelete ? (
                            <Tooltip>
                              <TooltipTrigger render={<div />}>
                                <DropdownMenuItem disabled>
                                  <Trash2 />
                                  Delete
                                </DropdownMenuItem>
                              </TooltipTrigger>
                              <TooltipContent>{cantDelete}</TooltipContent>
                            </Tooltip>
                          ) : (
                            <DropdownMenuItem variant="destructive" onClick={() => setDeleting(area)}>
                              <Trash2 />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
      {data && data.length > 0 && (
        <ListPagination total={paged.total} itemLabel="case type" page={paged.page} pageCount={paged.pageCount} onPageChange={paged.setPage} />
      )}

      {editing !== undefined && <CaseAreaDialog site={site} area={editing} onClose={() => setEditing(undefined)} />}
      {deleting && <DeleteDialog site={site} area={deleting} onClose={() => setDeleting(null)} />}
    </div>
  )
}
