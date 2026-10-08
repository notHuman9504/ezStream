import { cn } from "@/lib/utils"

// Pixel "play" glyph built from square blocks, with an orange on-air pixel.
const PLAY_BLOCKS: [number, number][] = [
  [0, 0], [0, 1], [0, 2], [0, 3], [0, 4],
  [1, 1], [1, 2], [1, 3],
  [2, 2],
]

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 5 5" className={cn("size-7", className)} aria-hidden>
      {PLAY_BLOCKS.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x + 0.5} y={y} width="0.86" height="0.86" rx="0.12" fill="currentColor" />
      ))}
      <rect x="4.14" y="0" width="0.86" height="0.86" rx="0.43" fill="#FD7B03" />
    </svg>
  )
}

type LogoProps = {
  className?: string
  markClassName?: string
  wordmarkClassName?: string
}

export function Logo({ className, markClassName, wordmarkClassName }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-fg", className)}>
      <LogoMark className={markClassName} />
      <span className={cn("text-[1.0625rem] font-medium leading-none tracking-[-0.03em]", wordmarkClassName)}>
        ezStream
      </span>
    </span>
  )
}
