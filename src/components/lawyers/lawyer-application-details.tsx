"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import {
  KR_COHORT_SUFFIX,
  KR_FIRM_TYPE_NAMES,
  KR_LOCAL_BAR_NAMES,
  KR_QUALIFICATION_ROUTE_NAMES,
  type AdminLawyerVerificationRow,
} from "@/lib/lawyers/queries"

const REGULATOR_NAMES: Record<string, string> = {
  SRA: "SRA (England and Wales)",
  LSS: "Law Society of Scotland",
  LSNI: "Law Society of Northern Ireland",
}

/** What each missing-field code means, for an application that isn't complete yet. */
const MISSING_LABELS: Record<string, string> = {
  regulator: "Regulator",
  registrationNumber: "Registration number",
  qualifiedJurisdictions: "Jurisdictions",
  rollNumber: "Roll number",
  ibpChapter: "IBP chapter",
  localBar: "Local bar association",
  practiceAreas: "Practice areas",
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" })
}

/** A fee from minor units, in the currency's own decimals (KRW has none). */
function formatFee(fee: { amountMinor: number; currency: string }): string {
  const format = new Intl.NumberFormat("en-GB", { style: "currency", currency: fee.currency })
  const decimals = format.resolvedOptions().maximumFractionDigits ?? 2
  return format.format(fee.amountMinor / 10 ** decimals)
}

/** A number the admin looks up on a register: monospaced, with a copy button. */
function Copyable({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Couldn't copy. Select the number instead.")
    }
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono select-all">{value}</span>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${value}`}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded p-0.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </span>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="min-w-0 break-words">{children ?? <span className="text-muted-foreground">—</span>}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">{title}</h3>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">{children}</dl>
    </section>
  )
}

/** The registration the admin checks, in the application's own country's terms. */
function RegistrationFields({ lawyer }: { lawyer: AdminLawyerVerificationRow }) {
  const r = lawyer.profile.registration
  switch (r.country) {
    case "UK":
      return (
        <>
          <Field label="Regulator">{r.regulator ? REGULATOR_NAMES[r.regulator] ?? r.regulator : null}</Field>
          <Field label="Registration number">{r.registrationNumber ? <Copyable value={r.registrationNumber} /> : null}</Field>
          <Field label="Qualified in">
            {r.qualifiedJurisdictions.length ? (
              <span className="flex flex-wrap gap-1">
                {r.qualifiedJurisdictions.map((j) => (
                  <Badge key={j} variant="outline">
                    {j}
                  </Badge>
                ))}
              </span>
            ) : null}
          </Field>
        </>
      )
    case "PH":
      return (
        <>
          <Field label="Roll of Attorneys number">{r.rollNumber ? <Copyable value={r.rollNumber} /> : null}</Field>
          <Field label="IBP chapter">{r.ibpChapter}</Field>
          <Field label="IBP membership number">{r.ibpMembershipNumber ? <Copyable value={r.ibpMembershipNumber} /> : null}</Field>
          <Field label="MCLE">{[r.mcleNumber, r.mclePeriod && `period ${r.mclePeriod}`].filter(Boolean).join(" · ") || null}</Field>
        </>
      )
    case "KR":
      return (
        <>
          <Field label="Korean Bar Association number">{r.registrationNumber ? <Copyable value={r.registrationNumber} /> : null}</Field>
          <Field label="Local bar association">{r.localBar ? KR_LOCAL_BAR_NAMES[r.localBar] : null}</Field>
          <Field label="Qualified through">
            {r.qualificationRoute
              ? `${KR_QUALIFICATION_ROUTE_NAMES[r.qualificationRoute]}${r.qualificationCohort != null ? ` · 제${r.qualificationCohort}${KR_COHORT_SUFFIX[r.qualificationRoute]}` : ""}`
              : null}
          </Field>
          <Field label="Registered on">{r.registeredOn ? formatDate(r.registeredOn) : null}</Field>
          <Field label="Registered specialties">
            {r.specialties.length ? (
              <span className="flex flex-wrap gap-1">
                {r.specialties.map((s) => (
                  <Badge key={s} variant="outline">
                    {s}
                  </Badge>
                ))}
              </span>
            ) : null}
          </Field>
        </>
      )
  }
}

/**
 * Everything a lawyer put in their Lawyer Application, with their firm beside it: what an admin
 * checks before approving or rejecting. Numbers the admin looks up on a register can be copied.
 */
export function LawyerApplicationDetails({ lawyer }: { lawyer: AdminLawyerVerificationRow }) {
  const { profile, firm } = lawyer
  const brn = firm?.businessRegistrationNumber?.replace(/^(\d{3})(\d{2})(\d{5})$/, "$1-$2-$3")
  const address = firm ? [firm.address.line1, firm.address.line2, firm.address.city, firm.address.postcode].filter(Boolean).join(", ") : ""

  return (
    <div className="flex flex-col gap-6 text-sm">
      {profile.missing.length > 0 && (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-amber-700 dark:text-amber-400">
          Not complete. Missing: {profile.missing.map((m) => MISSING_LABELS[m] ?? m).join(", ")}.
        </p>
      )}

      <Section title="Lawyer">
        <Field label="Name">{lawyer.name}</Field>
        <Field label="Email">
          <span className="select-all">{lawyer.email}</span>
        </Field>
        <Field label="Site">{profile.country}</Field>
        <Field label="Submitted">{lawyer.submittedAt ? formatDate(lawyer.submittedAt) : null}</Field>
      </Section>

      <Section title="Registration">
        <RegistrationFields lawyer={lawyer} />
      </Section>

      <Section title="Practice">
        <Field label="Practice areas">
          {profile.practiceAreas.length ? (
            <span className="flex flex-wrap gap-1">
              {profile.practiceAreas.map((a) => (
                <Badge key={a.id} variant="outline" className={a.isActive ? undefined : "text-muted-foreground line-through"} title={a.isActive ? undefined : "Switched off"}>
                  {a.name}
                </Badge>
              ))}
            </span>
          ) : null}
        </Field>
        <Field label="Languages">{profile.languages.length ? profile.languages.join(", ") : null}</Field>
        <Field label="First consultation fee">{profile.firstConsultationFee ? formatFee(profile.firstConsultationFee) : "Not offered"}</Field>
        <div className="flex min-w-0 flex-col gap-0.5 sm:col-span-2">
          <dt className="text-muted-foreground text-xs">About</dt>
          <dd className="whitespace-pre-line">{profile.bio || <span className="text-muted-foreground">—</span>}</dd>
        </div>
      </Section>

      <Section title="Firm">
        {firm ? (
          <>
            <Field label="Name">{firm.name}</Field>
            {firm.regulator || firm.registrationNumber ? (
              <Field label="Firm regulator and number">{[firm.regulator, firm.registrationNumber].filter(Boolean).join(" ")}</Field>
            ) : null}
            {firm.firmType ? <Field label="Firm type">{KR_FIRM_TYPE_NAMES[firm.firmType]}</Field> : null}
            {brn ? <Field label="Business registration number">{<Copyable value={brn} />}</Field> : null}
            <Field label="Phone">{firm.phone}</Field>
            <Field label="Address">{address || null}</Field>
          </>
        ) : (
          <Field label="Practice">Solo practitioner</Field>
        )}
      </Section>
    </div>
  )
}
