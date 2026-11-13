"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export interface SimpleSelectItem {
  value: string
  label: string
}

/** One choice from a short list. The `label` names the control for a screen reader, since the
 * visible one sits beside it. */
export function SimpleSelect({
  value,
  items,
  onChange,
  label,
  placeholder,
  id,
  className,
  invalid,
}: {
  value: string
  items: SimpleSelectItem[]
  onChange: (value: string) => void
  label: string
  placeholder?: string
  id?: string
  className?: string
  invalid?: boolean
}) {
  return (
    <Select items={items} value={value} onValueChange={(next) => onChange(next as string)}>
      <SelectTrigger id={id} aria-label={label} aria-invalid={invalid || undefined} className={className ?? "w-full"}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
