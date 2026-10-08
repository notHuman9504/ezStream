"use client"

import { useCallback, useEffect, useId, useRef, useState, type FocusEvent, type PointerEvent } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, type MotionValue } from "framer-motion"
import { cn } from "@/lib/utils"
import { FeedArt, type ArtKind } from "./FeedArt"

export type Capability = {
  name: string
  art: ArtKind
  description: string
}

// Width of the cursor preview and its distance from the pointer, in px.
const PREVIEW_WIDTH = 288
const PREVIEW_GAP = 28
// Most the card leans while the pointer moves sideways, in degrees.
const MAX_LEAN = 9

// Big centered names. With a mouse, hovering one dims the rest and a preview card
// follows the cursor; any row can also be pressed (or tapped) to read its line
// inline, which is how touch and keyboard users get the description.
export default function CapabilityList({ items }: { items: Capability[] }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [focused, setFocused] = useState<number | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const lean = useMotionValue(0)
  const hoveredRef = useRef<number | null>(null)
  const lastX = useRef<number | null>(null)
  const settleTimer = useRef<ReturnType<typeof setTimeout>>()
  const leaveTimer = useRef<ReturnType<typeof setTimeout>>()
  const lit = hovered ?? focused ?? open

  useEffect(() => {
    setMounted(true)
    return () => {
      clearTimeout(settleTimer.current)
      clearTimeout(leaveTimer.current)
    }
  }, [])

  // Only re-render when the hovered row actually changes.
  const hover = useCallback((index: number | null) => {
    if (hoveredRef.current === index) return
    hoveredRef.current = index
    if (index === null) lastX.current = null
    setHovered(index)
  }, [])

  // Scrolling moves the rows out from under a still pointer, so drop the card;
  // the next pointer move brings it back.
  useEffect(() => {
    if (hovered === null) return
    const onScroll = () => hover(null)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [hovered, hover])

  // Keep the card on the roomier side of the cursor, leaning into sideways
  // moves and straightening up shortly after the pointer stops.
  const track = (e: PointerEvent) => {
    const flip = e.clientX > window.innerWidth / 2
    pointerX.set(flip ? e.clientX - PREVIEW_GAP - PREVIEW_WIDTH : e.clientX + PREVIEW_GAP)
    pointerY.set(e.clientY)
    if (lastX.current !== null) {
      lean.set(Math.max(-MAX_LEAN, Math.min(MAX_LEAN, (e.clientX - lastX.current) * 0.8)))
    }
    lastX.current = e.clientX
    clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => lean.set(0), 90)
  }

  const onPointerMove = (e: PointerEvent<HTMLUListElement>) => {
    if (e.pointerType !== "mouse") return
    const row = (e.target as Element).closest<HTMLElement>("[data-row]")
    if (!row) return
    clearTimeout(leaveTimer.current)
    track(e)
    hover(Number(row.dataset.row))
  }

  return (
    <>
      <ul className="shell flex flex-col items-center text-center" onPointerMove={onPointerMove}>
        {items.map((item, i) => (
          <CapabilityRow
            key={item.name}
            item={item}
            index={i}
            dimmed={lit !== null && lit !== i}
            expanded={open === i}
            // A short grace period so moving between rows doesn't blink the card
            onPointerLeave={() => {
              clearTimeout(leaveTimer.current)
              leaveTimer.current = setTimeout(() => hover(null), 80)
            }}
            onFocus={e => {
              if (e.currentTarget.matches(":focus-visible")) setFocused(i)
            }}
            onBlur={() => setFocused(null)}
            onToggle={() => setOpen(current => (current === i ? null : i))}
          />
        ))}
      </ul>

      {mounted &&
        createPortal(
          <CursorPreview items={items} active={hovered} x={pointerX} y={pointerY} lean={lean} />,
          document.body
        )}
    </>
  )
}

type CapabilityRowProps = {
  item: Capability
  index: number
  dimmed: boolean
  expanded: boolean
  onPointerLeave: () => void
  onFocus: (e: FocusEvent<HTMLButtonElement>) => void
  onBlur: () => void
  onToggle: () => void
}

function CapabilityRow({
  item,
  index,
  dimmed,
  expanded,
  onPointerLeave,
  onFocus,
  onBlur,
  onToggle,
}: CapabilityRowProps) {
  const id = useId()
  const reduce = useReducedMotion()
  const panelId = `${id}-description`

  return (
    <li className="w-full">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={expanded ? panelId : undefined}
        data-row={index}
        onPointerLeave={onPointerLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        onClick={onToggle}
        className={cn(
          "rounded-field px-2 py-1 text-h2 transition-colors duration-500 ease-out md:py-1.5 md:text-h1",
          dimmed ? "text-fg-30" : "text-fg"
        )}
      >
        {item.name}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={
              reduce
                ? { duration: 0 }
                : { height: { type: "spring", stiffness: 320, damping: 30 }, opacity: { duration: 0.25 } }
            }
            className="overflow-hidden"
          >
            <p className="mx-auto max-w-[34ch] pb-5 pt-1 text-body text-fg-64">{item.description}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

type CursorPreviewProps = {
  items: Capability[]
  active: number | null
  x: MotionValue<number>
  y: MotionValue<number>
  lean: MotionValue<number>
}

const FOLLOW_SPRING = { stiffness: 320, damping: 30, mass: 0.6 }
const LEAN_SPRING = { stiffness: 260, damping: 18 }

// Fixed card that trails the pointer on a spring and leans into its motion. All
// artworks are stacked and cross-faded so switching rows never re-mounts them.
function CursorPreview({ items, active, x, y, lean }: CursorPreviewProps) {
  const reduce = useReducedMotion()
  const springX = useSpring(x, FOLLOW_SPRING)
  const springY = useSpring(y, FOLLOW_SPRING)
  const springLean = useSpring(lean, LEAN_SPRING)
  const wasVisible = useRef(false)
  const lastActive = useRef(0)
  const visible = active !== null
  if (active !== null) lastActive.current = active
  const shown = lastActive.current

  // Appear where the pointer is instead of flying in from the last spot.
  useEffect(() => {
    if (visible && !wasVisible.current) {
      springX.jump(x.get())
      springY.jump(y.get())
    }
    wasVisible.current = visible
  }, [visible, springX, springY, x, y])

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-40"
      style={{ x: reduce ? x : springX, y: reduce ? y : springY, rotate: reduce ? 0 : springLean, width: PREVIEW_WIDTH }}
    >
      <div className="-translate-y-1/2">
        <motion.div
          className="rounded-card bg-elevated p-2"
          initial={false}
          animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: reduce ? 1 : 0.7 }}
          transition={{ type: "spring", stiffness: 400, damping: 26 }}
        >
          <div className="relative aspect-[4/3] overflow-hidden rounded-tile">
            {items.map((item, i) => (
              <FeedArt
                key={item.name}
                kind={item.art}
                className={cn(
                  "absolute inset-0 transition-opacity duration-300",
                  i === shown ? "opacity-100" : "opacity-0"
                )}
              />
            ))}
          </div>
          <div className="grid px-2 pb-1.5 pt-3">
            {items.map((item, i) => (
              <p
                key={item.name}
                className={cn(
                  "text-body-sm text-fg-64 transition-opacity duration-300 [grid-area:1/1]",
                  i === shown ? "opacity-100" : "opacity-0"
                )}
              >
                {item.description}
              </p>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
