"use client"

import React, { Fragment, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Github, X } from "lucide-react"
import { usePathname } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import { setEmail } from '@/redux/user/userSlice'
import myRouter from '@/lib/route'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LogoMark } from "@/components/brand/Logo"
import { EASE_OUT_EXPO } from "@/components/motion/Reveal"

interface NavItem {
  name: string
  url: string
}

const navItems: NavItem[] = [
  { name: 'home', url: '/' },
  { name: 'studio', url: '/call' },
]

export default function Header() {
  const pathname = usePathname()
  const redirect = myRouter()
  const dispatch = useDispatch()
  const userEmail = useSelector((state: RootState) => state.user.email)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // Lock page scroll and listen for Escape while the sheet is open; hand focus
  // back to the menu button when it closes.
  useEffect(() => {
    if (!menuOpen) {
      if (wasOpen.current) menuButtonRef.current?.focus()
      wasOpen.current = false
      return
    }
    wasOpen.current = true
    const root = document.documentElement
    const previousOverflow = root.style.overflow
    root.style.overflow = 'hidden'
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      root.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const go = (url: string) => {
    setMenuOpen(false)
    redirect(url)
  }

  const logout = () => {
    setMenuOpen(false)
    localStorage.removeItem('token')
    dispatch(setEmail(""))
    redirect('/')
  }

  const menuLinks: MenuLink[] = [
    { label: 'home', url: '/', onSelect: () => go('/') },
    { label: 'studio', url: '/call', onSelect: () => go('/call') },
    ...(userEmail
      ? [{ label: 'log out', onSelect: logout }]
      : [
          { label: 'sign in', url: '/signin', onSelect: () => go('/signin') },
          { label: 'create account', url: '/signup', onSelect: () => go('/signup') },
        ]),
  ]

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
        {/* Keeps the nav legible over content scrolling underneath */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-background via-background/80 to-transparent sm:h-32"
        />
        <div className="shell relative flex h-20 items-center justify-between gap-3 sm:h-24">
          <button
            onClick={() => go('/')}
            className="pointer-events-auto rounded-full transition-transform duration-500 ease-spring hover:-rotate-12 hover:scale-105"
            aria-label="ezstream home"
          >
            <LogoMark className="size-12 sm:size-14" />
          </button>

          <nav
            aria-label="Main"
            className="pointer-events-auto flex items-center gap-3 text-body-lg font-medium sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:gap-4"
          >
            {navItems.map((item, i) => {
              const isActive = pathname === item.url
              return (
                <Fragment key={item.url}>
                  {i > 0 && <span aria-hidden className="size-1.5 rounded-full bg-fg" />}
                  <button
                    onClick={() => go(item.url)}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn("rounded-md transition-colors", isActive ? "text-fg" : "text-fg-50 hover:text-fg")}
                  >
                    {item.name}
                  </button>
                </Fragment>
              )
            })}
          </nav>

          <Button
            ref={menuButtonRef}
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            className="pointer-events-auto"
          >
            menu
          </Button>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <MenuSheet
            links={menuLinks}
            pathname={pathname}
            userEmail={userEmail}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

interface MenuLink {
  label: string
  url?: string
  onSelect: () => void
}

type MenuSheetProps = {
  links: MenuLink[]
  pathname: string
  userEmail: string
  onClose: () => void
}

// Full-screen light sheet with oversized links, inset from the viewport edges.
function MenuSheet({ links, pathname, userEmail, onClose }: MenuSheetProps) {
  const reduce = useReducedMotion()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  return (
    <motion.div
      id="site-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="fixed inset-0 z-[60] p-3 sm:p-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3, delay: 0.15 } }}
    >
      <div aria-hidden className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        className="relative flex h-full flex-col overflow-y-auto rounded-card bg-fg p-5 text-background sm:p-6"
        initial={reduce ? false : { clipPath: 'inset(0% 0% 100% 0% round 20px)' }}
        animate={{ clipPath: 'inset(0% 0% 0% 0% round 20px)' }}
        exit={reduce ? undefined : { clipPath: 'inset(0% 0% 100% 0% round 20px)' }}
        transition={{ duration: 0.75, ease: EASE_OUT_EXPO }}
      >
        <div className="flex justify-end">
          <button
            ref={closeRef}
            onClick={onClose}
            className="group flex items-center gap-3 rounded-full text-btn"
          >
            close
            <span className="grid size-12 place-items-center rounded-full bg-background text-fg transition-transform duration-500 ease-spring group-hover:rotate-90">
              <X aria-hidden className="size-5" />
            </span>
          </button>
        </div>

        <nav className="group/nav my-auto flex flex-col items-start gap-1 py-10 sm:gap-2">
          {links.map((link, i) => (
            // Padding keeps descenders inside the reveal mask
            <span key={link.label} className="-mb-[0.15em] block overflow-hidden pb-[0.15em] text-mega">
              <motion.button
                onClick={link.onSelect}
                aria-current={link.url === pathname ? 'page' : undefined}
                className="flex items-center gap-4 text-left transition-[padding,opacity] duration-500 ease-spring hover:!opacity-100 group-hover/nav:opacity-30 sm:hover:pl-6"
                initial={reduce ? false : { y: '100%' }}
                animate={{ y: 0 }}
                transition={{ duration: 0.9, ease: EASE_OUT_EXPO, delay: 0.12 + i * 0.05 }}
              >
                {link.label}
                {link.url === pathname && <span aria-hidden className="size-3 rounded-full bg-current" />}
              </motion.button>
            </span>
          ))}
        </nav>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <span className="text-body-sm font-medium">{userEmail || 'live studio in your browser'}</span>
          <a
            href="https://github.com/notHuman9504/ezStream"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="ezstream on GitHub"
            className="grid size-12 place-items-center rounded-full bg-background text-fg transition-transform duration-500 ease-spring hover:scale-110"
          >
            <Github aria-hidden className="size-5" />
          </a>
        </div>
      </motion.div>
    </motion.div>
  )
}
