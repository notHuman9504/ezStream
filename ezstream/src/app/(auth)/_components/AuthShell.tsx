"use client"

import * as React from "react"
import { motion, useReducedMotion } from "framer-motion"
import { LogoMark } from "@/components/brand/Logo"
import { MaskLines, Reveal } from "@/components/motion/Reveal"

type AuthShellProps = {
  // Lowercase statement, one line.
  title: string
  lede: string
  // "new here? create an account", pinned to the bottom like an escape hatch.
  switchTo: { prompt: string; action: string; onSelect: () => void }
  children: React.ReactNode
}

// Shared gate for sign in / sign up: sphere, statement and form stacked in the
// middle of the screen, the link to the other page pinned to the bottom.
export function AuthShell({ title, lede, switchTo, children }: AuthShellProps) {
  const reduce = useReducedMotion()

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center px-4 pb-24 pt-24 sm:px-6 sm:pb-32 sm:pt-32">
      <div className="my-auto flex w-full flex-col items-center text-center">
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            opacity: { duration: 0.4, delay: ENTER_DELAY },
            scale: { type: "spring", stiffness: 260, damping: 17, delay: ENTER_DELAY },
          }}
        >
          <LogoMark className="size-16 sm:size-[72px]" />
        </motion.div>

        <MaskLines as="h1" lines={[title]} delay={ENTER_DELAY + 0.08} className="mt-8 text-h2" />

        <Reveal delay={ENTER_DELAY + 0.18} className="mt-4 max-w-sm">
          <p className="text-balance text-body text-fg-50">{lede}</p>
        </Reveal>

        <Reveal delay={ENTER_DELAY + 0.26} className="mt-10 w-full max-w-sm text-left">
          {children}
        </Reveal>
      </div>

      {/* Sits in the bottom padding, so it can't overlap the form. */}
      <Reveal
        delay={ENTER_DELAY + 0.4}
        // Default viewport margin would skip it: it lives in the bottom 10%.
        viewport={{ once: true }}
        className="absolute inset-x-0 bottom-6 px-4 text-center sm:bottom-8"
      >
        <p className="text-body-sm font-medium text-fg-50">
          {switchTo.prompt}{" "}
          <button
            type="button"
            onClick={switchTo.onSelect}
            className="rounded-sm text-fg underline decoration-transparent underline-offset-4 transition-colors hover:decoration-current"
          >
            {switchTo.action}
          </button>
        </p>
      </Reveal>
    </main>
  )
}

// Lets the page transition get most of the way out before anything moves.
const ENTER_DELAY = 0.3
