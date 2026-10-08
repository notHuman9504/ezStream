import * as React from "react"

import { cn } from "@/lib/utils"

// Shared so <textarea> and <select> can match <Input>.
export const fieldStyles =
  "w-full rounded-field border border-transparent bg-muted px-4 text-body text-fg placeholder:text-fg-30 transition-colors duration-200 hover:bg-elevated focus:border-fg/30 focus:bg-elevated focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger/60"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          fieldStyles,
          "h-12 file:border-0 file:bg-transparent file:text-body-sm file:text-fg",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
