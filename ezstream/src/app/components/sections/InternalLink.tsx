"use client"

import type { AnchorHTMLAttributes, MouseEvent } from "react"
import myRouter from "@/lib/route"

type InternalLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }

// A real link (so it can be opened in a new tab) that goes through the site's
// fade transition on a plain click.
export default function InternalLink({ href, onClick, ...props }: InternalLinkProps) {
  const redirect = myRouter()

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    redirect(href)
  }

  return <a {...props} href={href} onClick={handleClick} />
}
