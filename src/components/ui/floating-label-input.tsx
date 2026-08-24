import * as React from "react"

import { cn } from "@/lib/utils"

interface FloatingLabelInputProps extends React.ComponentProps<"input"> {
  label: string
  icon?: React.ReactNode
  endAdornment?: React.ReactNode
  error?: boolean
}

// Not shadcn's default Input (bg-input/50, transparent border) — this needs a solid
// border so the floating label can visually "cut" through it on focus/fill, matching
// the reference login design. Kept as its own component instead of a variant so other
// forms (e.g. the Users table search box) are unaffected.
//
// forwardRef so react-hook-form's register()/Controller can attach directly to the
// underlying <input> — a plain function component can't receive a ref.
const FloatingLabelInput = React.forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  ({ label, icon, endAdornment, error, id, className, ...props }, ref) => {
    const generatedId = React.useId()
    const inputId = id ?? generatedId

    return (
      <div className="relative">
        {icon && (
          <span
            className={cn(
              "pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground peer-focus:text-foreground",
              error && "text-destructive peer-focus:text-destructive"
            )}
          >
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          placeholder=" "
          aria-invalid={error || undefined}
          className={cn(
            "peer h-13 w-full rounded-xl border border-input bg-background px-3.5 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/20",
            icon && "pl-10.5",
            endAdornment && "pr-10.5",
            error &&
              "border-destructive focus:border-destructive focus:ring-destructive/20",
            className
          )}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 rounded bg-background px-1 text-sm text-muted-foreground transition-all",
            "peer-focus:top-0 peer-focus:text-xs peer-focus:text-foreground",
            "peer-not-placeholder-shown:top-0 peer-not-placeholder-shown:text-xs",
            error && "text-destructive peer-focus:text-destructive"
          )}
        >
          {label}
        </label>
        {endAdornment && (
          <span className="absolute top-1/2 right-3.5 -translate-y-1/2">{endAdornment}</span>
        )}
      </div>
    )
  }
)
FloatingLabelInput.displayName = "FloatingLabelInput"

export { FloatingLabelInput }
