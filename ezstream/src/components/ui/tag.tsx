import * as React from "react"

import { cn } from "@/lib/utils"

type TagProps = React.HTMLAttributes<HTMLSpanElement> & {
  // dot: "· Label" eyebrow. paren: "(Label)" section marker. square: "■ Label" feature bullet.
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
    <span className={cn("inline-flex items-center gap-2 text-tag text-fg", className)} {...props}>
      {marker === "dot" && <span aria-hidden className="size-1 rounded-full bg-fg/60" />}
      {marker === "square" && <span aria-hidden className="size-1.5 bg-fg" />}
      {children}
    </span>
  )
}
