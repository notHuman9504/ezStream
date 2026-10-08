"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Tag } from "@/components/ui/tag"
import { EASE_OUT_EXPO, Reveal } from "@/components/motion/Reveal"
import InternalLink from "./InternalLink"

// The rotating badge hides once this section scrolls in.
export const CLOSING_ID = "start"

// A centered stack of huge links; hovering or focusing one dims the others.
export default function ClosingSection() {
  const reduce = useReducedMotion()

  return (
    <section id={CLOSING_ID} aria-labelledby="closing-title" className="py-24 sm:py-36">
      <div className="shell flex flex-col items-center text-center">
        <Reveal>
          <h2 id="closing-title">
            <Tag marker="paren">ready when you are</Tag>
          </h2>
        </Reveal>

        <motion.ul
          className="group/stack mt-8 flex flex-col items-center sm:mt-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "0px 0px -10% 0px" }}
          transition={{ staggerChildren: 0.08 }}
        >
          {LINKS.map(link => (
            // Clipped below (for the slide-up) but open at the sides for the hover dot
            <li key={link.label} className="-mb-[0.12em] pb-[0.12em] text-h1 [clip-path:inset(-20%_-1em_0_-1em)] sm:text-mega">
              <motion.div
                variants={{
                  hidden: reduce ? { y: 0 } : { y: "110%" },
                  visible: { y: 0, transition: { duration: 1, ease: EASE_OUT_EXPO } },
                }}
              >
                <StackLink {...link} />
              </motion.div>
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  )
}

type StackLinkProps = {
  label: string
  href: string
  external?: boolean
}

function StackLink({ label, href, external }: StackLinkProps) {
  const className =
    "group/link relative inline-block rounded-field transition-opacity duration-500 ease-out group-hover/stack:opacity-30 group-has-[:focus-visible]/stack:opacity-30 hover:!opacity-100 focus-visible:!opacity-100"
  const content = (
    <>
      {label}
      <span
        aria-hidden
        className="absolute left-full top-1/2 ml-[0.18em] block size-[0.16em] -translate-y-1/2 scale-0 rounded-full bg-current transition-transform duration-500 ease-spring group-hover/link:scale-100 group-focus-visible/link:scale-100 motion-reduce:transition-none"
      />
    </>
  )

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    )
  }

  return (
    <InternalLink href={href} className={className}>
      {content}
    </InternalLink>
  )
}

const LINKS: StackLinkProps[] = [
  { label: "open the studio", href: "/call" },
  { label: "create account", href: "/signup" },
  { label: "github", href: "https://github.com/notHuman9504/ezStream", external: true },
]
