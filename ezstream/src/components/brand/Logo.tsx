"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"

// Glossy mint sphere with a play glyph pressed into it.
export function LogoMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "")

  return (
    <svg viewBox="0 0 64 64" className={cn("size-12", className)} aria-hidden>
      <defs>
        <radialGradient id={`${id}-body`} cx="34%" cy="26%" r="78%">
          <stop offset="0%" stopColor="#c9fff0" />
          <stop offset="28%" stopColor="#21ffc0" />
          <stop offset="62%" stopColor="#0b8f6a" />
          <stop offset="100%" stopColor="#031a14" />
        </radialGradient>
        <radialGradient id={`${id}-rim`} cx="50%" cy="100%" r="60%">
          <stop offset="0%" stopColor="#21ffc0" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#21ffc0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill={`url(#${id}-body)`} />
      <circle cx="32" cy="32" r="30" fill={`url(#${id}-rim)`} />
      <ellipse cx="25" cy="15" rx="13" ry="7" fill={`url(#${id}-shine)`} transform="rotate(-20 25 15)" />
      <path
        d="M27 22.5c0-2 2.1-3.2 3.8-2.2l12.4 7.5c1.7 1 1.7 3.4 0 4.4l-12.4 7.5c-1.7 1-3.8-.2-3.8-2.2z"
        fill="#fafafa"
        fillOpacity="0.95"
      />
    </svg>
  )
}

type LogoProps = {
  className?: string
  markClassName?: string
  wordmarkClassName?: string
}

export function Logo({ className, markClassName, wordmarkClassName }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-fg", className)}>
      <LogoMark className={markClassName} />
      <span className={cn("text-[1.1875rem] font-medium leading-none tracking-[-0.04em]", wordmarkClassName)}>
        ezstream
      </span>
    </span>
  )
}
