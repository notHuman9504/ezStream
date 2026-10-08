"use client"

import { useRef } from "react"
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion"

const STATEMENT =
  "ezstream is a live studio that fits in a browser tab. bring guests into a room, frame the shot with titles, lower thirds and a ticker, then send it to youtube, twitch or any rtmp server. nothing to install, for you or for them."

const WORDS = STATEMENT.split(" ")

// Share of the scroll used to fill the words; the rest holds the finished line.
const FILL_END = 0.85

// A centered paragraph pinned in place while each word fills from dim to white
// as the reader scrolls through the section.
export default function StatementSection() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.25", "end end"] })

  return (
    <section ref={ref} aria-label="About ezstream" className="relative h-[220svh]">
      <div className="sticky top-0 flex h-svh items-center justify-center px-4">
        <p className="sr-only">{STATEMENT}</p>
        <p aria-hidden className="mx-auto max-w-[26ch] text-balance text-center text-h3">
          {WORDS.map((word, i) => (
            <Word
              key={i}
              progress={scrollYProgress}
              range={[(i / WORDS.length) * FILL_END, ((i + 1) / WORDS.length) * FILL_END]}
              still={!!reduce}
            >
              {word}
            </Word>
          ))}
        </p>
      </div>
    </section>
  )
}

type WordProps = {
  progress: MotionValue<number>
  range: [number, number]
  still: boolean
  children: string
}

function Word({ progress, range, still, children }: WordProps) {
  const opacity = useTransform(progress, range, [0.2, 1])

  return (
    <>
      <motion.span style={{ opacity: still ? 1 : opacity }}>{children}</motion.span>{" "}
    </>
  )
}
