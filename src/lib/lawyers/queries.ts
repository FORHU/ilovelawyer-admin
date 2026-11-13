import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/fetch"
import { useAuthStore } from "@/lib/store/auth.store"

// Mirrors ilovelawyer-api's src/types/client-handoff.ts, constants/lawyer-application.constants.ts
// and the AdminLawyerVerification / RegisterCheck schemas in src/swagger-client-handoff.ts
// (ilovelawyer-api#503, implemented by #506), served by GET/POST /api/admin/lawyer-verifications.
// Copy from there, not the other way around, if the two drift.

/** Sites with a Lawyer Application. Each has its own registration fields and reject reasons. */
export const LAWYER_SITES = ["UK", "PH", "KR"] as const
export type LawyerSite = (typeof LAWYER_SITES)[number]

export const LAWYER_REGULATORS = ["SRA", "LSS", "LSNI"] as const
export type LawyerRegulator = (typeof LAWYER_REGULATORS)[number]

export const UK_JURISDICTIONS = ["England and Wales", "Scotland", "Northern Ireland"] as const
export type UkJurisdiction = (typeof UK_JURISDICTIONS)[number]

/** KR_LOCAL_BARS in ilovelawyer-api, with the names admins see. */
export const KR_LOCAL_BAR_NAMES = {
  SEOUL: "서울지방변호사회 (Seoul)",
  GYEONGGI_BUKBU: "경기북부지방변호사회 (Gyeonggi Bukbu)",
  INCHEON: "인천지방변호사회 (Incheon)",
  GYEONGGI_JUNGANG: "경기중앙지방변호사회 (Gyeonggi Jungang)",
  GANGWON: "강원지방변호사회 (Gangwon)",
  CHUNGBUK: "충북지방변호사회 (Chungbuk)",
  DAEJEON: "대전지방변호사회 (Daejeon)",
  DAEGU: "대구지방변호사회 (Daegu)",
  BUSAN: "부산지방변호사회 (Busan)",
  ULSAN: "울산지방변호사회 (Ulsan)",
  GYEONGNAM: "경남지방변호사회 (Gyeongnam)",
  GWANGJU: "광주지방변호사회 (Gwangju)",
  JEONBUK: "전북지방변호사회 (Jeonbuk)",
  JEJU: "제주지방변호사회 (Jeju)",
} as const
export type KrLocalBar = keyof typeof KR_LOCAL_BAR_NAMES

/** KR_QUALIFICATION_ROUTES in ilovelawyer-api: the bar exam by round, or the JRTI by class. */
export const KR_QUALIFICATION_ROUTE_NAMES = { BAR_EXAM: "변호사시험 (bar exam)", JRTI: "사법연수원 (JRTI)" } as const
export type KrQualificationRoute = keyof typeof KR_QUALIFICATION_ROUTE_NAMES
/** How a cohort is written for its route: 제9회 (round 9), 제41기 (class 41). */
export const KR_COHORT_SUFFIX: Record<KrQualificationRoute, string> = { BAR_EXAM: "회", JRTI: "기" }

/** KR_FIRM_TYPES in ilovelawyer-api, with the names admins see. */
export const KR_FIRM_TYPE_NAMES = {
  LAW_FIRM: "법무법인 (law firm)",
  LAW_FIRM_LLC: "법무법인(유한) (limited law firm)",
  LAW_PARTNERSHIP: "법무조합 (law partnership)",
  JOINT_OFFICE: "공동법률사무소 (joint law office)",
  SOLE_OFFICE: "개인 법률사무소 (sole law office)",
} as const
export type KrFirmType = keyof typeof KR_FIRM_TYPE_NAMES


export const LAWYER_VERIFICATION_STATUSES = ["UNSUBMITTED", "PENDING", "VERIFIED", "REJECTED"] as const
export type LawyerVerificationStatus = (typeof LAWYER_VERIFICATION_STATUSES)[number]

export const REGISTER_MISMATCH_REASONS = ["NOT_FOUND", "NAME", "NOT_PRACTISING", "JURISDICTION"] as const
export type RegisterMismatchReason = (typeof REGISTER_MISMATCH_REASONS)[number]

// UK_ / PH_ / KR_REJECTION_REASONS in ilovelawyer-api's constants/lawyer-application.constants.ts. Every
// reason but OTHER sends the lawyer a canned sentence in the site's wording; the note is appended
// to it, or is the whole message for OTHER. The API refuses a reason from the other site.
export const REJECTION_REASONS_BY_SITE = {
  UK: ["NAME_MISMATCH", "NOT_PRACTISING", "WRONG_JURISDICTION", "OTHER"],
  PH: ["NAME_MISMATCH", "ROLL_NOT_FOUND", "NOT_IN_GOOD_STANDING", "OTHER"],
  KR: ["NAME_MISMATCH", "REGISTRATION_NOT_FOUND", "NOT_PRACTISING", "OTHER"],
} as const satisfies Record<LawyerSite, readonly string[]>
export type LawyerRejectionReason = (typeof REJECTION_REASONS_BY_SITE)[LawyerSite][number]

export interface RegisterCheck {
  register: LawyerRegulator
  checkedAt: string
  found: boolean
  registeredName: string | null
  practising: boolean | null
  admittedOn: string | null
  mismatches: RegisterMismatchReason[]
}

export interface UkRegistration {
  country: "UK"
  regulator: LawyerRegulator | null
  registrationNumber: string | null
  qualifiedJurisdictions: UkJurisdiction[]
}

export interface PhRegistration {
  country: "PH"
  /** Roll of Attorneys number. */
  rollNumber: string | null
  ibpChapter: string | null
  ibpMembershipNumber: string | null
  mcleNumber: string | null
  mclePeriod: string | null
}

export interface KrRegistration {
  country: "KR"
  /** 대한변호사협회 등록번호. */
  registrationNumber: string | null
  localBar: KrLocalBar | null
  qualificationRoute: KrQualificationRoute | null
  /** The bar exam round or JRTI class. */
  qualificationCohort: number | null
  /** Specialist areas registered with the Korean Bar Association (전문분야). */
  specialties: string[]
  /** YYYY-MM-DD. */
  registeredOn: string | null
}

export interface AdminLawyerProfile {
  country: LawyerSite
  registration: UkRegistration | PhRegistration | KrRegistration
  /** From the site's list (the Practice Area pages), in its order. isActive false: switched off
   * since the lawyer picked it. */
  practiceAreas: { id: string; name: string; isActive: boolean }[]
  bio: string
  languages: string[]
  verification: {
    status: LawyerVerificationStatus
    note: string | null
    verifiedAt: string | null
  }
  missing: string[]
}

/** The lawyer's organization's details, for a firm (null for a solo practitioner). Not reviewed
 * separately: shown beside the application. */
export interface AdminFirm {
  name: string
  regulator: LawyerRegulator | null
  registrationNumber: string | null
  /** KR only. */
  firmType?: KrFirmType | null
  businessRegistrationNumber?: string | null
  phone: string | null
  address: { line1: string | null; line2: string | null; city: string | null; postcode: string | null }
}

export interface AdminLawyerVerificationRow {
  userId: string
  name: string
  email: string
  /** Null for a solo practitioner. */
  organizationName: string | null
  firm: AdminFirm | null
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
  site: LawyerSite
  status: LawyerVerificationStatus
  page: number
  limit: number
}

const lawyerVerificationsQueryKey = (params: AdminLawyerVerificationsQueryParams) =>
  ["admin", "lawyer-verifications", params] as const

function buildQueryString(params: AdminLawyerVerificationsQueryParams): string {
  return new URLSearchParams({
    site: params.site,
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
      /** UK only; the API requires it there. PH sends none. */
      confirmedJurisdictions?: UkJurisdiction[]
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
