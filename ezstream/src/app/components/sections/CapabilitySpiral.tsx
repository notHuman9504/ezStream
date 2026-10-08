"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion, type MotionValue } from "framer-motion"
import { EASE_OUT_EXPO } from "@/components/motion/Reveal"
import type { CardKind } from "./spiral/paintCards"

type CapabilitySpiralProps = {
  // Scroll progress through the section's runway, 0 to 1.
  progress: MotionValue<number>
  // WebGL isn't available; the section falls back to the list.
  onUnsupported: () => void
}

// Full-screen WebGL helix of feed cards. three.js and the card paintings load
// on mount, so they stay out of the page's initial bundle. Decorative: the
// section lists the same capabilities for screen readers.
export default function CapabilitySpiral({ progress, onUnsupported }: CapabilitySpiralProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduce = useReducedMotion() ?? false
  const [active, setActive] = useState<number | null>(null)
  const [thumbs, setThumbs] = useState<string[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stage = stageRef.current
    const canvas = canvasRef.current
    if (!stage || !canvas) return
    let disposed = false
    let cleanup = () => {}

    const setup = async () => {
      const [{ SpiralScene }, { paintCard }] = await Promise.all([
        import("./spiral/SpiralScene"),
        import("./spiral/paintCards"),
        document.fonts.ready,
      ])
      if (disposed) return

      const family = getComputedStyle(document.body).fontFamily
      const paintings = FEEDS.map(feed => paintCard(feed.kind, family))
      setThumbs(paintings.map(painting => thumbnail(painting)))

      let scene: InstanceType<typeof SpiralScene>
      try {
        scene = new SpiralScene(canvas, { textures: paintings, reducedMotion: reduce, onActiveChange: setActive })
      } catch {
        onUnsupported()
        return
      }

      const resize = () => scene.resize(stage.clientWidth, stage.clientHeight)
      resize()
      const resizeObserver = new ResizeObserver(resize)
      resizeObserver.observe(stage)

      scene.setScroll(progress.get())
      const unsubscribe = progress.on("change", value => scene.setScroll(value))

      const onPointerMove = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return
        const rect = stage.getBoundingClientRect()
        scene.setPointer(((e.clientX - rect.left) / rect.width) * 2 - 1, -(((e.clientY - rect.top) / rect.height) * 2 - 1))
      }
      const onPointerLeave = () => scene.setPointer(0, 0)
      stage.addEventListener("pointermove", onPointerMove)
      stage.addEventListener("pointerleave", onPointerLeave)

      // Only spend frames while the stage is on screen.
      const visibility = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) scene.start()
        else scene.stop()
      })
      visibility.observe(stage)
      setReady(true)

      cleanup = () => {
        visibility.disconnect()
        resizeObserver.disconnect()
        unsubscribe()
        stage.removeEventListener("pointermove", onPointerMove)
        stage.removeEventListener("pointerleave", onPointerLeave)
        scene.dispose()
      }
    }

    void setup()
    return () => {
      disposed = true
      cleanup()
    }
  }, [progress, reduce, onUnsupported])

  const current = active === null ? null : FEEDS[active]

  return (
    <div ref={stageRef} aria-hidden className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full transition-opacity duration-700"
        style={{ opacity: ready ? 1 : 0 }}
      />

      {/* Names the card at the front, like a caption that follows the spin */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[7%] flex justify-center px-4">
        <AnimatePresence mode="wait">
          {current && (
            <motion.div
              key={current.kind}
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.18 } }}
              transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
              className="flex items-center gap-3 rounded-field bg-fg p-2 pr-5 text-background shadow-[0_12px_40px_rgb(0_0_0/0.45)]"
            >
              {thumbs[active!] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbs[active!]} alt="" className="h-9 w-12 rounded-[0.5rem] object-cover" />
              )}
              <span className="text-body-lg font-medium">{current.caption}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function thumbnail(painting: HTMLCanvasElement) {
  const canvas = document.createElement("canvas")
  canvas.width = 144
  canvas.height = 108
  canvas.getContext("2d")!.drawImage(painting, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL("image/jpeg", 0.85)
}

const FEEDS: { kind: CardKind; caption: string }[] = [
  { kind: "camera", caption: "guest camera" },
  { kind: "screen", caption: "screen share" },
  { kind: "banner", caption: "title banner" },
  { kind: "lowerThird", caption: "lower third" },
  { kind: "grid", caption: "grid layout" },
  { kind: "ticker", caption: "ticker" },
  { kind: "room", caption: "room id" },
  { kind: "spotlight", caption: "spotlight layout" },
  { kind: "audio", caption: "audio mix" },
  { kind: "live", caption: "live badge" },
  { kind: "html", caption: "custom html" },
  { kind: "rtmp", caption: "rtmp out" },
]
