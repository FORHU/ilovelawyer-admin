import type {
  AdminLawyerVerificationRow,
  AdminLawyerVerificationsPage,
  AdminLawyerVerificationsQueryParams,
  UkJurisdiction,
} from "@/lib/lawyers/queries"

// Stands in for ilovelawyer-api#506 (/admin/lawyer-verifications) until it ships. One fixture
// per state the screen has to render: a clean register match, each mismatch kind, a register
// that couldn't be reached, and a lawyer already verified or rejected. Mutated in place by
// mockVerifyLawyer/mockRejectLawyer so the list reflects actions without a page reload.
const rows: AdminLawyerVerificationRow[] = [
  {
    userId: "lawyer-priya-shah",
    name: "Priya Shah",
    email: "priya.shah@shahlegal.co.uk",
    organizationName: "Shah Legal",
    profile: {
      regulator: "SRA",
      registrationNumber: "487213",
      qualifiedJurisdictions: ["England and Wales"],
      practiceAreas: ["EMPLOYMENT", "CONSUMER"],
      bio: "Eight years in employment tribunals, previously at a City firm.",
      languages: ["English", "Gujarati"],
      verification: { status: "PENDING", note: null, verifiedAt: null },
      missing: [],
    },
    registerCheck: {
      register: "SRA",
      checkedAt: "2026-10-18T09:12:00Z",
      found: true,
      registeredName: "Priya Shah",
      practising: true,
      admittedOn: "2018-03-12",
      mismatches: [],
    },
    submittedAt: "2026-10-17T15:40:00Z",
  },
  {
    userId: "lawyer-daniel-ko",
    name: "Daniel Ko",
    email: "daniel.ko@kopartners.co.uk",
    organizationName: "Ko Partners",
    profile: {
      regulator: "SRA",
      registrationNumber: "552091",
      qualifiedJurisdictions: ["England and Wales"],
      practiceAreas: ["PROPERTY"],
      bio: "Residential conveyancing and landlord-tenant disputes.",
      languages: ["English", "Korean"],
      verification: { status: "PENDING", note: null, verifiedAt: null },
      missing: [],
    },
    registerCheck: {
      register: "SRA",
      checkedAt: "2026-10-19T11:02:00Z",
      found: true,
      registeredName: "Daniel Koh",
      practising: true,
      admittedOn: "2015-09-01",
      mismatches: ["NAME"],
    },
    submittedAt: "2026-10-18T10:05:00Z",
  },
  {
    userId: "lawyer-helena-cross",
    name: "Helena Cross",
    email: "helena.cross@crossfamilylaw.co.uk",
    organizationName: null,
    profile: {
      regulator: "SRA",
      registrationNumber: "398744",
      qualifiedJurisdictions: ["England and Wales"],
      practiceAreas: ["FAMILY"],
      bio: "Sole practitioner, family law and divorce settlements.",
      languages: ["English"],
      verification: { status: "PENDING", note: null, verifiedAt: null },
      missing: [],
    },
    registerCheck: {
      register: "SRA",
      checkedAt: "2026-10-19T14:30:00Z",
      found: true,
      registeredName: "Helena Cross",
      practising: false,
      admittedOn: "2011-06-20",
      mismatches: ["NOT_PRACTISING"],
    },
    submittedAt: "2026-10-19T09:00:00Z",
  },
  {
    userId: "lawyer-omar-siddiqui",
    name: "Omar Siddiqui",
    email: "omar.siddiqui@belfastlegal.co.uk",
    organizationName: "Belfast Legal Collective",
    profile: {
      regulator: "LSNI",
      registrationNumber: "NI-20847",
      qualifiedJurisdictions: ["Northern Ireland"],
      practiceAreas: ["CONSUMER", "OTHER"],
      bio: "Consumer disputes and small-claims representation.",
      languages: ["English", "Urdu"],
      verification: { status: "PENDING", note: null, verifiedAt: null },
      missing: [],
    },
    // The LSNI register lookup failed (timeout, or the register has no API) — the admin checks by hand.
    registerCheck: null,
    submittedAt: "2026-10-20T08:15:00Z",
  },
  {
    userId: "lawyer-fiona-mackay",
    name: "Fiona Mackay",
    email: "fiona.mackay@mackaywrits.co.uk",
    organizationName: "Mackay Writs",
    profile: {
      regulator: "LSS",
      registrationNumber: "SC-11420",
      qualifiedJurisdictions: ["Scotland"],
      practiceAreas: ["PROPERTY", "FAMILY"],
      bio: "Conveyancing and executry across the Central Belt.",
      languages: ["English"],
      verification: { status: "VERIFIED", note: null, verifiedAt: "2026-10-10T13:00:00Z" },
      missing: [],
    },
    registerCheck: {
      register: "LSS",
      checkedAt: "2026-10-10T12:45:00Z",
      found: true,
      registeredName: "Fiona Mackay",
      practising: true,
      admittedOn: "2009-11-30",
      mismatches: [],
    },
    submittedAt: "2026-10-09T16:20:00Z",
  },
  {
    userId: "lawyer-tom-whitfield",
    name: "Tom Whitfield",
    email: "tom.whitfield@whitfieldlaw.co.uk",
    organizationName: "Whitfield Law",
    profile: {
      regulator: "SRA",
      registrationNumber: "610239",
      qualifiedJurisdictions: ["England and Wales"],
      practiceAreas: ["EMPLOYMENT"],
      bio: "Employment law, recently qualified.",
      languages: ["English"],
      verification: {
        status: "REJECTED",
        note: "Registration number doesn't appear on the SRA register at all — please double-check and resubmit.",
        verifiedAt: null,
      },
      missing: [],
    },
    registerCheck: {
      register: "SRA",
      checkedAt: "2026-10-05T10:00:00Z",
      found: false,
      registeredName: null,
      practising: null,
      admittedOn: null,
      mismatches: ["NOT_FOUND"],
    },
    submittedAt: "2026-10-04T12:00:00Z",
  },
]

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function findRow(userId: string): AdminLawyerVerificationRow {
  const row = rows.find((r) => r.userId === userId)
  if (!row) throw Object.assign(new Error("No such lawyer"), { status: 404 })
  return row
}

export async function mockListLawyerVerifications(
  params: AdminLawyerVerificationsQueryParams
): Promise<AdminLawyerVerificationsPage> {
  await delay(300)
  const filtered = rows.filter((r) => r.profile.verification.status === params.status)
  const start = (params.page - 1) * params.limit
  const pageRows = filtered.slice(start, start + params.limit)
  return {
    data: clone(pageRows),
    total: filtered.length,
    page: params.page,
    limit: params.limit,
    totalPages: Math.max(1, Math.ceil(filtered.length / params.limit)),
  }
}

export async function mockVerifyLawyer(
  userId: string,
  body: { confirmedJurisdictions: UkJurisdiction[]; note?: string }
): Promise<AdminLawyerVerificationRow> {
  await delay(300)
  const row = findRow(userId)
  const hasMismatch = (row.registerCheck?.mismatches.length ?? 0) > 0
  if (hasMismatch && !body.note?.trim()) {
    throw Object.assign(new Error("A register mismatch needs a note"), { status: 400 })
  }
  row.profile.qualifiedJurisdictions = body.confirmedJurisdictions
  row.profile.verification = {
    status: "VERIFIED",
    note: body.note?.trim() || null,
    verifiedAt: new Date().toISOString(),
  }
  return clone(row)
}

export async function mockRejectLawyer(userId: string, body: { note: string }): Promise<AdminLawyerVerificationRow> {
  await delay(300)
  const row = findRow(userId)
  row.profile.verification = { status: "REJECTED", note: body.note.trim(), verifiedAt: null }
  return clone(row)
}
