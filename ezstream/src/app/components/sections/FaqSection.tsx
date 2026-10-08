"use client"

import { useId, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tag } from "@/components/ui/tag"
import { Reveal } from "@/components/motion/Reveal"

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section id="faq" aria-labelledby="faq-title" className="py-24 sm:py-32">
      <div className="shell">
        <Reveal className="text-center">
          <h2 id="faq-title">
            <Tag marker="paren">questions</Tag>
          </h2>
        </Reveal>

        <Reveal delay={0.05}>
          <ul className="mx-auto mt-10 max-w-[760px] divide-y divide-line border-y border-line sm:mt-14">
            {FAQS.map((faq, i) => (
              <FaqItem
                key={faq.question}
                question={faq.question}
                answer={faq.answer}
                open={openIndex === i}
                onToggle={() => setOpenIndex(current => (current === i ? null : i))}
              />
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}

type FaqItemProps = {
  question: string
  answer: string
  open: boolean
  onToggle: () => void
}

function FaqItem({ question, answer, open, onToggle }: FaqItemProps) {
  const id = useId()
  const reduce = useReducedMotion()
  const buttonId = `${id}-question`
  const panelId = `${id}-answer`

  return (
    <li>
      <h3>
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={onToggle}
          className="group flex w-full items-center justify-between gap-6 rounded-field py-6 text-left text-h4 sm:py-7 sm:text-h3"
        >
          <span className="transition-transform duration-500 ease-spring group-hover:translate-x-1.5 motion-reduce:transition-none">
            {question}
          </span>
          {/* + turns into × */}
          <span
            aria-hidden
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-full transition-[background-color,color,transform] duration-500 ease-spring motion-reduce:transition-none",
              open ? "rotate-45 bg-fg text-background" : "bg-surface text-fg group-hover:bg-elevated"
            )}
          >
            <Plus className="size-4" strokeWidth={2} />
          </span>
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={
              reduce
                ? { duration: 0 }
                : { height: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.25 } }
            }
            className="overflow-hidden"
          >
            <p className="max-w-[60ch] pb-7 pr-14 text-body text-fg-64">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

const FAQS = [
  {
    question: "do guests need to install anything?",
    answer:
      "No. Everyone joins from a browser with camera and microphone access. Guests open the studio, enter your room ID, and their camera and any screen they share show up as tiles you can put on air.",
  },
  {
    question: "how many people can join a room?",
    answer:
      "Rooms are peer-to-peer: each browser sends its video straight to every other browser in the room. That keeps the delay low and suits small panels best, since every extra guest adds to everyone's upload.",
  },
  {
    question: "what happens to my stream key?",
    answer:
      "It lives in the studio while you work and is sent to the ezstream relay only when you go live, where it is used to build the address your stream is pushed to. It is never saved to your account.",
  },
  {
    question: "where does the video actually go?",
    answer:
      "Your browser draws the program, mixes the audio and encodes both. The chunks go to the relay, which converts them to H.264 and AAC with ffmpeg and pushes them to your RTMP or RTMPS URL. The relay doesn't record anything.",
  },
  {
    question: "what quality does the stream go out at?",
    answer:
      "1280×720 at 30 frames per second, with about 2.5 Mbps of video and 128 kbps of audio. Audio from every tile on the program is mixed into the stream.",
  },
  {
    question: "which overlays can i use?",
    answer:
      "A title banner, lower third, scrolling ticker, name tags, LIVE badge, clock and watermark, all in your accent color. In Chrome with HTML-in-Canvas enabled you can also add your own HTML.",
  },
]
