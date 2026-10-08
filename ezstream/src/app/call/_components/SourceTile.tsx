import type { ReactNode } from 'react';
import { Camera, Plus, ScreenShare, UserPlus, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

type SourceTileProps = {
  label: string;
  isScreen: boolean;
  // 1-based position on the program, or null when the tile isn't selected.
  order: number | null;
  onToggle: () => void;
  // The tile's <video>; it fills the tile.
  children: ReactNode;
};

export function SourceTile({ label, isScreen, order, onToggle, children }: SourceTileProps) {
  const selected = order !== null;
  const Icon = isScreen ? ScreenShare : Video;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      aria-label={selected ? `${label}, position ${order} on the program` : label}
      className={cn(
        'group relative block aspect-video w-full overflow-hidden rounded-tile bg-background text-left',
        'transition-[transform,box-shadow] duration-500 ease-spring hover:-translate-y-1 active:scale-[0.98]',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        'focus-visible:outline-offset-4',
        selected
          ? 'ring-2 ring-fg ring-offset-2 ring-offset-surface'
          : 'ring-1 ring-fg/[0.06] hover:ring-fg/20'
      )}
    >
      {/* Block-level layer so the inline <video> fills the tile without a baseline gap */}
      <span className="absolute inset-0 [&>video]:block">{children}</span>

      <span className="absolute bottom-2.5 left-2.5 inline-flex h-7 max-w-[calc(100%-1.25rem)] items-center gap-1.5 rounded-full bg-background/70 px-2.5 text-small font-medium text-fg backdrop-blur-md">
        <Icon aria-hidden className="size-3.5 shrink-0 text-fg-64" />
        <span className="truncate">{label}</span>
      </span>

      {selected ? (
        <span
          key={order}
          aria-hidden
          className="absolute right-2.5 top-2.5 grid size-8 place-items-center rounded-full bg-fg text-tag tabular-nums text-background duration-300 animate-in fade-in zoom-in-50 motion-reduce:animate-none"
        >
          {order}
        </span>
      ) : (
        <span
          aria-hidden
          className="absolute right-2.5 top-2.5 grid size-8 place-items-center rounded-full bg-background/70 text-fg opacity-0 backdrop-blur-md transition-[opacity,transform] duration-500 ease-spring group-hover:rotate-90 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none motion-reduce:group-hover:rotate-0"
        >
          <Plus className="size-4" />
        </span>
      )}
    </button>
  );
}

// Shown after your own tiles while nobody else is in the room.
export function InviteTile({ room }: { room: string }) {
  return (
    <div className="flex aspect-video flex-col items-center justify-center gap-1 overflow-hidden rounded-tile bg-background/60 p-4 text-center ring-1 ring-inset ring-fg/[0.06]">
      <span className="mb-2 hidden size-10 place-items-center rounded-full bg-muted sm:grid">
        <UserPlus aria-hidden className="size-4 text-fg-64" />
      </span>
      <p className="text-body font-medium text-fg">invite guests</p>
      {room && (
        <p className="max-w-full break-all text-small text-fg-50">
          They join with room <span className="text-fg">{room}</span>
        </p>
      )}
    </div>
  );
}

// No tiles yet: local media is still loading, or camera access was refused.
export function SourcesPlaceholder() {
  return (
    <div className="col-span-full flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-tile bg-background/60 px-6 py-10 text-center ring-1 ring-inset ring-fg/[0.06]">
      <span className="mb-2 grid size-12 place-items-center rounded-full bg-muted">
        <Camera aria-hidden className="size-5 text-fg-64" />
      </span>
      <p className="text-title">waiting for your camera</p>
      <p className="max-w-sm text-body-sm text-fg-50">
        Allow camera and microphone access to add yourself. Guests show up here as they join the room.
      </p>
    </div>
  );
}
