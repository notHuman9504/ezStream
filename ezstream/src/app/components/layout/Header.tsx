"use client"

import React, { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { usePathname } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@/redux/store'
import { setEmail } from '@/redux/user/userSlice'
import myRouter from '@/lib/route'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/brand/Logo"
import { EASE_OUT_EXPO } from "@/components/motion/Reveal"

interface NavItem {
  name: string
  url: string
}

const navItems: NavItem[] = [
  { name: 'Home', url: '/' },
  { name: 'Studio', url: '/call' },
]

export default function Header() {
  const pathname = usePathname()
  const redirect = myRouter()
  const dispatch = useDispatch()
  const userEmail = useSelector((state: RootState) => state.user.email)
  const [menuOpen, setMenuOpen] = useState(false)
  const progress = useScrollProgress()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
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

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div className="shell relative flex h-[72px] items-center justify-between gap-3">
        <button
          onClick={() => go('/')}
          className="pointer-events-auto rounded-md"
          aria-label="ezStream home"
        >
          <Logo wordmarkClassName="hidden sm:inline" />
        </button>

        {/* Center pill: menu + scroll progress */}
        <div ref={menuRef} className="pointer-events-auto absolute left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-1 rounded-full bg-elevated/90 p-1 shadow-[0_8px_30px_rgb(0_0_0/0.35)] backdrop-blur-md">
            <button
              onClick={() => setMenuOpen(open => !open)}
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              className="flex h-8 items-center gap-2.5 rounded-full pl-3 pr-3 text-btn text-fg transition-colors hover:bg-fg/[0.06]"
            >
              <MenuIcon open={menuOpen} />
              {menuOpen ? 'Close' : 'Menu'}
            </button>
            <span
              className="hidden h-8 min-w-[3.25rem] items-center justify-center rounded-full bg-fg/20 px-2.5 text-small tabular-nums text-fg sm:flex"
              aria-label={`Scrolled ${progress}%`}
            >
              {progress}%
            </span>
          </div>

          <AnimatePresence>
            {menuOpen && (
              <div className="absolute left-1/2 top-full w-[min(calc(100vw-2rem),380px)] -translate-x-1/2 pt-2">
                <motion.div
                  id="site-menu"
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.18 } }}
                  transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
                  className="origin-top rounded-tile border border-fg/[0.06] bg-elevated/95 p-2 shadow-[0_24px_60px_rgb(0_0_0/0.5)] backdrop-blur-xl"
                >
                  <nav className="flex flex-col">
                    {navItems.map((item, i) => {
                      const isActive = pathname === item.url
                      return (
                        <button
                          key={item.url}
                          onClick={() => go(item.url)}
                          aria-current={isActive ? 'page' : undefined}
                          className={cn(
                            "group flex items-baseline justify-between rounded-field px-4 py-3 text-left transition-colors hover:bg-fg/[0.06]",
                            isActive ? "text-fg" : "text-fg-64 hover:text-fg"
                          )}
                        >
                          <span className="text-h4">{item.name}</span>
                          <span className="text-small tabular-nums text-fg-30">0{i + 1}</span>
                        </button>
                      )
                    })}
                  </nav>

                  <div className="mt-2 flex items-center justify-between gap-3 border-t border-line px-4 pb-2 pt-3">
                    {userEmail ? (
                      <>
                        <span className="truncate text-small text-fg-50" title={userEmail}>
                          {userEmail}
                        </span>
                        <Button size="sm" variant="secondary" onClick={logout}>
                          Log out
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="text-small text-fg-50">Not signed in</span>
                        <Button size="sm" variant="secondary" onClick={() => go('/signin')}>
                          Sign in
                        </Button>
                      </>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Account actions */}
        <div className="pointer-events-auto flex items-center gap-2">
          {userEmail ? (
            <>
              <span
                className="hidden size-8 items-center justify-center rounded-full bg-fg/10 text-small uppercase text-fg sm:flex"
                title={userEmail}
                aria-label={`Signed in as ${userEmail}`}
              >
                {userEmail.charAt(0)}
              </span>
              {pathname === '/call' ? (
                <Button size="sm" variant="secondary" onClick={logout}>
                  Log out
                </Button>
              ) : (
                <Button size="sm" onClick={() => go('/call')}>
                  Open studio
                </Button>
              )}
            </>
          ) : (
            <>
              {pathname !== '/signin' && (
                <Button size="sm" variant="ghost" className="hidden sm:inline-flex" onClick={() => go('/signin')}>
                  Sign in
                </Button>
              )}
              <Button size="sm" onClick={() => go('/signup')}>
                Get started
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <span aria-hidden className="relative block h-2.5 w-4">
      <span
        className={cn(
          "absolute left-0 top-0 h-px w-4 bg-fg transition-transform duration-300 ease-out",
          open && "translate-y-[4.5px] rotate-45"
        )}
      />
      <span
        className={cn(
          "absolute bottom-0 left-0 h-px w-4 bg-fg transition-transform duration-300 ease-out",
          open && "-translate-y-[4.5px] -rotate-45"
        )}
      />
    </span>
  )
}

function useScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      const next = max > 0 ? Math.round((window.scrollY / max) * 100) : 0
      setProgress(Math.min(100, Math.max(0, next)))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    // Page height changes on navigation and as content loads.
    const observer = new ResizeObserver(onScroll)
    observer.observe(document.body)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      observer.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return progress
}
