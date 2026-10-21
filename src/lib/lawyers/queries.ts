import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/fetch"
import { useAuthStore } from "@/lib/store/auth.store"
import { mockListLawyerVerifications, mockRejectLawyer, mockVerifyLawyer } from "@/lib/lawyers/mocks"

// Mirrors ilovelawyer-api's src/types/client-handoff.ts and the AdminLawyerVerification /
// RegisterCheck schemas in src/swagger-client-handoff.ts (ilovelawyer-api#503, implemented by
// #506). Copy from there, not the other way around, if the two drift.
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
  // Null when the register couldn't be reached — the admin checks by hand.
  registerCheck: RegisterCheck | null
  submittedAt: string
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

// ilovelawyer-api#506 isn't live yet, but its contract (ilovelawyer-api#503) is final — this
// flag swaps the real calls below for the in-memory fixtures in lib/lawyers/mocks.ts so the
// screen can be built and demoed now. Delete this flag, the mock branches below, and mocks.ts
// together once #506 ships.
const USE_MOCKS = process.env.NEXT_PUBLIC_MOCK_LAWYER_VERIFICATIONS === "true"

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
    queryFn: () =>
      USE_MOCKS
        ? mockListLawyerVerifications(params)
        : apiFetch<AdminLawyerVerificationsPage>(`/api/admin/lawyer-verifications?${buildQueryString(params)}`),
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
      USE_MOCKS
        ? mockVerifyLawyer(userId, { confirmedJurisdictions, note })
        : apiFetch<AdminLawyerVerificationRow>(`/api/admin/lawyer-verifications/${userId}/verify`, {
            method: "POST",
            body: JSON.stringify({ confirmedJurisdictions, note }),
          }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "lawyer-verifications"] }),
  })
}

export function useRejectLawyerMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, note }: { userId: string; note: string }) =>
      USE_MOCKS
        ? mockRejectLawyer(userId, { note })
        : apiFetch<AdminLawyerVerificationRow>(`/api/admin/lawyer-verifications/${userId}/reject`, {
            method: "POST",
            body: JSON.stringify({ note }),
          }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "lawyer-verifications"] }),
  })
}
