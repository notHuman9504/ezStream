"use client"

import { useEffect, useRef } from "react"
import { motion, useInView, useReducedMotion, useSpring } from "framer-motion"
import myRouter from "@/lib/route"
import { Button } from "@/components/ui/button"
import { LogoMark } from "@/components/brand/Logo"
import { MaskLines, Reveal } from "@/components/motion/Reveal"
import InternalLink from "./InternalLink"

// On narrow screens the rotating badge only shows while this is in view.
export const INTRO_ID = "intro"

// The entry gate: the sphere, a two-line statement and one way in.
export default function IntroSection() {
  const redirect = myRouter()

  return (
    <section id={INTRO_ID} className="relative flex min-h-svh flex-col items-center justify-center px-4 pb-28 pt-28 text-center sm:pt-32">
      <FloatingMark />

      <MaskLines
        as="h1"
        delay={0.3}
        className="mt-9 text-h3 sm:mt-10"
        lines={["live studio", "in your browser"]}
      />

      <Reveal delay={0.5} className="mt-8 sm:mt-10">
        <Button size="lg" onClick={() => redirect("/call")}>
          open the studio
        </Button>
      </Reveal>

      {/* Plain fade: it sits inside the bottom margin that Reveal's in-view check ignores */}
      <motion.div
        className="absolute inset-x-0 bottom-6 flex justify-center sm:bottom-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.8 }}
      >
        <InternalLink
          href="/signup"
          className="rounded-md text-body-sm font-medium text-fg-50 transition-colors hover:text-fg"
        >
          or create an account
        </InternalLink>
      </motion.div>
    </section>
  )
}

// Max tilt toward the cursor, in degrees, and how far the sphere leans, in px.
const TILT = 14
const LEAN = 8
const TILT_SPRING = { stiffness: 140, damping: 14, mass: 0.7 }

// The logo sphere drifts up and down and, with a mouse, turns to face the cursor.
function FloatingMark() {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const inView = useInView(ref)
  const rotateX = useSpring(0, TILT_SPRING)
  const rotateY = useSpring(0, TILT_SPRING)
  const x = useSpring(0, TILT_SPRING)
  const y = useSpring(0, TILT_SPRING)

  useEffect(() => {
    if (reduce || !inView || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return

    const onMove = (e: PointerEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5
      const ny = e.clientY / window.innerHeight - 0.5
      rotateY.set(nx * TILT * 2)
      rotateX.set(-ny * TILT * 2)
      x.set(nx * LEAN * 2)
      y.set(ny * LEAN * 2)
    }
    window.addEventListener("pointermove", onMove, { passive: true })
    return () => window.removeEventListener("pointermove", onMove)
  }, [reduce, inView, rotateX, rotateY, x, y])

  const float = !reduce && inView

  return (
    <motion.div
      ref={ref}
      className="relative"
      initial={reduce ? false : { opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.15 }}
    >
      <motion.div style={{ rotateX, rotateY, x, y, transformPerspective: 600 }}>
        <motion.div
          animate={float ? { y: [0, -10, 0] } : { y: 0 }}
          transition={float ? { duration: 6, ease: "easeInOut", repeat: Infinity } : { duration: 0.6 }}
        >
          <LogoMark className="size-[5.5rem] sm:size-28" />
        </motion.div>
      </motion.div>

      {/* Soft mint pool under the sphere, breathing with the float */}
      <motion.span
        aria-hidden
        className="absolute -bottom-5 left-1/2 -ml-8 block h-2.5 w-16 rounded-full bg-brand/25 blur-md sm:-bottom-6"
        animate={float ? { scaleX: [1, 0.8, 1], opacity: [0.9, 0.55, 0.9] } : { scaleX: 1, opacity: 0.9 }}
        transition={float ? { duration: 6, ease: "easeInOut", repeat: Infinity } : { duration: 0.6 }}
      />
    </motion.div>
  )
}
