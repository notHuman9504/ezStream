import { cn } from "@/lib/utils"

export type ArtKind =
  | "camera"
  | "screen"
  | "banner"
  | "lowerThird"
  | "ticker"
  | "grid"
  | "spotlight"
  | "audio"
  | "rtmp"
  | "live"
  | "room"
  | "html"
  | "compose"
  | "golive"

type FeedArtProps = {
  kind: ArtKind
  className?: string
}

// Vivid, glossy stand-ins for studio feeds. Everything inside is sized in em off
// the card's own width (1em = 4% of it), so one drawing works from a small spiral
// card up to a full step sheet. Purely decorative.
export function FeedArt({ kind, className }: FeedArtProps) {
  const { background, Art } = ARTS[kind]

  return (
    <div
      aria-hidden
      className={cn("relative overflow-hidden [container-type:inline-size]", className)}
      style={{ background }}
    >
      <div className="absolute inset-0 select-none text-[length:4cqw] leading-none tracking-[-0.03em]">
        <Art />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,rgb(255_255_255/0.22),transparent_38%)]" />
    </div>
  )
}

export function artBackground(kind: ArtKind) {
  return ARTS[kind].background
}

function CameraArt() {
  return (
    <>
      <Person tone={TONES.peach} className="bottom-0 left-1/2 w-[58%] -translate-x-1/2" />
      <Chip className="left-[6%] top-[8%]">maya</Chip>
      <span className="absolute right-[6%] top-[8%] block size-[1.7em] rounded-full" style={{ background: gloss("#ff2d55") }} />
    </>
  )
}

function ScreenArt() {
  return (
    <>
      <span className="absolute inset-x-[14%] bottom-[18%] top-[14%] block rounded-[0.9em] bg-white p-[1.1em] shadow-[0_0.8em_2em_rgb(0_0_60/0.3)]">
        <span className="flex gap-[0.4em]">
          {["#ff6b5e", "#ffc23d", "#3ddc84"].map(color => (
            <span key={color} className="block size-[0.65em] rounded-full" style={{ background: color }} />
          ))}
        </span>
        <span className="mt-[1.1em] block h-[1.2em] w-[52%] rounded-full bg-[#2a5bff]" />
        <span className="mt-[0.8em] block h-[0.6em] w-[78%] rounded-full bg-black/10" />
        <span className="mt-[0.5em] block h-[0.6em] w-[62%] rounded-full bg-black/10" />
        <span className="absolute bottom-[1.1em] right-[1.1em] flex h-[34%] items-end gap-[0.4em]">
          {[45, 70, 55, 100].map((height, i) => (
            <span
              key={i}
              className="block w-[1em] rounded-[0.25em]"
              style={{ height: `${height}%`, background: i === 3 ? "#ff4fa3" : "#a9b8ff" }}
            />
          ))}
        </span>
      </span>
      <Cursor className="left-[62%] top-[58%] w-[3em]" />
    </>
  )
}

function BannerArt() {
  return (
    <>
      <span className="absolute left-1/2 top-[10%] flex -translate-x-1/2 items-center gap-[0.5em] whitespace-nowrap rounded-[0.6em] bg-white px-[1em] py-[0.7em] text-[1.45em] font-medium text-[#1d0b4a] shadow-[0_0.5em_1.2em_rgb(30_0_80/0.3)]">
        <span className="block size-[0.55em] rounded-[0.15em] bg-[#ff4fa3]" />
        the friday show
      </span>
      <Person tone={TONES.rose} className="bottom-0 left-[8%] w-[40%]" />
      <Person tone={TONES.butter} className="bottom-0 right-[8%] w-[40%]" />
    </>
  )
}

function LowerThirdArt() {
  return (
    <>
      <Person tone={TONES.sky} className="bottom-0 right-[6%] w-[52%]" />
      <span className="absolute bottom-[14%] left-[7%] block">
        <span className="flex">
          <span className="block w-[0.45em] bg-[#ff3d6e]" />
          <span className="block bg-white px-[0.8em] py-[0.55em] text-[1.55em] font-medium text-[#0a0a0a]">maya chen</span>
        </span>
        <span className="ml-[0.45em] inline-block bg-[#0a0a0a]/80 px-[0.8em] py-[0.5em] text-[1.1em] text-white">host</span>
      </span>
    </>
  )
}

function TickerArt() {
  return (
    <>
      <span className="absolute right-[9%] top-[10%] block aspect-square w-[24%] rounded-full" style={{ background: gloss("#ff5a1f") }} />
      <Person tone={TONES.lilac} className="bottom-[20%] left-[14%] w-[44%]" />
      <span className="absolute inset-x-0 bottom-0 flex h-[20%] items-center gap-[0.8em] overflow-hidden whitespace-nowrap bg-[#0a0a0a] px-[0.9em] text-[1.3em] font-medium text-white">
        <span className="block size-[0.5em] shrink-0 rounded-full bg-[#ffd400]" />
        doors open at 7
        <span className="block size-[0.3em] shrink-0 rounded-full bg-white/50" />
        questions in chat
        <span className="block size-[0.3em] shrink-0 rounded-full bg-white/50" />
        new episode friday
      </span>
    </>
  )
}

function GridArt() {
  return (
    <span className="absolute inset-[9%] grid grid-cols-2 grid-rows-2 gap-[0.55em]">
      {GRID_TILES.map(tile => (
        <Tile key={tile.bg} bg={tile.bg} tone={tile.tone} />
      ))}
    </span>
  )
}

function SpotlightArt() {
  return (
    <>
      <Tile bg="#2a1f6e" tone={TONES.rose} className="absolute inset-x-[9%] top-[8%] h-[60%]" />
      <span className="absolute inset-x-[9%] bottom-[8%] flex h-[20%] justify-center gap-[0.5em]">
        {SPOTLIGHT_THUMBS.map(tile => (
          <Tile key={tile.bg} bg={tile.bg} tone={tile.tone} className="aspect-video h-full shrink-0 rounded-[0.5em]" />
        ))}
      </span>
    </>
  )
}

function AudioArt() {
  return (
    <>
      <span className="absolute inset-x-[16%] bottom-[20%] top-[14%] flex items-end justify-between">
        {[42, 68, 54, 92, 72, 38, 58].map((height, i) => (
          <span
            key={i}
            className="block w-[9%] rounded-full shadow-[inset_0_-0.3em_0.5em_rgb(0_0_0/0.12)]"
            style={{
              height: `${height}%`,
              background: i === 3 ? gloss("#1a1a1a", "40% 12%") : "linear-gradient(180deg, #ffffff, #ffd9c9)",
            }}
          />
        ))}
      </span>
      <span className="absolute inset-x-[12%] bottom-[13%] block h-[0.3em] rounded-full bg-white/50" />
    </>
  )
}

function RtmpArt() {
  return (
    <>
      {[80, 58, 36].map(size => (
        <span
          key={size}
          className="absolute left-[28%] top-1/2 block aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-[0.25em] border-white/30"
          style={{ width: `${size}%` }}
        />
      ))}
      <span
        className="absolute left-[28%] top-1/2 block aspect-square w-[14%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "radial-gradient(circle at 35% 30%, #ffffff, #dfe6ff 55%, #aab6ff)" }}
      />
      <span className="absolute right-[7%] top-1/2 flex -translate-y-1/2 items-center gap-[0.35em] rounded-full bg-white px-[0.9em] py-[0.6em] text-[1.45em] font-medium text-[#2f1bd6]">
        rtmp://
        <Arrow className="size-[1em]" />
      </span>
    </>
  )
}

function LiveArt() {
  return (
    <>
      <span className="absolute left-1/2 top-[44%] flex -translate-x-1/2 -translate-y-1/2 items-center gap-[0.45em] whitespace-nowrap rounded-full bg-white px-[0.9em] py-[0.6em] text-[2.2em] font-medium text-[#0a0a0a] shadow-[0_0.3em_0.8em_rgb(90_0_0/0.3)]">
        <span className="block size-[0.42em] rounded-full bg-[#ff2d2d]" />
        live
        <span className="text-[0.55em] tabular-nums text-black/50">00:42:18</span>
      </span>
      <span className="absolute left-1/2 top-[70%] -translate-x-1/2 whitespace-nowrap rounded-full bg-black/25 px-[0.8em] py-[0.5em] text-[1.1em] font-medium text-white">
        1280×720 · 30 fps
      </span>
    </>
  )
}

function RoomArt() {
  return (
    <>
      <span className="absolute left-1/2 top-[18%] flex -translate-x-1/2">
        {AVATARS.map((color, i) => (
          <span
            key={color}
            className={cn(
              "relative block size-[3.8em] overflow-hidden rounded-full border-[0.25em] border-[#4dffd0]",
              i > 0 && "-ml-[1em]"
            )}
            style={{ background: color }}
          >
            <Person tone={TONES.cream} className="-bottom-[8%] left-1/2 w-[86%] -translate-x-1/2" />
          </span>
        ))}
      </span>
      <span className="absolute left-1/2 top-[56%] flex -translate-x-1/2 items-center gap-[0.5em] whitespace-nowrap rounded-full bg-white py-[0.6em] pl-[1em] pr-[0.75em] text-[1.6em] font-medium text-[#0a0a0a] shadow-[0_0.3em_0.8em_rgb(0_60_50/0.25)]">
        <span className="text-black/45">room</span>
        k3x9qa
        <CopyGlyph className="size-[0.95em] text-black/45" />
      </span>
    </>
  )
}

function HtmlArt() {
  return (
    <>
      <span className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[6.5em] font-medium tracking-[-0.06em] text-white [text-shadow:0_0.06em_0.14em_rgb(60_0_90/0.45)]">
        &lt;/&gt;
      </span>
      <Chip className="bottom-[9%] left-[7%]">html in canvas</Chip>
    </>
  )
}

function ComposeArt() {
  return (
    <>
      <span className="absolute left-[7%] top-[10%] block aspect-video w-[58%] rounded-[0.8em] bg-[#0a0a0a] p-[0.45em] shadow-[0_0.6em_1.6em_rgb(120_40_0/0.35)]">
        <span className="grid h-full grid-cols-2 gap-[0.4em]">
          <Tile bg="#ff4fa3" tone={TONES.peach} className="rounded-[0.5em]" />
          <Tile bg="#2a5bff" tone={TONES.butter} className="rounded-[0.5em]" />
        </span>
      </span>
      <span className="absolute right-[7%] top-[10%] flex w-[25%] flex-col gap-[0.6em]">
        <Tile bg="#7b3bff" tone={TONES.sky} className="aspect-video rounded-[0.5em] ring-[0.25em] ring-white" />
        <Tile bg="#1f9e5a" tone={TONES.rose} className="aspect-video rounded-[0.5em]" />
      </span>
      <Cursor className="right-[10%] top-[24%] w-[3em]" />
      <span className="absolute bottom-[9%] left-[7%] flex gap-[0.45em] text-[1.15em] font-medium">
        <span className="rounded-full bg-white px-[0.8em] py-[0.5em] text-[#0a0a0a]">grid</span>
        <span className="rounded-full bg-black/20 px-[0.8em] py-[0.5em] text-white">spotlight</span>
        <span className="rounded-full bg-black/20 px-[0.8em] py-[0.5em] text-white">sidebar</span>
      </span>
    </>
  )
}

function GoLiveArt() {
  return (
    <>
      <span className="absolute left-[6%] top-[7%] flex items-center gap-[0.4em] rounded-full bg-[#ff2d2d] px-[0.75em] py-[0.5em] text-[1.15em] font-medium text-white">
        <span className="block size-[0.45em] rounded-full bg-white" />
        live
      </span>
      <span className="absolute left-1/2 top-[57%] flex w-[70%] -translate-x-1/2 -translate-y-1/2 flex-col gap-[0.55em] rounded-[1em] bg-white p-[0.9em] text-[#0a0a0a] shadow-[0_0.6em_1.8em_rgb(0_30_120/0.35)]">
        <Field>rtmp://example.com/live</Field>
        <Field>
          <span className="text-black/45">key</span> ••••••••••••
        </Field>
        <span className="mt-[0.35em] flex items-center justify-between gap-[0.5em]">
          <span className="flex items-center gap-[0.45em] rounded-full bg-[#0a0a0a] px-[0.9em] py-[0.6em] text-[1.2em] font-medium text-white">
            go live
            <span className="block size-[0.3em] rounded-full bg-white" />
          </span>
          <span className="whitespace-nowrap text-[1.05em] font-medium tabular-nums text-black/50">1280×720</span>
        </span>
      </span>
    </>
  )
}

// A glossy head-and-shoulders blob. Width is set by the caller; it stays square.
function Person({ tone, className }: { tone: string; className?: string }) {
  return (
    <span className={cn("absolute block aspect-square", className)}>
      <span
        className="absolute left-1/2 top-[6%] block aspect-square w-[42%] -translate-x-1/2 rounded-full"
        style={{ background: gloss(tone) }}
      />
      <span
        className="absolute inset-x-[4%] bottom-0 block h-[44%] [border-radius:50%_50%_0_0/85%_85%_0_0]"
        style={{ background: gloss(tone, "38% 18%") }}
      />
    </span>
  )
}

function Chip({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("absolute whitespace-nowrap rounded-full bg-black/35 px-[0.75em] py-[0.5em] text-[1.2em] font-medium text-white", className)}>
      {children}
    </span>
  )
}

function Cursor({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("absolute", className)}>
      <path d="M5 3l14 7.5-6.2 1.6L9.6 18z" fill="#0a0a0a" stroke="#ffffff" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

function Tile({ bg, tone, className }: { bg: string; tone: string; className?: string }) {
  return (
    <span className={cn("relative block overflow-hidden rounded-[0.7em]", className)} style={{ background: bg }}>
      <Person tone={tone} className="bottom-0 left-1/2 w-[56%] -translate-x-1/2" />
    </span>
  )
}

function Arrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

function CopyGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" className={className}>
      <rect x="8" y="8" width="12" height="12" rx="3" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  )
}

function Field({ children }: { children: React.ReactNode }) {
  return (
    <span className="block overflow-hidden text-ellipsis whitespace-nowrap rounded-[0.55em] bg-black/[0.06] px-[0.8em] py-[0.65em] text-[1.05em]">
      {children}
    </span>
  )
}

// Highlight top-left, soft shade bottom-right: reads as a small glossy object.
function gloss(color: string, at = "32% 26%") {
  return `radial-gradient(circle at ${at}, rgb(255 255 255 / 0.7), rgb(255 255 255 / 0) 42%), radial-gradient(circle at 70% 90%, rgb(0 0 0 / 0.2), rgb(0 0 0 / 0) 55%), ${color}`
}

const TONES = {
  peach: "#ffc49b",
  lilac: "#d6c4ff",
  sky: "#a8dcff",
  butter: "#ffe58a",
  rose: "#ffa8cf",
  cream: "#fff1e6",
}

const GRID_TILES = [
  { bg: "#ff4fa3", tone: TONES.peach },
  { bg: "#2a5bff", tone: TONES.butter },
  { bg: "#ff7a1a", tone: TONES.lilac },
  { bg: "#7b3bff", tone: TONES.sky },
]

const SPOTLIGHT_THUMBS = [
  { bg: "#ff7a1a", tone: TONES.butter },
  { bg: "#2a5bff", tone: TONES.peach },
  { bg: "#1f9e5a", tone: TONES.lilac },
]

const AVATARS = ["#ff4fa3", "#2a5bff", "#ff7a1a"]

const ARTS: Record<ArtKind, { background: string; Art: () => JSX.Element }> = {
  camera: { Art: CameraArt, background: "radial-gradient(120% 100% at 20% 0%, #ffb36b 0%, #ff5e7e 55%, #c2187a 100%)" },
  screen: { Art: ScreenArt, background: "radial-gradient(120% 100% at 80% 0%, #7fd3ff 0%, #2a5bff 55%, #1a1fb8 100%)" },
  banner: { Art: BannerArt, background: "radial-gradient(120% 100% at 10% 0%, #c89bff 0%, #7b3bff 50%, #3a12a8 100%)" },
  lowerThird: { Art: LowerThirdArt, background: "radial-gradient(120% 100% at 80% 0%, #9dffd9 0%, #19c9a0 50%, #0a6e63 100%)" },
  ticker: { Art: TickerArt, background: "radial-gradient(120% 100% at 20% 0%, #fff07a 0%, #ffbf1f 50%, #ff7a1a 100%)" },
  grid: { Art: GridArt, background: "radial-gradient(120% 100% at 80% 0%, #e2ff7a 0%, #7be04a 50%, #1f9e5a 100%)" },
  spotlight: { Art: SpotlightArt, background: "radial-gradient(120% 100% at 20% 0%, #ffc2e2 0%, #ff4fa3 50%, #b0156a 100%)" },
  audio: { Art: AudioArt, background: "radial-gradient(120% 100% at 80% 0%, #ffb199 0%, #ff5a3c 50%, #c4231a 100%)" },
  rtmp: { Art: RtmpArt, background: "radial-gradient(120% 100% at 20% 0%, #8f9bff 0%, #3b3bff 50%, #6a1bd6 100%)" },
  live: { Art: LiveArt, background: "radial-gradient(120% 100% at 80% 0%, #ff9a8a 0%, #ff3b3b 55%, #a8101e 100%)" },
  room: { Art: RoomArt, background: "radial-gradient(120% 100% at 20% 0%, #c6fff0 0%, #21ffc0 45%, #00a3a3 100%)" },
  html: { Art: HtmlArt, background: "radial-gradient(120% 100% at 80% 0%, #ff8ad8 0%, #b21bd6 50%, #3d0b6e 100%)" },
  compose: { Art: ComposeArt, background: "radial-gradient(120% 100% at 20% 0%, #ffd9a8 0%, #ff9a3c 50%, #e8530e 100%)" },
  golive: { Art: GoLiveArt, background: "radial-gradient(120% 100% at 80% 0%, #a8fff0 0%, #21c8ff 50%, #2a5bff 100%)" },
}
