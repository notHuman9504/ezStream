"use client"

import myRouter from "@/lib/route"
import { Button } from "@/components/ui/button"
import { Tag } from "@/components/ui/tag"
import { MaskLines, Reveal } from "@/components/motion/Reveal"
import { FeedArt, type ArtKind } from "./FeedArt"

// Three rounded sheets, each a vivid media block over a title and a short line.
// A centered column, side by side on very wide screens.
export default function HowItWorksSection() {
  const redirect = myRouter()

  return (
    <section id="how-it-works" className="py-24 sm:py-32">
      <div className="shell">
        <div className="flex flex-col items-center gap-5 text-center">
          <Reveal>
            <Tag marker="paren">how it works</Tag>
          </Reveal>
          <MaskLines
            as="h2"
            className="text-h2"
            lines={["three steps,", "one browser tab"]}
          />
        </div>

        <ol className="mx-auto mt-14 grid max-w-[720px] gap-4 sm:mt-20 sm:gap-6 xl:max-w-[1440px] xl:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <Reveal delay={i * 0.08} className="h-full">
                <article className="flex h-full flex-col rounded-card bg-surface p-2 sm:p-3">
                  <FeedArt kind={step.art} className="aspect-[16/10] rounded-tile" />
                  <div className="flex flex-1 flex-col items-start px-3 pb-4 pt-6 sm:px-5 sm:pb-6 sm:pt-8">
                    <Tag marker="paren">{`0${i + 1}`}</Tag>
                    <h3 className="mt-3 text-h3 sm:text-h2">{step.title}</h3>
                    <p className="mt-3 max-w-[44ch] text-body text-fg-64">{step.body}</p>
                    {step.cta && (
                      <div className="mt-auto pt-8">
                        <Button onClick={() => redirect("/call")}>open the studio</Button>
                      </div>
                    )}
                  </div>
                </article>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

const STEPS: { title: string; art: ArtKind; body: string; cta?: boolean }[] = [
  {
    title: "open a room",
    art: "room",
    body: "The studio opens a room the moment it loads. Share the room ID and guests join from their own browser with camera and mic, nothing to install.",
  },
  {
    title: "compose the shot",
    art: "compose",
    body: "Click a tile to put it on the program, switch between grid, spotlight and sidebar, then add a title, lower third or ticker in your accent color.",
  },
  {
    title: "go live",
    art: "golive",
    body: "Paste your platform's RTMP URL and stream key, then press go live. The program goes out at 1280×720 and 30 fps until you end the stream.",
    cta: true,
  },
]
