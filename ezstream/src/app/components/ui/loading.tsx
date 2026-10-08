"use client"

import { LogoMark } from "@/components/brand/Logo"
import { cn } from "@/lib/utils"

// First-load screen while Initializer checks the session. The page transition
// overlay sits underneath showing the same gate in step with this one, so when
// Initializer swaps us out nothing jumps; the overlay then fades it all away.
export default function AnimatedLoader() {
  return (
    <div id={PRELOADER_ID} role="status" className={cn("fixed inset-0 z-[110]", COVER_BG)}>
      <span className="sr-only">Loading ezStream</span>
      <PreloaderGate />
    </div>
  )
}

// The page transition polls for this id to know when Initializer has swapped us out.
export const PRELOADER_ID = "ezs-preloader"

// Sphere and a one-line statement, centered. Pure CSS animation so it already
// moves while the JS bundle is still loading, and two copies mounted in the
// same commit stay in sync.
export function PreloaderGate({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("absolute inset-0 grid place-items-center px-4", className)}>
      <div className="flex flex-col items-center text-center">
        <span className="block animate-in fade-in zoom-in-50 ease-spring fill-mode-both [animation-duration:900ms] motion-reduce:animate-none">
          <LogoMark className={cn("size-24", BREATHE)} />
        </span>
        <span className="mt-7 block overflow-hidden pb-[0.1em] text-h4">
          <span className="block text-fg-64 animate-in slide-in-from-bottom-full ease-out-expo fill-mode-both [animation-delay:150ms] [animation-duration:1s] motion-reduce:animate-none">
            live studio in your browser
          </span>
        </span>
      </div>
    </div>
  )
}

// Solid page color plus <body>'s grid and vignette (both covers are direct
// children of <body>), so the grid stays put while content fades under it. If
// the parent ever changes, the inherit falls back to plain bg-background.
export const COVER_BG =
  "bg-background [background-attachment:inherit] [background-image:inherit] [background-position:inherit] [background-size:inherit]"

// tailwindcss-animate's enter keyframe played back and forth: a slow sink and
// swell. Starts from rest, so it can be switched on mid-transition.
export const BREATHE =
  "animate-in zoom-in-95 slide-in-from-bottom-1.5 repeat-infinite direction-alternate-reverse [animation-duration:1.4s] [animation-timing-function:cubic-bezier(0.37,0,0.63,1)] motion-reduce:animate-none"
