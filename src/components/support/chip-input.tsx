"use client"

import { useState, type KeyboardEvent } from "react"
import { X } from "lucide-react"

import { Input } from "@/components/ui/input"

/** A list of short words or phrases: type one and press Enter (or a comma) to add it, and each added
 * one has its own remove button. A duplicate, or one over the limit, is ignored. */
export function ChipInput({
  id,
  label,
  values,
  onChange,
  max,
  maxLength,
  placeholder,
  describedBy,
}: {
  id: string
  label: string
  values: string[]
  onChange: (values: string[]) => void
  max: number
  maxLength: number
  placeholder?: string
  describedBy?: string
}) {
  const [draft, setDraft] = useState("")

  const add = () => {
    const word = draft.trim()
    setDraft("")
    if (!word || values.length >= max || values.some((v) => v.toLowerCase() === word.toLowerCase())) return
    onChange([...values, word])
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      add()
    } else if (e.key === "Backspace" && draft === "" && values.length > 0) {
      onChange(values.slice(0, -1))
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={label}>
          {values.map((value) => (
            <li key={value} className="bg-muted flex items-center gap-1 rounded-2xl py-0.5 pr-1 pl-2.5 text-xs">
              {value}
              <button
                type="button"
                aria-label={`Remove ${value}`}
                className="hover:bg-foreground/10 focus-visible:ring-ring/40 flex size-5 items-center justify-center rounded-full outline-none focus-visible:ring-2"
                onClick={() => onChange(values.filter((v) => v !== value))}
              >
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Input
        id={id}
        value={draft}
        maxLength={maxLength}
        placeholder={values.length >= max ? `Up to ${max}` : placeholder}
        disabled={values.length >= max}
        aria-describedby={describedBy}
        onChange={(e) => setDraft(e.target.value.replace(/,/g, ""))}
        onKeyDown={onKeyDown}
        onBlur={add}
      />
    </div>
  )
}
