"use client"

import { type ColumnDef } from "@tanstack/react-table"

import { LawyerVerificationActions } from "@/components/lawyers/lawyer-verification-actions"
import { RegisterCheckBadge } from "@/components/lawyers/register-check-badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { type AdminFirm, type AdminLawyerVerificationRow, type LawyerSite } from "@/lib/lawyers/queries"

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" })
}

const none = <span className="text-muted-foreground">—</span>

/** The firm's name, with its details on hover. Not reviewed separately; shown so the admin sees
 * who the lawyer works for beside their application. */
function FirmLine({ firm }: { firm: AdminFirm }) {
  const address = [firm.address.line1, firm.address.line2, firm.address.city, firm.address.postcode].filter(Boolean).join(", ")
  const registration = [firm.regulator, firm.registrationNumber].filter(Boolean).join(" ")
  const details = [registration, firm.phone, address].filter(Boolean)
  if (details.length === 0) return <span className="text-muted-foreground text-xs">{firm.name}</span>
  return (
    <Tooltip>
      <TooltipTrigger render={<button type="button" className="text-muted-foreground w-fit cursor-help text-left text-xs underline decoration-dotted underline-offset-2" />}>
        {firm.name}
      </TooltipTrigger>
      <TooltipContent className="flex max-w-xs flex-col gap-0.5 whitespace-normal">
        {details.map((line) => (
          <span key={line}>{line}</span>
        ))}
      </TooltipContent>
    </Tooltip>
  )
}

const lawyerColumn: ColumnDef<AdminLawyerVerificationRow> = {
  accessorKey: "name",
  header: "Lawyer",
  cell: ({ row }) => {
    const lawyer = row.original
    return (
      <div className="flex min-w-55 items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">{initials(lawyer.name)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-medium">{lawyer.name}</span>
          <span className="text-muted-foreground text-xs">{lawyer.email}</span>
          {lawyer.firm ? <FirmLine firm={lawyer.firm} /> : <span className="text-muted-foreground text-xs">Solo practitioner</span>}
        </div>
      </div>
    )
  },
}

const ukColumns: ColumnDef<AdminLawyerVerificationRow>[] = [
  {
    id: "registration",
    header: "Registration",
    cell: ({ row }) => {
      const r = row.original.profile.registration
      if (r.country !== "UK" || !r.regulator || !r.registrationNumber) return none
      return (
        <div className="flex min-w-37.5 items-center gap-1.5">
          <Badge variant="secondary">{r.regulator}</Badge>
          <span className="text-muted-foreground font-mono text-xs">{r.registrationNumber}</span>
        </div>
      )
    },
  },
  {
    id: "jurisdictions",
    header: "Jurisdictions",
    cell: ({ row }) => {
      const r = row.original.profile.registration
      if (r.country !== "UK" || !r.qualifiedJurisdictions.length) return none
      return (
        <div className="flex max-w-55 flex-wrap gap-1">
          {r.qualifiedJurisdictions.map((jurisdiction) => (
            <Badge key={jurisdiction} variant="outline">
              {jurisdiction}
            </Badge>
          ))}
        </div>
      )
    },
  },
  {
    id: "registerCheck",
    header: "Register check",
    cell: ({ row }) => <RegisterCheckBadge registerCheck={row.original.registerCheck} />,
  },
]

const phColumns: ColumnDef<AdminLawyerVerificationRow>[] = [
  {
    id: "roll",
    header: "Roll number",
    cell: ({ row }) => {
      const r = row.original.profile.registration
      if (r.country !== "PH" || !r.rollNumber) return none
      return <span className="text-muted-foreground font-mono text-xs">{r.rollNumber}</span>
    },
  },
  {
    id: "ibp",
    header: "IBP chapter",
    cell: ({ row }) => {
      const r = row.original.profile.registration
      if (r.country !== "PH" || !r.ibpChapter) return none
      return (
        <div className="flex min-w-37.5 flex-col">
          <span>{r.ibpChapter}</span>
          {r.ibpMembershipNumber && <span className="text-muted-foreground font-mono text-xs">{r.ibpMembershipNumber}</span>}
        </div>
      )
    },
  },
  {
    id: "mcle",
    header: "MCLE",
    cell: ({ row }) => {
      const r = row.original.profile.registration
      if (r.country !== "PH" || (!r.mcleNumber && !r.mclePeriod)) return none
      return (
        <div className="flex flex-col">
          {r.mcleNumber && <span className="font-mono text-xs">{r.mcleNumber}</span>}
          {r.mclePeriod && <span className="text-muted-foreground text-xs">Period {r.mclePeriod}</span>}
        </div>
      )
    },
  },
]

const tailColumns: ColumnDef<AdminLawyerVerificationRow>[] = [
  {
    accessorKey: "submittedAt",
    header: "Submitted",
    cell: ({ row }) => {
      // Null only for an UNSUBMITTED profile, which the page's status filter doesn't offer.
      const { submittedAt } = row.original
      return <span className="text-muted-foreground">{submittedAt ? formatDate(submittedAt) : "—"}</span>
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="min-w-37.5">
        <LawyerVerificationActions lawyer={row.original} />
      </div>
    ),
  },
]

/** The queue's columns for one site: each checks its own registration details. UK has a register
 * check (deferred, so always "check by hand" for now); PH has none. */
export function columnsFor(site: LawyerSite): ColumnDef<AdminLawyerVerificationRow>[] {
  return [lawyerColumn, ...(site === "PH" ? phColumns : ukColumns), ...tailColumns]
}
