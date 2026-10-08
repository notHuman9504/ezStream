"use client"
import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { StreamStatus } from '@/app/components/layout/videoCanvas';
import { cn } from '@/lib/utils';

export type StreamPhase = 'offline' | 'connecting' | 'live' | 'error';

// While streaming, the relay's state decides. After a failure the canvas reports
// 'idle' again, but the error message is kept until the next start.
export function getStreamPhase(
  isStreaming: boolean,
  state: StreamStatus['state'],
  error: string
): StreamPhase {
  if (isStreaming) return state === 'live' ? 'live' : 'connecting';
  return error ? 'error' : 'offline';
}

const chipTone: Record<StreamPhase, { label: string; chip: string; dot: string }> = {
  offline: { label: 'offline', chip: 'bg-surface text-fg-50', dot: 'bg-fg-30' },
  connecting: { label: 'connecting…', chip: 'bg-surface text-fg-64', dot: 'bg-fg-64 animate-live-pulse' },
  live: { label: 'live', chip: 'bg-brand/10 text-brand ring-1 ring-inset ring-brand/25', dot: 'bg-brand animate-live-pulse' },
  error: { label: 'stream error', chip: 'bg-danger/10 text-danger', dot: 'bg-danger' },
};

export function StreamStateChip({ phase, error }: { phase: StreamPhase; error: string }) {
  const tone = chipTone[phase];
  const seconds = useLiveSeconds(phase === 'live');

  return (
    <span
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-tag transition-colors duration-500',
        tone.chip
      )}
      title={phase === 'error' ? error : undefined}
    >
      <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full motion-reduce:animate-none', tone.dot)} />
      {tone.label}
      {phase === 'live' && <span className="tabular-nums">{formatDuration(seconds)}</span>}
    </span>
  );
}

function useLiveSeconds(live: boolean) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!live) return;
    const startedAt = Date.now();
    setSeconds(0);
    const id = window.setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [live]);

  return seconds;
}

// Broadcast-style timecode, always hh:mm:ss so the chip keeps its width.
function formatDuration(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

type StreamStatusLineProps = {
  id?: string;
  phase: StreamPhase;
  error: string;
  sourceCount: number;
};

// The line under the go-live button. It is a live region, so its text only
// changes when the stream state (or readiness) actually changes.
export function StreamStatusLine({ id, phase, error, sourceCount }: StreamStatusLineProps) {
  return (
    <p
      id={id}
      aria-live="polite"
      className={cn(
        'mt-3 flex min-h-5 items-start justify-center gap-2 text-center text-body-sm',
        phase === 'error' ? 'text-danger' : phase === 'offline' ? 'text-fg-50' : 'text-fg-64'
      )}
    >
      {phase === 'live' && (
        <>
          <span aria-hidden className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-brand animate-live-pulse motion-reduce:animate-none" />
          Live. The program is on air.
        </>
      )}
      {phase === 'connecting' && (
        <>
          <Loader2 aria-hidden className="mt-[0.2rem] size-3.5 shrink-0 animate-spin motion-reduce:animate-none" />
          Connecting to the streaming server…
        </>
      )}
      {phase === 'error' && (
        <>
          <AlertTriangle aria-hidden className="mt-[0.2rem] size-3.5 shrink-0" />
          <span className="min-w-0 break-words text-left">{error}</span>
        </>
      )}
      {phase === 'offline' &&
        (sourceCount === 0
          ? 'Select at least one source below.'
          : 'Ready. Sends the program at 1280×720, 30 fps.')}
    </p>
  );
}
