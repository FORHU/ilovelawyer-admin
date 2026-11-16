"use client"

import { AccountTopUpPricingCard } from "@/components/settings/account-topup-pricing-card"
import { ClientCasePricingCard } from "@/components/settings/client-case-pricing-card"
import { ClientPromosCard } from "@/components/settings/client-promos-card"
import { ClientTopUpPacksCard } from "@/components/settings/client-topup-packs-card"
import { LawyerPricingCard } from "@/components/settings/lawyer-pricing-card"
import { PaymentPlansCard } from "@/components/settings/payment-plans-card"
import { SiteCurrencyCard } from "@/components/settings/site-currency-card"
import { PayoutSettingsCard } from "@/components/settings/payout-settings-card"
import type { LawyerSite } from "@/lib/lawyers/queries"
import { useClientPricingQuery } from "@/lib/settings/client-pricing"
import { lawyerCurrency, useLawyerPricingQuery } from "@/lib/settings/lawyer-pricing"
import { usePayoutSettingsQuery } from "@/lib/settings/payout-settings"
import { useAdminSettingsQuery } from "@/lib/settings/queries"

/*
 * Everything one site charges, for its Payment plans page (these used to sit on Settings, every site
 * side by side). Each section reads the same query as before and shows only this site's card. Every
 * card is keyed on its rows' updatedAt, so a change saved anywhere (another admin, another tab)
 * remounts it and re-seeds its draft state instead of silently diverging from the server.
 */

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {children}
    </section>
  )
}

function QueryState({ isLoading, error, what }: { isLoading: boolean; error: unknown; what: string }) {
  if (isLoading) return <p className="text-muted-foreground text-sm">Loading {what}…</p>
  if (error) return <p className="text-destructive text-sm">{(error as Error).message}</p>
  return null
}

function NotSetUp({ site }: { site: LawyerSite }) {
  return <p className="text-destructive text-sm">{site} isn&apos;t set up yet. Run the API&apos;s migrations or tenant seeder.</p>
}

/** The lawyer's monthly plans, priced in the site's currency (won on KR), and the platform fee on an
 * account AI top-up. Both come from the settings query. */
function LawyerPlansSections({ site }: { site: LawyerSite }) {
  const { data, isLoading, error } = useAdminSettingsQuery()
  const tenant = data?.tenants.find((t) => t.code === site)
  return (
    <>
      <Section title="Currency" description="What this site's lawyers pay in: their monthly plan and their account AI top-ups.">
        <QueryState isLoading={isLoading} error={error} what="the currency" />
        {data && !tenant && <NotSetUp site={site} />}
        {tenant && data && (
          <div className="grid gap-4 lg:grid-cols-2">
            <SiteCurrencyCard key={`${tenant.code}-${tenant.planCurrency}-${tenant.paymentPlans.map((p) => p.id).join(",")}`} tenant={tenant} currencies={data.planCurrencies} />
          </div>
        )}
      </Section>
      <Section
        title="Subscription plans"
        description={`The monthly plans lawyers on this site choose from${tenant ? `, priced in ${tenant.planCurrency}` : ""}. A new price reaches new checkouts; lawyers already subscribed keep paying what they signed up at.`}
      >
        <QueryState isLoading={isLoading} error={error} what="plans" />
        {data && !tenant && <NotSetUp site={site} />}
        {tenant && (
          // Also keyed on the top-up rate: the AI allowances are shown in won at that rate on KR.
          <PaymentPlansCard key={`${tenant.code}-${tenant.accountTopUp?.rateUpdatedAt}-${tenant.paymentPlans.map((p) => p.updatedAt).join(",")}`} tenant={tenant} />
        )}
      </Section>
      <Section title="Account AI top-up" description="What lawyers pay to top up their account's AI usage, and the platform fee on it. Changes apply immediately.">
        <QueryState isLoading={isLoading} error={error} what="the top-up fee" />
        {tenant && (
          <div className="grid gap-4 lg:grid-cols-2">
            <AccountTopUpPricingCard key={`${tenant.code}-${tenant.accountTopUp?.feeUpdatedAt}-${tenant.accountTopUp?.rateUpdatedAt}`} tenant={tenant} />
          </div>
        )}
      </Section>
    </>
  )
}

/** What clients pay in the client app on this site: a new case's credits, top-up packs, promos. */
function ClientPricingSection({ site }: { site: LawyerSite }) {
  const { data, isLoading, error } = useClientPricingQuery()
  const tenant = data?.tenants.find((t) => t.code === site)
  const pricing = tenant && data ? { ...tenant, currencies: data.currencies } : null
  return (
    <Section title="Client app pricing" description="What clients on this site pay in the client app. Changes reach checkout within about a minute.">
      <QueryState isLoading={isLoading} error={error} what="client pricing" />
      {data && !tenant && <NotSetUp site={site} />}
      {tenant && pricing && (
        <div className="grid gap-4 lg:grid-cols-2">
          {tenant.case ? (
            <ClientCasePricingCard key={`${tenant.code}-${tenant.case.updatedAt}`} pricing={pricing} row={tenant.case} />
          ) : (
            <NotSetUp site={site} />
          )}
          <ClientTopUpPacksCard key={`${tenant.code}-${tenant.packs.map((p) => `${p.id}:${p.updatedAt}:${p.isDefault}`).join(",")}`} pricing={pricing} />
          <ClientPromosCard key={`${tenant.code}-${tenant.promos.map((p) => `${p.id}:${p.updatedAt}:${p.redemptions}`).join(",")}`} pricing={pricing} />
        </div>
      )}
    </Section>
  )
}

/** How clients pay lawyers' quotes on this site (PayoutSettingsSvc): the platform fee deducted from
 * the quote, the hold on what the lawyer receives, and the minimum withdrawal. */
function PayoutSettingsSection({ site }: { site: LawyerSite }) {
  const { data, isLoading, error } = usePayoutSettingsQuery()
  const tenant = data?.tenants.find((t) => t.code === site)
  return (
    <Section
      title="Quote payments"
      description="The platform fee deducted from a lawyer's quote (clients pay the quote, nothing more), and when lawyers can withdraw the rest. A sent quote keeps its fee; changes reach new quotes and withdrawals within about a minute."
    >
      <QueryState isLoading={isLoading} error={error} what="quote payment settings" />
      {data && !tenant && <NotSetUp site={site} />}
      {tenant && data && (
        <div className="grid gap-4 lg:grid-cols-2">
          <PayoutSettingsCard key={`${tenant.code}-${tenant.updatedAt}`} tenant={tenant} limits={data.limits} />
        </div>
      )}
    </Section>
  )
}

/** What lawyers on this site pay in the client hand-off (ilovelawyer-api#598): the introduction fee
 * and the AI top-up packs for an engaged case. */
function LawyerPricingSection({ site }: { site: LawyerSite }) {
  const { data, isLoading, error } = useLawyerPricingQuery()
  const tenant = data?.tenants.find((t) => t.code === site)
  return (
    <Section
      title="Lawyer fees"
      description="What lawyers pay for more AI on an engaged case. The introduction fee is only charged on requests clients confirmed before quote payments. Changes reach the next charge within about a minute."
    >
      <QueryState isLoading={isLoading} error={error} what="lawyer fees" />
      {data && !tenant && <NotSetUp site={site} />}
      {tenant && data && (
        <div className="grid gap-4 lg:grid-cols-2">
          <LawyerPricingCard key={`${tenant.code}-${tenant.introFee?.updatedAt}-${tenant.packs.map((p) => `${p.id}:${p.updatedAt}`).join(",")}`} tenant={tenant} currency={lawyerCurrency(data)} />
        </div>
      )}
    </Section>
  )
}

/** Sites where client requests aren't open yet, so their quote payments and lawyer fees (in pounds,
 * like every quote) can't be charged: hidden there rather than shown at prices that don't apply. */
const CLIENT_REQUESTS_NOT_OPEN: readonly LawyerSite[] = ["KR"]

/** Every price and fee on one site, in the order a lawyer then a client meets them. */
export function SitePricingSections({ site }: { site: LawyerSite }) {
  const clientRequestsOpen = !CLIENT_REQUESTS_NOT_OPEN.includes(site)
  return (
    <div className="flex flex-col gap-8">
      <LawyerPlansSections site={site} />
      <ClientPricingSection site={site} />
      {clientRequestsOpen ? (
        <>
          <PayoutSettingsSection site={site} />
          <LawyerPricingSection site={site} />
        </>
      ) : (
        <Section
          title="Quote payments and lawyer fees"
          description="These apply to client requests, which aren't open on this site yet. They'll appear here, in this site's currency, when client requests open."
        >
          {null}
        </Section>
      )}
    </div>
  )
}
