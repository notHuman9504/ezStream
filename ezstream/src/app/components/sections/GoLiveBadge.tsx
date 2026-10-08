"use client"

import { useEffect, useId, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import InternalLink from "./InternalLink"
import { INTRO_ID } from "./IntroSection"
import { CLOSING_ID } from "./ClosingSection"

// Trailing no-break space: SVG drops a plain trailing space, closing the seam.
const LABEL = "go live • ezstream • 2026 •\u00a0"
// Circumference of the text circle (r = 48 in a 120 viewBox), so the label wraps exactly once.
const TEXT_LENGTH = 2 * Math.PI * 48

// Fixed bottom-left badge: circular text turning slowly around a small vivid
// card. It steps aside once the closing links (and the footer) scroll in, and on
// screens too narrow to keep content clear of it, once the intro scrolls away.
export default function GoLiveBadge() {
  const reduce = useReducedMotion()
  const pathId = `${useId().replace(/:/g, "")}-circle`
  const [wide, setWide] = useState(true)
  const [introInView, setIntroInView] = useState(true)
  const [closingInView, setClosingInView] = useState(false)
  const firstShow = useRef(true)
  const hidden = closingInView || (!wide && !introInView)

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)")
    const onChange = () => setWide(query.matches)
    onChange()
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    const intro = document.getElementById(INTRO_ID)
    const closing = document.getElementById(CLOSING_ID)
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.target === intro) setIntroInView(entry.intersectionRatio >= 0.5)
          // Visible, or already scrolled above the viewport
          if (entry.target === closing) setClosingInView(entry.isIntersecting || entry.boundingClientRect.top < 0)
        }
      },
      { threshold: [0, 0.5] }
    )
    if (intro) observer.observe(intro)
    if (closing) observer.observe(closing)
    return () => observer.disconnect()
  }, [])

  return (
    <motion.div
      className="fixed bottom-3 left-3 z-40 size-[88px] sm:bottom-6 sm:left-6 sm:size-[120px]"
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, rotate: -30 }}
      animate={hidden ? { opacity: 0, scale: reduce ? 1 : 0.6, rotate: 0 } : { opacity: 1, scale: 1, rotate: 0 }}
      // Only the first entrance waits for the intro to settle
      transition={{ type: "spring", stiffness: 220, damping: 18, delay: firstShow.current && !hidden ? 0.9 : 0 }}
      onAnimationComplete={() => {
        firstShow.current = false
      }}
      style={{ pointerEvents: hidden ? "none" : undefined }}
      aria-hidden={hidden || undefined}
    >
      <InternalLink
        href="/call"
        tabIndex={hidden ? -1 : undefined}
        aria-label="Go live: open the studio"
        className="group relative block size-full rounded-full"
      >
        <svg viewBox="0 0 120 120" aria-hidden className="absolute inset-0 size-full animate-spin-slow motion-reduce:animate-none">
          <defs>
            <path id={pathId} d="M12 60a48 48 0 1 1 96 0a48 48 0 1 1 -96 0" />
          </defs>
          <text className="fill-fg text-[12px] font-medium" style={{ letterSpacing: 0 }}>
            <textPath href={`#${pathId}`} textLength={TEXT_LENGTH} lengthAdjust="spacing">
              {LABEL}
            </textPath>
          </text>
        </svg>

        <span
          aria-hidden
          className="absolute inset-[29%] grid place-items-center rounded-[12px] shadow-[inset_0_1px_0_rgb(255_255_255/0.4)] transition-transform duration-500 ease-spring group-hover:-rotate-6 group-hover:scale-110 motion-reduce:transition-none"
          style={{ background: "radial-gradient(120% 100% at 20% 0%, #ffd36b 0%, #ff4f7a 55%, #8a1bd6 100%)" }}
        >
          <span
            className="block size-[34%] rounded-full"
            style={{ background: "radial-gradient(circle at 35% 30%, #ffffff, #ffe3ea 55%, #ffb3c6)" }}
          />
        </span>
      </InternalLink>
    </motion.div>
  )
}
