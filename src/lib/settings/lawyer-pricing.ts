import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/fetch"
import { useAuthStore } from "@/lib/store/auth.store"
import type { TenantCode } from "@/lib/settings/queries"
import type { ClientCurrency } from "@/lib/settings/client-pricing"

// ilovelawyer-api's LawyerPricingSvc.listForAdmin (#598): what lawyers pay in the UK client hand-off,
// per tenant. The introduction fee is charged when a client confirms a lawyer; the AI top-up packs
// are what an engaged lawyer can buy. Amounts are in pence: always GBP, like every quote.

type UpdatedBy = { name: string | null; email: string } | null

// A PaymentPlan row with planType LAWYER_INTRO_FEE or LAWYER_AI_TOP_UP.
export interface LawyerPrice {
  id: string
  planType: "LAWYER_INTRO_FEE" | "LAWYER_AI_TOP_UP"
  code: string
  name: string
  level: number
  priceMinor: number
  /** LAWYER_AI_TOP_UP only: the AI credit the pack adds to the engagement's budget. */
  creditMinor: number | null
  currency: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  updatedBy: UpdatedBy
}

export interface LawyerTenantPricing {
  code: TenantCode
  name: string
  introFee: LawyerPrice | null
  packs: LawyerPrice[]
}

export interface LawyerPricingResponse {
  currency: string
  minMinor: number
  maxMinor: number
  tenants: LawyerTenantPricing[]
}

export type LawyerPackFields = { name: string; priceMinor: number; creditMinor: number }

const queryKey = ["admin", "lawyer-pricing"] as const
const BASE = "/api/admin/settings"

export function useLawyerPricingQuery() {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({ queryKey, queryFn: () => apiFetch<LawyerPricingResponse>(`${BASE}/lawyer-pricing`), enabled: !!accessToken })
}

function useInvalidatingMutation<V>(mutationFn: (vars: V) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey }) })
}

const send = (path: string, method: string, body: unknown) => apiFetch<unknown>(`${BASE}${path}`, { method, body: JSON.stringify(body) })

export const useUpdateLawyerIntroFeeMutation = () =>
  useInvalidatingMutation(({ tenant, priceMinor }: { tenant: TenantCode; priceMinor: number }) =>
    send(`/tenants/${tenant}/lawyer-pricing/intro-fee`, "PATCH", { priceMinor })
  )

export const useCreateLawyerPackMutation = () =>
  useInvalidatingMutation(({ tenant, pack }: { tenant: TenantCode; pack: LawyerPackFields & { code: string } }) =>
    send(`/tenants/${tenant}/lawyer-pricing/packs`, "POST", pack)
  )

export const useUpdateLawyerPackMutation = () =>
  useInvalidatingMutation(({ id, patch }: { id: string; patch: Partial<LawyerPackFields> & { isActive?: boolean } }) =>
    send(`/lawyer-pricing/packs/${id}`, "PATCH", patch)
  )

/** The currency lawyer prices are in, in the shape the shared amount fields take. Zero isn't
 * allowed: the API needs at least Stripe's minimum. */
export function lawyerCurrency(data: Pick<LawyerPricingResponse, "currency" | "minMinor" | "maxMinor">): ClientCurrency {
  return { code: data.currency, exponent: 2, minMinor: data.minMinor, maxMinor: data.maxMinor }
}

export function lawyerAmountInRange(amountMinor: number, currency: ClientCurrency): boolean {
  return Number.isInteger(amountMinor) && amountMinor >= currency.minMinor && amountMinor <= currency.maxMinor
}
