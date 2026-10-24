"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { type ClientCurrency, priceInRange, toMajor, toMinor } from "@/lib/settings/client-pricing"

/** A native select styled like Input: there's no Select component in components/ui yet. */
export function CurrencySelect({ value, currencies, onChange }: { value: string; currencies: ClientCurrency[]; onChange: (code: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">Currency</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-input bg-background h-8 w-24 rounded-md border px-2 text-sm"
        aria-label="Currency"
      >
        {currencies.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code}
          </option>
        ))}
      </select>
    </div>
  )
}

/** An amount typed in major units ("9.99"), with the currency's allowed range as a hint. */
export function AmountField({
  label,
  value,
  currency,
  onChange,
  allowZero = true,
}: {
  label: string
  value: string
  currency: ClientCurrency | undefined
  onChange: (value: string) => void
  allowZero?: boolean
}) {
  const minor = toMinor(value, currency)
  const invalid = value.trim() !== "" && !(allowZero ? priceInRange(minor, currency) : minor > 0 && minor <= (currency?.maxMinor ?? 0))
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={0}
        step={currency ? 1 / 10 ** currency.exponent : 0.01}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-28"
        aria-invalid={invalid}
      />
      {invalid && currency && (
        <span className="text-destructive text-xs">
          {allowZero ? "0, or " : ""}
          {toMajor(currency.minMinor, currency)}–{toMajor(currency.maxMinor, currency)}
        </span>
      )}
    </div>
  )
}

export function CreditsField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">Chat credits</Label>
      <Input type="number" min={1} step="1" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-24" />
    </div>
  )
}

export function validCredits(value: string): boolean {
  const n = Number(value)
  return Number.isInteger(n) && n >= 1
}
