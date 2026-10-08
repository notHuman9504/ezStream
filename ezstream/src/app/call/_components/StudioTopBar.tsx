"use client"
import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tag } from '@/components/ui/tag';
import { cn } from '@/lib/utils';
import { StreamStateChip, type StreamPhase } from './streamStatus';

type StudioTopBarProps = {
  // Room shown in the headline (the joined room, or what is typed before joining).
  room: string;
  // Room actually joined; copying is only offered once there is one.
  joinedRoom: string;
  peopleInCall: number;
  phase: StreamPhase;
  error: string;
};

export function StudioTopBar({ room, joinedRoom, peopleInCall, phase, error }: StudioTopBarProps) {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-10">
      <div className="min-w-0">
        <Tag>studio</Tag>
        <div className="mt-4 flex min-w-0 items-center gap-3 sm:gap-4">
          {/* Room IDs are case-sensitive, so only the "room" prefix is lowercase copy. */}
          <h1 className="min-w-0 truncate pb-[0.08em] text-h2 leading-[1.15]" title={room ? `room ${room}` : undefined}>
            <span className="text-fg-50">room </span>
            {room || (
              <>
                <span
                  aria-hidden
                  className="inline-block h-[0.7em] w-[5ch] rounded-full bg-fg/10 align-baseline motion-safe:animate-pulse"
                />
                <span className="sr-only">joining…</span>
              </>
            )}
          </h1>
          <CopyRoomButton roomId={joinedRoom} />
        </div>
        <p className="mt-3 text-body-sm text-fg-50">Guests join by entering this ID in their own studio.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-9 items-center gap-2 rounded-full bg-surface px-3.5 text-tag text-fg-64">
          <Users aria-hidden className="size-4 shrink-0" />
          <span>
            <span className="tabular-nums text-fg">{peopleInCall}</span> in call
          </span>
        </span>
        <StreamStateChip phase={phase} error={error} />
      </div>
    </div>
  );
}

function CopyRoomButton({ roomId }: { roomId: string }) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const copy = async () => {
    // Unavailable outside secure contexts
    if (!roomId || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(roomId);
    } catch {
      return;
    }
    setCopied(true);
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 1600);
  };

  return (
    <span className="flex shrink-0 items-center gap-2.5">
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="size-10 transition-[background-color,transform] ease-spring hover:scale-105 sm:size-12"
        onClick={copy}
        disabled={!roomId}
        aria-label="Copy room ID"
        title="Copy room ID"
      >
        {copied ? <Check className="text-brand" /> : <Copy />}
      </Button>
      <span
        aria-live="polite"
        className={cn(
          'text-tag text-fg-50 transition-opacity duration-300',
          copied ? 'opacity-100' : 'opacity-0'
        )}
      >
        {copied ? 'copied' : ''}
      </span>
    </span>
  );
}
