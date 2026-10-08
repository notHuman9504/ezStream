import * as React from "react"

import { cn } from "@/lib/utils"

type TagProps = React.HTMLAttributes<HTMLSpanElement> & {
  // dot: "• label" eyebrow. paren: "(label)" marker. square: "■ label" bullet.
  marker?: "dot" | "paren" | "square" | "none"
}

export function Tag({ marker = "dot", className, children, ...props }: TagProps) {
  if (marker === "paren") {
    return (
      <span className={cn("text-tag text-fg-50", className)} {...props}>
        ({children})
      </span>
    )
  }

  return (
    <span className={cn("inline-flex items-center gap-2 text-tag text-fg-50", className)} {...props}>
      {marker === "dot" && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {marker === "square" && <span aria-hidden className="size-1.5 bg-current" />}
      {children}
    </span>
  )
}
