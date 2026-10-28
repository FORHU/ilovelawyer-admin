"use client"

import { useState } from "react"
import { ArrowDown, ArrowUp, Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { PracticeAreaDialog } from "@/components/practice-areas/practice-area-dialog"
import { ListPagination, usePagination } from "@/components/list-pagination"
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
import { useCaseAreasQuery } from "@/lib/case-areas/queries"
import type { LawyerSite } from "@/lib/lawyers/queries"
import {
  type AdminPracticeArea,
  useDeletePracticeAreaMutation,
  usePracticeAreasQuery,
  useReorderPracticeAreasMutation,
  useUpdatePracticeAreaMutation,
} from "@/lib/practice-areas/queries"

const onError = (err: unknown) => toast.error((err as Error).message)

/** The ids in their new order after moving one row up or down. */
function moved(areas: AdminPracticeArea[], index: number, by: -1 | 1): string[] {
  const ids = areas.map((a) => a.id)
  ;[ids[index], ids[index + by]] = [ids[index + by], ids[index]]
  return ids
}

function DeleteDialog({ site, area, onClose }: { site: LawyerSite; area: AdminPracticeArea; onClose: () => void }) {
  const remove = useDeletePracticeAreaMutation(site)
  return (
    <AlertDialog open onOpenChange={(open) => !open && !remove.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {area.name}?</AlertDialogTitle>
          <AlertDialogDescription>No lawyer holds it. It goes from the {site} list for good; you can add it again later as a new area.</AlertDialogDescription>
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
 * One site's practice areas: what lawyers there pick on their Lawyer Application, in the order the
 * lawyer app shows them. Switching an area off hides it from the picker and from matching; lawyers
 * who hold it keep it. Only an area nobody holds can be deleted. An area's client case type decides
 * which client requests reach the lawyers holding it (UK only for now). Every change is in the audit
 * trail.
 */
export function PracticeAreasPage({ site }: { site: LawyerSite }) {
  const { data, isLoading, isError, error } = usePracticeAreasQuery(site)
  const update = useUpdatePracticeAreaMutation(site)
  const reorder = useReorderPracticeAreasMutation(site)
  const paged = usePagination(data)
  // Moving a row across a page edge follows it onto the next page.
  const move = (areas: AdminPracticeArea[], index: number, by: -1 | 1) => {
    reorder.mutate(moved(areas, index, by), { onError })
    paged.setPage(paged.pageOf(index + by))
  }
  // undefined: closed; null: adding; an area: editing it.
  const [editing, setEditing] = useState<AdminPracticeArea | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<AdminPracticeArea | null>(null)
  const caseAreas = useCaseAreasQuery(site).data
  const caseAreaName = (code: string) => caseAreas?.find((a) => a.code === code)?.name ?? code

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-muted-foreground max-w-3xl text-sm">
          What lawyers on the {site} site pick on their application, in this order. An area&apos;s client case type decides which client requests
          reach the lawyers holding it; one without routes nothing. Switching an area off hides it from new picks and from matching; lawyers who
          hold it keep it.
        </p>
        <Button onClick={() => setEditing(null)}>
          <Plus className="size-3.5" />
          Add practice area
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
                <TableHead>Client case type</TableHead>
                <TableHead className="w-24">Lawyers</TableHead>
                <TableHead className="w-24">Active</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground h-20 text-center">
                    No practice areas on this site yet.
                  </TableCell>
                </TableRow>
              )}
              {paged.rows.map((area, i) => {
                const index = paged.start + i
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
                    <TableCell>{area.caseArea ? <Badge variant="secondary">{caseAreaName(area.caseArea)}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="tabular-nums">{area.lawyerCount}</TableCell>
                    <TableCell>
                      <Switch
                        checked={area.isActive}
                        disabled={update.isPending}
                        aria-label={area.isActive ? `Switch ${area.name} off` : `Switch ${area.name} on`}
                        onCheckedChange={(isActive) =>
                          update.mutate(
                            { id: area.id, patch: { isActive } },
                            { onSuccess: () => toast.success(isActive ? `${area.name} is on` : `${area.name} is off: lawyers can't pick it now`), onError }
                          )
                        }
                      />
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
                          {area.lawyerCount > 0 ? (
                            <Tooltip>
                              <TooltipTrigger render={<div />}>
                                <DropdownMenuItem disabled>
                                  <Trash2 />
                                  Delete
                                </DropdownMenuItem>
                              </TooltipTrigger>
                              <TooltipContent>
                                {area.lawyerCount} {area.lawyerCount === 1 ? "lawyer holds" : "lawyers hold"} it. Switch it off instead.
                              </TooltipContent>
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
        <ListPagination total={paged.total} itemLabel="practice area" page={paged.page} pageCount={paged.pageCount} onPageChange={paged.setPage} />
      )}

      {editing !== undefined && <PracticeAreaDialog site={site} area={editing} onClose={() => setEditing(undefined)} />}
      {deleting && <DeleteDialog site={site} area={deleting} onClose={() => setDeleting(null)} />}
    </div>
  )
}
