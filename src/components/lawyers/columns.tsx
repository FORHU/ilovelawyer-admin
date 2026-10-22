"use client"

import { type ColumnDef } from "@tanstack/react-table"

import { LawyerVerificationActions } from "@/components/lawyers/lawyer-verification-actions"
import { RegisterCheckBadge } from "@/components/lawyers/register-check-badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { type AdminLawyerVerificationRow } from "@/lib/lawyers/queries"

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

export const columns: ColumnDef<AdminLawyerVerificationRow>[] = [
  {
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
            {lawyer.organizationName && (
              <span className="text-muted-foreground text-xs">{lawyer.organizationName}</span>
            )}
          </div>
        </div>
      )
    },
  },
  {
    id: "registration",
    header: "Registration",
    cell: ({ row }) => {
      const { regulator, registrationNumber } = row.original.profile
      if (!regulator || !registrationNumber) return <span className="text-muted-foreground">—</span>
      return (
        <div className="flex min-w-37.5 items-center gap-1.5">
          <Badge variant="secondary">{regulator}</Badge>
          <span className="text-muted-foreground font-mono text-xs">{registrationNumber}</span>
        </div>
      )
    },
  },
  {
    id: "jurisdictions",
    header: "Jurisdictions",
    cell: ({ row }) => {
      const jurisdictions = row.original.profile.qualifiedJurisdictions
      if (!jurisdictions.length) return <span className="text-muted-foreground">—</span>
      return (
        <div className="flex max-w-55 flex-wrap gap-1">
          {jurisdictions.map((jurisdiction) => (
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
