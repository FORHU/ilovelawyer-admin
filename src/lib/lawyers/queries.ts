import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/fetch"
import { useAuthStore } from "@/lib/store/auth.store"

// Mirrors ilovelawyer-api's src/types/client-handoff.ts and the AdminLawyerVerification /
// RegisterCheck schemas in src/swagger-client-handoff.ts (ilovelawyer-api#503, implemented by
// #506), served by GET/POST /api/admin/lawyer-verifications. Copy from there, not the other way
// around, if the two drift.
export const LAWYER_REGULATORS = ["SRA", "LSS", "LSNI"] as const
export type LawyerRegulator = (typeof LAWYER_REGULATORS)[number]

export const UK_JURISDICTIONS = ["England and Wales", "Scotland", "Northern Ireland"] as const
export type UkJurisdiction = (typeof UK_JURISDICTIONS)[number]

export const PRACTICE_AREAS = ["EMPLOYMENT", "PROPERTY", "FAMILY", "CONSUMER", "OTHER"] as const
export type PracticeArea = (typeof PRACTICE_AREAS)[number]

export const LAWYER_VERIFICATION_STATUSES = ["UNSUBMITTED", "PENDING", "VERIFIED", "REJECTED"] as const
export type LawyerVerificationStatus = (typeof LAWYER_VERIFICATION_STATUSES)[number]

export const REGISTER_MISMATCH_REASONS = ["NOT_FOUND", "NAME", "NOT_PRACTISING", "JURISDICTION"] as const
export type RegisterMismatchReason = (typeof REGISTER_MISMATCH_REASONS)[number]

// LAWYER_REJECTION_REASONS in ilovelawyer-api's lawyer-verification.service.ts. Every reason but
// OTHER sends the lawyer a canned sentence; the note is appended to it, or is the whole message
// for OTHER.
export const LAWYER_REJECTION_REASONS = ["NAME_MISMATCH", "NOT_PRACTISING", "WRONG_JURISDICTION", "OTHER"] as const
export type LawyerRejectionReason = (typeof LAWYER_REJECTION_REASONS)[number]

export interface RegisterCheck {
  register: LawyerRegulator
  checkedAt: string
  found: boolean
  registeredName: string | null
  practising: boolean | null
  admittedOn: string | null
  mismatches: RegisterMismatchReason[]
}

export interface AdminLawyerProfile {
  regulator: LawyerRegulator | null
  registrationNumber: string | null
  qualifiedJurisdictions: UkJurisdiction[]
  practiceAreas: PracticeArea[]
  bio: string
  languages: string[]
  verification: {
    status: LawyerVerificationStatus
    note: string | null
    verifiedAt: string | null
  }
  missing: string[]
}

export interface AdminLawyerVerificationRow {
  userId: string
  name: string
  email: string
  organizationName: string | null
  profile: AdminLawyerProfile
  // Null when the register couldn't be reached — the admin checks by hand. Always null for now:
  // the register check is deferred (business decision, 2026-10-21).
  registerCheck: RegisterCheck | null
  // When the profile last joined the queue. Null only for UNSUBMITTED profiles.
  submittedAt: string | null
}

export interface AdminLawyerVerificationsPage {
  data: AdminLawyerVerificationRow[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface AdminLawyerVerificationsQueryParams {
  status: LawyerVerificationStatus
  page: number
  limit: number
}

const lawyerVerificationsQueryKey = (params: AdminLawyerVerificationsQueryParams) =>
  ["admin", "lawyer-verifications", params] as const

function buildQueryString(params: AdminLawyerVerificationsQueryParams): string {
  return new URLSearchParams({
    status: params.status,
    page: String(params.page),
    limit: String(params.limit),
  }).toString()
}

export function useAdminLawyerVerificationsQuery(params: AdminLawyerVerificationsQueryParams) {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: lawyerVerificationsQueryKey(params),
    queryFn: () => apiFetch<AdminLawyerVerificationsPage>(`/api/admin/lawyer-verifications?${buildQueryString(params)}`),
    enabled: !!accessToken,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  })
}

export function useVerifyLawyerMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      userId,
      confirmedJurisdictions,
      note,
    }: {
      userId: string
      confirmedJurisdictions: UkJurisdiction[]
      note?: string
    }) =>
      apiFetch<AdminLawyerVerificationRow>(`/api/admin/lawyer-verifications/${userId}/verify`, {
        method: "POST",
        body: JSON.stringify({ confirmedJurisdictions, note }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "lawyer-verifications"] }),
  })
}

export function useRejectLawyerMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, reason, note }: { userId: string; reason: LawyerRejectionReason; note?: string }) =>
      apiFetch<AdminLawyerVerificationRow>(`/api/admin/lawyer-verifications/${userId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason, note }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "lawyer-verifications"] }),
  })
}
