"use client"

import { useCallback, useRef, useState } from "react"
import { AnimatePresence, motion, useScroll } from "framer-motion"
import { cn } from "@/lib/utils"
import { Tag } from "@/components/ui/tag"
import { EASE_OUT_EXPO, Reveal } from "@/components/motion/Reveal"
import CapabilitySpiral from "./CapabilitySpiral"
import CapabilityList, { type Capability } from "./CapabilityList"

type View = "spiral" | "list"

// What the studio can do, shown either as a turning WebGL helix of feed cards or
// as a big list. The spiral pins a full-screen stage while the page scrolls past
// it, and that scroll winds the helix on.
export default function CapabilitiesSection() {
  const [view, setView] = useState<View>("spiral")
  const sectionRef = useRef<HTMLElement>(null)
  const fallBack = useCallback(() => setView("list"), [])

  const changeView = (next: View) => {
    setView(next)
    // The two views differ a lot in height; keep the switch in place.
    sectionRef.current?.scrollIntoView({ block: "start" })
  }

  const switcher = <ViewSwitch view={view} onChange={changeView} />

  return (
    <section ref={sectionRef} id="capabilities" aria-labelledby="capabilities-title" className="relative">
      <AnimatePresence mode="wait" initial={false}>
        {view === "spiral" ? (
          <motion.div
            key="spiral"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
            transition={{ duration: 0.6 }}
          >
            <SpiralRunway switcher={switcher} onUnsupported={fallBack} />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            className="py-24 sm:py-32"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12, transition: { duration: 0.25 } }}
            transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
          >
            <Reveal className="shell flex flex-col items-center gap-4 text-center">
              <h2 id="capabilities-title">
                <Tag marker="paren">what&apos;s in the studio</Tag>
              </h2>
              {switcher}
            </Reveal>
            <div className="mt-10 sm:mt-14">
              <CapabilityList items={CAPABILITIES} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

type SpiralRunwayProps = {
  switcher: React.ReactNode
  onUnsupported: () => void
}

// A tall scroll runway with a pinned full-screen stage. Its own component so
// every mount binds useScroll to a fresh element.
function SpiralRunway({ switcher, onUnsupported }: SpiralRunwayProps) {
  const runwayRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: runwayRef, offset: ["start start", "end end"] })

  return (
    <div ref={runwayRef} className="relative h-[320svh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <h2 id="capabilities-title" className="sr-only">
          what&apos;s in the studio
        </h2>
        <CapabilitySpiral progress={scrollYProgress} onUnsupported={onUnsupported} />
        {/* A dark pill keeps the switch readable while bright cards pass behind it */}
        <div className="absolute left-1/2 top-24 -translate-x-1/2 rounded-full bg-background/60 px-5 py-2.5 backdrop-blur-md sm:top-28">
          {switcher}
        </div>
        <ul className="sr-only">
          {CAPABILITIES.map(item => (
            <li key={item.name}>
              {item.name}: {item.description}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

type ViewSwitchProps = {
  view: View
  onChange: (view: View) => void
}

function ViewSwitch({ view, onChange }: ViewSwitchProps) {
  return (
    <div role="group" aria-label="Show capabilities as" className="flex items-center gap-3 text-body-lg font-medium">
      <SwitchButton active={view === "spiral"} onClick={() => onChange("spiral")}>
        spiral
      </SwitchButton>
      <span aria-hidden className="size-1.5 rounded-full bg-fg" />
      <SwitchButton active={view === "list"} onClick={() => onChange("list")}>
        list
      </SwitchButton>
    </div>
  )
}

type SwitchButtonProps = {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

function SwitchButton({ active, onClick, children }: SwitchButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn("rounded-md transition-colors duration-300", active ? "text-fg" : "text-fg-50 hover:text-fg")}
    >
      {children}
    </button>
  )
}

const CAPABILITIES: Capability[] = [
  {
    name: "rooms",
    art: "room",
    description: "Share a short room ID and guests join from their own browser, camera and mic included.",
  },
  {
    name: "layouts",
    art: "grid",
    description: "Put tiles on the program and switch between grid, spotlight and sidebar while you're live.",
  },
  {
    name: "overlays",
    art: "lowerThird",
    description: "Title banner, lower third, ticker, clock, LIVE badge and watermark, in your accent color.",
  },
  {
    name: "screen share",
    art: "screen",
    description: "Put a shared screen or window next to the cameras, letterboxed so nothing gets cropped.",
  },
  {
    name: "audio mix",
    art: "audio",
    description: "Sound from every tile on the program is mixed into one track for the stream.",
  },
  {
    name: "rtmp output",
    art: "rtmp",
    description: "Send the program to YouTube, Twitch or any rtmp:// or rtmps:// address at 1280×720, 30 fps.",
  },
]
