"use client"

import * as React from "react"
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion"

export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const

type RevealProps = HTMLMotionProps<"div"> & {
  delay?: number
  // Distance in px the content travels up while fading in.
  y?: number
  once?: boolean
}

// Fades and lifts its children into place the first time they scroll into view.
export function Reveal({ delay = 0, y = 24, once = true, children, ...props }: RevealProps) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.9, ease: EASE_OUT_EXPO, delay }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

type MaskLinesProps = {
  lines: React.ReactNode[]
  className?: string
  lineClassName?: string
  delay?: number
  as?: "h1" | "h2" | "h3" | "p"
}

// Headline whose lines slide up from behind a mask, one after another.
export function MaskLines({ lines, className, lineClassName, delay = 0, as = "h2" }: MaskLinesProps) {
  const reduce = useReducedMotion()
  const Tag = motion[as]

  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ staggerChildren: 0.08, delayChildren: delay }}
    >
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
          <motion.span
            className={lineClassName ? `block ${lineClassName}` : "block"}
            variants={{
              hidden: reduce ? { y: 0 } : { y: "110%" },
              visible: { y: 0, transition: { duration: 1, ease: EASE_OUT_EXPO } },
            }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  )
}
