"use client"

import { Loader2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import type { ClientCurrency } from "@/lib/settings/client-pricing"

/** "$9.99" / "¥500" in the currency's own format, from a smallest-unit amount. Free reads "Free". */
export function formatPrice(amountMinor: number, currency: ClientCurrency | undefined, code: string): string {
  if (amountMinor === 0) return "Free"
  const exponent = currency?.exponent ?? 2
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: code, minimumFractionDigits: exponent, maximumFractionDigits: exponent }).format(amountMinor / 10 ** exponent)
  } catch {
    return `${(amountMinor / 10 ** exponent).toFixed(exponent)} ${code}`
  }
}

/** A top-up pack as the client app's payment modal shows it. */
export function PackPreview({ name, credits, priceLabel }: { name: string; credits: number; priceLabel: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border p-3 text-left">
      <div className="flex flex-col">
        <span className="text-foreground text-sm font-medium">{name || "Unnamed pack"}</span>
        <span className="text-muted-foreground text-xs">{credits} chat credits, one-time</span>
      </div>
      <span className="text-foreground text-sm font-semibold tabular-nums">{priceLabel}</span>
    </div>
  )
}

/**
 * Asks the admin to confirm a price change before it goes live, showing what clients will see.
 * Prices reach clients within about a minute of saving, so this is the last look before that.
 */
export function ConfirmPriceDialog({
  open,
  onOpenChange,
  title,
  preview,
  note,
  confirmLabel,
  pending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** The client-facing card or line, as clients will see it. */
  preview: React.ReactNode
  /** What else changes, when the preview doesn't say it (for example a before and after). */
  note?: string
  confirmLabel: string
  pending: boolean
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            Clients will see this within about a minute. Payments already taken keep the amount they were charged.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">What clients will see</span>
          {preview}
          {note && <span className="text-muted-foreground text-xs">{note}</span>}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel render={<Button variant="outline" disabled={pending} />}>Cancel</AlertDialogCancel>
          <AlertDialogAction render={<Button />} onClick={onConfirm} disabled={pending}>
            {pending && <Loader2 className="size-3.5 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
