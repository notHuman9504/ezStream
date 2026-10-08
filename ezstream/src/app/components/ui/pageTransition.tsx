'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { setLoading } from '@/redux/loading/loadingSlice';
import { RootState } from '@/redux/store';
import { LogoMark } from '@/components/brand/Logo';
import { cn } from '@/lib/utils';
import { BREATHE, COVER_BG, PRELOADER_ID, PreloaderGate } from './loading';

type Phase = 'idle' | 'cover' | 'exit';

/**
 * A fade between pages. myRouter() dispatches setLoading('cover') and pushes
 * shortly after; the overlay fades in with the sphere springing up in the middle,
 * holds until the new pathname has rendered, then fades out. On first load it
 * starts covered under the preloader, showing the same gate.
 */
const PageTransition = () => {
  const dispatch = useDispatch();
  const trigger = useSelector((state: RootState) => state.loading.loading);
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>('cover');
  // The pathname this cover started on (null on first load) and when it started.
  const [run, setRun] = useState<{ from: string | null; at: number }>(() => ({ from: null, at: Date.now() }));

  useEffect(() => {
    if (trigger === 'initial') return;
    dispatch(setLoading('initial'));
    setRun({ from: pathname, at: Date.now() });
    setPhase('cover');
  }, [trigger, pathname, dispatch]);

  useEffect(() => {
    if (phase !== 'cover') return;

    if (run.from !== null && pathname === run.from) {
      // Still on the old route: wait for the push, but never hold the screen forever.
      const timer = setTimeout(() => setPhase('exit'), msUntil(run.at + MAX_COVER_MS));
      return () => clearTimeout(timer);
    }

    let timer = setTimeout(function check() {
      if (document.getElementById(PRELOADER_ID) && Date.now() < run.at + MAX_COVER_MS) {
        timer = setTimeout(check, POLL_MS);
        return;
      }
      setPhase('exit');
    }, msUntil(run.at + FADE_IN_MS));
    return () => clearTimeout(timer);
  }, [phase, run, pathname]);

  useEffect(() => {
    if (phase !== 'exit') return;
    const timer = setTimeout(() => setPhase('idle'), FADE_OUT_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  const firstLoad = run.from === null;
  // Always mounted so it has a resting state to transition from.
  const markPhase: Phase = firstLoad ? 'idle' : phase;

  return (
    <div aria-hidden className={cn('fixed inset-0 z-[100] transition-opacity ease-out', COVER_BG, PHASE_CLASS[phase])}>
      {firstLoad && <PreloaderGate className={cn('transition-[opacity,transform] ease-out', GATE_CLASS[phase])} />}
      <div className="absolute inset-0 grid place-items-center">
        <span className={cn('block transition-[opacity,transform]', MARK_CLASS[markPhase])}>
          <LogoMark className={cn('size-16', markPhase !== 'idle' && BREATHE)} />
        </span>
      </div>
    </div>
  );
};

// Keep in step with the duration classes below and the push delay in lib/route.ts.
const FADE_IN_MS = 250;
const FADE_OUT_MS = 400;
const MAX_COVER_MS = 6000;
const POLL_MS = 50;

const PHASE_CLASS: Record<Phase, string> = {
  idle: 'pointer-events-none invisible opacity-0 duration-0',
  cover: 'opacity-100 [transition-duration:250ms]',
  exit: 'pointer-events-none opacity-0 [transition-duration:400ms]',
};

// The first-load gate leans in slightly as it goes, like stepping through it.
const GATE_CLASS: Record<Phase, string> = {
  idle: 'opacity-0',
  cover: '',
  exit: 'opacity-0 motion-safe:scale-[1.04] [transition-duration:300ms]',
};

// Parked small and clear while idle, springs up while covered, and leaves a
// little ahead of the overlay so it never ghosts over the new page.
const MARK_CLASS: Record<Phase, string> = {
  idle: 'opacity-0 motion-safe:scale-[0.8] duration-0',
  cover: 'opacity-100 scale-100 ease-spring [transition-delay:50ms] [transition-duration:600ms]',
  exit: 'opacity-0 scale-100 ease-out [transition-duration:200ms]',
};

function msUntil(time: number) {
  return Math.max(0, time - Date.now());
}

export default PageTransition;
