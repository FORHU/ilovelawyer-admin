import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/fetch"
import { useAuthStore } from "@/lib/store/auth.store"
import type { TenantCode } from "@/lib/settings/queries"

// ilovelawyer-api's ClientPricingSvc.listForAdmin: the client app's prices and promo codes, per
// tenant (a client pays their own tenant's). Amounts are in the currency's smallest unit (cents;
// yen have none).

export interface ClientCurrency {
  code: string
  exponent: number
  minMinor: number
  maxMinor: number
}

type UpdatedBy = { name: string | null; email: string } | null

// A PaymentPlan row with planType B2C_CASE or B2C_TOP_UP.
export interface ClientPrice {
  id: string
  planType: "B2C_CASE" | "B2C_TOP_UP"
  code: string
  name: string
  level: number
  priceMinor: number
  credits: number
  currency: string
  isActive: boolean
  isDefault: boolean
  createdAt: string
  updatedAt: string
  updatedBy: UpdatedBy
}

export interface ClientPromo {
  id: string
  code: string
  description: string
  discountMinor: number
  currency: string
  firstTopUpOnly: boolean
  oncePerClient: boolean
  expiresAt: string | null
  maxRedemptions: number | null
  isActive: boolean
  redemptions: number
  createdAt: string
  updatedAt: string
  updatedBy: UpdatedBy
}

export interface ClientTenantPricing {
  code: TenantCode
  name: string
  case: ClientPrice | null
  packs: ClientPrice[]
  promos: ClientPromo[]
}

export interface ClientPricingResponse {
  currencies: ClientCurrency[]
  tenants: ClientTenantPricing[]
}

/** One tenant's prices with the currencies they can be in: what each card works from. */
export type ClientPricing = ClientTenantPricing & { currencies: ClientCurrency[] }

export type PackFields = { name: string; priceMinor: number; credits: number; currency: string }
export type PromoFields = Omit<ClientPromo, "id" | "code" | "redemptions" | "createdAt" | "updatedAt" | "updatedBy">

const queryKey = ["admin", "client-pricing"] as const
const BASE = "/api/admin/settings"

export function useClientPricingQuery() {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({ queryKey, queryFn: () => apiFetch<ClientPricingResponse>(`${BASE}/client-pricing`), enabled: !!accessToken })
}

function useInvalidatingMutation<V>(mutationFn: (vars: V) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey }) })
}

const send = (path: string, method: string, body?: unknown) =>
  apiFetch<unknown>(`${BASE}${path}`, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

// Cases are free: only the credits a new case starts with.
export const useUpdateClientCaseMutation = () =>
  useInvalidatingMutation(({ code, patch }: { code: TenantCode; patch: { credits: number } }) =>
    send(`/tenants/${code}/client-pricing/case`, "PATCH", patch)
  )

export const useCreateClientPackMutation = () =>
  useInvalidatingMutation(({ tenant, pack }: { tenant: TenantCode; pack: PackFields & { code: string } }) =>
    send(`/tenants/${tenant}/client-pricing/packs`, "POST", pack)
  )

export const useUpdateClientPackMutation = () =>
  useInvalidatingMutation(({ id, patch }: { id: string; patch: Partial<PackFields> & { level?: number; isActive?: boolean } }) =>
    send(`/client-pricing/packs/${id}`, "PATCH", patch)
  )

export const useSetDefaultClientPackMutation = () =>
  useInvalidatingMutation((id: string) => send(`/client-pricing/packs/${id}/default`, "POST"))

export const useCreateClientPromoMutation = () =>
  useInvalidatingMutation(({ tenant, promo }: { tenant: TenantCode; promo: PromoFields & { code: string } }) =>
    send(`/tenants/${tenant}/client-promos`, "POST", promo)
  )

export const useUpdateClientPromoMutation = () =>
  useInvalidatingMutation(({ id, patch }: { id: string; patch: Partial<PromoFields> }) => send(`/client-promos/${id}`, "PATCH", patch))

/** "9.99" for 999 cents; "50" for 50 yen. */
export function toMajor(amountMinor: number, currency: ClientCurrency | undefined): string {
  const exponent = currency?.exponent ?? 2
  return (amountMinor / 10 ** exponent).toFixed(exponent)
}

/** The smallest-unit amount an admin typed in major units, or NaN. */
export function toMinor(major: string, currency: ClientCurrency | undefined): number {
  const n = Number(major)
  if (major.trim() === "" || !Number.isFinite(n)) return NaN
  return Math.round(n * 10 ** (currency?.exponent ?? 2))
}

/** Whether checkout would take this price: free, or within Stripe's minimum and our ceiling. */
export function priceInRange(amountMinor: number, currency: ClientCurrency | undefined): boolean {
  if (!currency || !Number.isInteger(amountMinor)) return false
  return amountMinor === 0 || (amountMinor >= currency.minMinor && amountMinor <= currency.maxMinor)
}

export function lastChanged(row: { updatedBy: UpdatedBy; updatedAt: string; createdAt: string }): string {
  if (!row.updatedBy && row.updatedAt === row.createdAt) return "As seeded · not changed yet"
  const when = new Date(row.updatedAt).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
  return `Last changed by ${row.updatedBy?.name ?? row.updatedBy?.email ?? "a deleted admin"} · ${when}`
}
