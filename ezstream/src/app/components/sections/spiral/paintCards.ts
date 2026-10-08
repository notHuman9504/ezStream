// Canvas versions of the FeedArt drawings, used as WebGL textures on the spiral.
// Every size is in "em" = 4% of the card width, matching FeedArt.

export type CardKind =
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

export const CARD_WIDTH = 768
export const CARD_HEIGHT = 576

export function paintCard(kind: CardKind, fontFamily: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext("2d")!
  const p = new Painter(ctx, fontFamily)

  const { background, draw } = CARDS[kind]
  p.background(background)
  draw(p)
  p.sheen()
  return canvas
}

type Background = { at: [number, number]; stops: [string, string, string]; mid?: number }

class Painter {
  readonly w = CARD_WIDTH
  readonly h = CARD_HEIGHT
  readonly em = CARD_WIDTH * 0.04

  constructor(readonly ctx: CanvasRenderingContext2D, readonly family: string) {}

  x(percent: number) {
    return (this.w * percent) / 100
  }

  y(percent: number) {
    return (this.h * percent) / 100
  }

  background({ at, stops, mid = 0.5 }: Background) {
    const { ctx, w, h } = this
    const gradient = ctx.createRadialGradient(this.x(at[0]), this.y(at[1]), 0, this.x(at[0]), this.y(at[1]), w * 1.15)
    gradient.addColorStop(0, stops[0])
    gradient.addColorStop(mid, stops[1])
    gradient.addColorStop(1, stops[2])
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)
  }

  // Soft white light from the top-left, like FeedArt's overlay.
  sheen() {
    const { ctx, w, h } = this
    const gradient = ctx.createLinearGradient(0, 0, w * 0.35, h)
    gradient.addColorStop(0, "rgba(255,255,255,0.22)")
    gradient.addColorStop(0.38, "rgba(255,255,255,0)")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)
  }

  font(sizeEm: number, weight = 500) {
    this.ctx.font = `${weight} ${sizeEm * this.em}px ${this.family}`
  }

  // A glossy disc: base color, highlight top-left, shade bottom-right.
  gloss(cx: number, cy: number, r: number, color: string) {
    const { ctx } = this
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.clip()
    ctx.fillStyle = color
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
    this.highlight(cx - r * 0.36, cy - r * 0.48, r * 0.9)
    this.shade(cx + r * 0.4, cy + r * 0.8, r * 1.1)
    ctx.restore()
  }

  highlight(x: number, y: number, r: number) {
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, r)
    gradient.addColorStop(0, "rgba(255,255,255,0.7)")
    gradient.addColorStop(1, "rgba(255,255,255,0)")
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }

  shade(x: number, y: number, r: number) {
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, r)
    gradient.addColorStop(0, "rgba(0,0,0,0.2)")
    gradient.addColorStop(1, "rgba(0,0,0,0)")
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }

  // Head and shoulders in a square box whose bottom edge sits at `bottom`.
  person(left: number, bottom: number, size: number, tone: string) {
    const { ctx } = this
    const top = bottom - size
    const headR = size * 0.21
    this.gloss(left + size / 2, top + size * 0.06 + headR, headR, tone)

    const bodyLeft = left + size * 0.04
    const bodyW = size * 0.92
    const bodyH = size * 0.44
    ctx.save()
    ctx.beginPath()
    ctx.ellipse(bodyLeft + bodyW / 2, bottom, bodyW / 2, bodyH * 1.18, 0, Math.PI, 0)
    ctx.closePath()
    ctx.clip()
    ctx.fillStyle = tone
    ctx.fillRect(bodyLeft, bottom - bodyH * 1.2, bodyW, bodyH * 1.2)
    this.highlight(bodyLeft + bodyW * 0.38, bottom - bodyH * 0.82, bodyW * 0.45)
    this.shade(bodyLeft + bodyW * 0.7, bottom, bodyW * 0.5)
    ctx.restore()
  }

  rect(x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient) {
    const { ctx } = this
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
    ctx.fillStyle = fill
    ctx.fill()
  }

  // A pill-shaped label. Returns its width.
  pill(
    x: number,
    y: number,
    text: string,
    { size, bg, fg, padX = 0.8, padY = 0.55, align = "left", dot }: PillStyle
  ) {
    const { ctx, em } = this
    this.font(size)
    const dotSize = dot ? dot.size * em : 0
    const dotGap = dot ? 0.45 * em : 0
    const textW = ctx.measureText(text).width
    const w = textW + padX * em * 2 + dotSize + dotGap
    const h = size * em + padY * em * 2
    const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x
    this.rect(left, y, w, h, h / 2, bg)
    if (dot) {
      ctx.beginPath()
      ctx.arc(left + padX * em + dotSize / 2, y + h / 2, dotSize / 2, 0, Math.PI * 2)
      ctx.fillStyle = dot.color
      ctx.fill()
    }
    ctx.fillStyle = fg
    ctx.textBaseline = "middle"
    ctx.fillText(text, left + padX * em + dotSize + dotGap, y + h / 2 + size * em * 0.04)
    return w
  }

  cursor(x: number, y: number, size: number) {
    const { ctx } = this
    const s = size / 24
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    ctx.beginPath()
    ctx.moveTo(5, 3)
    ctx.lineTo(19, 10.5)
    ctx.lineTo(12.8, 12.1)
    ctx.lineTo(9.6, 18)
    ctx.closePath()
    ctx.fillStyle = "#0a0a0a"
    ctx.fill()
    ctx.lineWidth = 1.6
    ctx.lineJoin = "round"
    ctx.strokeStyle = "#ffffff"
    ctx.stroke()
    ctx.restore()
  }

  tile(x: number, y: number, w: number, h: number, r: number, bg: string, tone: string) {
    const { ctx } = this
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
    ctx.clip()
    ctx.fillStyle = bg
    ctx.fillRect(x, y, w, h)
    const size = Math.min(w * 0.56, h * 0.95)
    this.person(x + (w - size) / 2, y + h, size, tone)
    ctx.restore()
  }
}

type PillStyle = {
  size: number
  bg: string
  fg: string
  padX?: number
  padY?: number
  align?: "left" | "center" | "right"
  dot?: { size: number; color: string }
}

const TONES = {
  peach: "#ffc49b",
  lilac: "#d6c4ff",
  sky: "#a8dcff",
  butter: "#ffe58a",
  rose: "#ffa8cf",
  cream: "#fff1e6",
}

const CARDS: Record<CardKind, { background: Background; draw: (p: Painter) => void }> = {
  camera: {
    background: { at: [20, 0], stops: ["#ffb36b", "#ff5e7e", "#c2187a"], mid: 0.55 },
    draw(p) {
      const size = p.x(58)
      p.person((p.w - size) / 2, p.h, size, TONES.peach)
      p.pill(p.x(6), p.y(8), "maya", { size: 1.2, bg: "rgba(0,0,0,0.35)", fg: "#fff" })
      p.gloss(p.x(94) - p.em * 0.85, p.y(8) + p.em * 0.85, p.em * 0.85, "#ff2d55")
    },
  },
  screen: {
    background: { at: [80, 0], stops: ["#7fd3ff", "#2a5bff", "#1a1fb8"], mid: 0.55 },
    draw(p) {
      const { em } = p
      const x = p.x(14)
      const y = p.y(14)
      const w = p.x(72)
      const h = p.y(68)
      p.ctx.save()
      p.ctx.shadowColor = "rgba(0,0,60,0.3)"
      p.ctx.shadowBlur = em * 2
      p.ctx.shadowOffsetY = em * 0.8
      p.rect(x, y, w, h, em * 0.9, "#ffffff")
      p.ctx.restore()
      const pad = em * 1.1
      ;["#ff6b5e", "#ffc23d", "#3ddc84"].forEach((color, i) => {
        p.ctx.beginPath()
        p.ctx.arc(x + pad + em * 0.33 + i * em * 1.05, y + pad + em * 0.33, em * 0.33, 0, Math.PI * 2)
        p.ctx.fillStyle = color
        p.ctx.fill()
      })
      p.rect(x + pad, y + pad + em * 1.75, (w - pad * 2) * 0.52, em * 1.2, em * 0.6, "#2a5bff")
      p.rect(x + pad, y + pad + em * 3.75, (w - pad * 2) * 0.78, em * 0.6, em * 0.3, "rgba(0,0,0,0.1)")
      p.rect(x + pad, y + pad + em * 4.85, (w - pad * 2) * 0.62, em * 0.6, em * 0.3, "rgba(0,0,0,0.1)")
      const chartH = h * 0.34
      ;[45, 70, 55, 100].forEach((height, i) => {
        const barH = (chartH * height) / 100
        const barX = x + w - pad - em * (4 * 1 + 3 * 0.4) + i * em * 1.4
        p.rect(barX, y + h - pad - barH, em, barH, em * 0.25, i === 3 ? "#ff4fa3" : "#a9b8ff")
      })
      p.cursor(p.x(62), p.y(58), em * 3)
    },
  },
  banner: {
    background: { at: [10, 0], stops: ["#c89bff", "#7b3bff", "#3a12a8"] },
    draw(p) {
      const size = p.x(40)
      p.person(p.x(8), p.h, size, TONES.rose)
      p.person(p.w - p.x(8) - size, p.h, size, TONES.butter)
      p.ctx.save()
      p.ctx.shadowColor = "rgba(30,0,80,0.3)"
      p.ctx.shadowBlur = p.em * 1.2
      p.ctx.shadowOffsetY = p.em * 0.5
      p.pill(p.w / 2, p.y(10), "the friday show", {
        size: 1.45,
        bg: "#ffffff",
        fg: "#1d0b4a",
        padX: 1,
        padY: 0.7,
        align: "center",
        dot: { size: 0.55, color: "#ff4fa3" },
      })
      p.ctx.restore()
    },
  },
  lowerThird: {
    background: { at: [80, 0], stops: ["#9dffd9", "#19c9a0", "#0a6e63"] },
    draw(p) {
      const { em } = p
      const size = p.x(52)
      p.person(p.w - p.x(6) - size, p.h, size, TONES.sky)
      p.font(1.55)
      const nameW = p.ctx.measureText("maya chen").width + em * 1.6
      const nameH = em * (1.55 + 1.1)
      const roleH = em * (1.1 + 1)
      const top = p.h - p.y(14) - nameH - roleH
      p.ctx.fillStyle = "#ff3d6e"
      p.ctx.fillRect(p.x(7), top, em * 0.45, nameH)
      p.ctx.fillStyle = "#ffffff"
      p.ctx.fillRect(p.x(7) + em * 0.45, top, nameW, nameH)
      p.ctx.fillStyle = "#0a0a0a"
      p.ctx.textBaseline = "middle"
      p.ctx.fillText("maya chen", p.x(7) + em * 1.25, top + nameH / 2)
      p.font(1.1)
      const roleW = p.ctx.measureText("host").width + em * 1.6
      p.ctx.fillStyle = "rgba(10,10,10,0.8)"
      p.ctx.fillRect(p.x(7) + em * 0.45, top + nameH, roleW, roleH)
      p.ctx.fillStyle = "#ffffff"
      p.ctx.fillText("host", p.x(7) + em * 1.25, top + nameH + roleH / 2)
    },
  },
  ticker: {
    background: { at: [20, 0], stops: ["#fff07a", "#ffbf1f", "#ff7a1a"] },
    draw(p) {
      const { em } = p
      const r = p.x(12)
      p.gloss(p.w - p.x(9) - r, p.y(10) + r, r, "#ff5a1f")
      const size = p.x(44)
      p.person(p.x(14), p.h - p.y(20), size, TONES.lilac)
      const barH = p.y(20)
      p.ctx.fillStyle = "#0a0a0a"
      p.ctx.fillRect(0, p.h - barH, p.w, barH)
      const cy = p.h - barH / 2
      p.ctx.beginPath()
      p.ctx.arc(em * 1.15, cy, em * 0.25, 0, Math.PI * 2)
      p.ctx.fillStyle = "#ffd400"
      p.ctx.fill()
      p.font(1.3)
      p.ctx.fillStyle = "#ffffff"
      p.ctx.textBaseline = "middle"
      let x = em * 2
      ;["doors open at 7", "questions in chat", "new episode friday"].forEach((text, i) => {
        if (i > 0) {
          p.ctx.beginPath()
          p.ctx.arc(x + em * 0.55, cy, em * 0.15, 0, Math.PI * 2)
          p.ctx.fillStyle = "rgba(255,255,255,0.5)"
          p.ctx.fill()
          p.ctx.fillStyle = "#ffffff"
          x += em * 1.1
        }
        p.ctx.fillText(text, x, cy)
        x += p.ctx.measureText(text).width + em * 0.1
      })
    },
  },
  grid: {
    background: { at: [80, 0], stops: ["#e2ff7a", "#7be04a", "#1f9e5a"] },
    draw(p) {
      const { em } = p
      const gap = em * 0.55
      const x0 = p.x(9)
      const y0 = p.y(9)
      const w = (p.w - x0 * 2 - gap) / 2
      const h = (p.h - y0 * 2 - gap) / 2
      const tiles: [string, string][] = [
        ["#ff4fa3", TONES.peach],
        ["#2a5bff", TONES.butter],
        ["#ff7a1a", TONES.lilac],
        ["#7b3bff", TONES.sky],
      ]
      tiles.forEach(([bg, tone], i) => {
        p.tile(x0 + (i % 2) * (w + gap), y0 + Math.floor(i / 2) * (h + gap), w, h, em * 0.7, bg, tone)
      })
    },
  },
  spotlight: {
    background: { at: [20, 0], stops: ["#ffc2e2", "#ff4fa3", "#b0156a"] },
    draw(p) {
      const { em } = p
      p.tile(p.x(9), p.y(8), p.x(82), p.y(60), em * 0.7, "#2a1f6e", TONES.rose)
      const h = p.y(20)
      const w = (h * 16) / 9
      const gap = em * 0.5
      const total = w * 3 + gap * 2
      const thumbs: [string, string][] = [
        ["#ff7a1a", TONES.butter],
        ["#2a5bff", TONES.peach],
        ["#1f9e5a", TONES.lilac],
      ]
      thumbs.forEach(([bg, tone], i) => {
        p.tile((p.w - total) / 2 + i * (w + gap), p.h - p.y(8) - h, w, h, em * 0.5, bg, tone)
      })
    },
  },
  audio: {
    background: { at: [80, 0], stops: ["#ffb199", "#ff5a3c", "#c4231a"] },
    draw(p) {
      const left = p.x(16)
      const top = p.y(14)
      const bottom = p.h - p.y(20)
      const span = p.w - left * 2
      const barW = p.x(9)
      ;[42, 68, 54, 92, 72, 38, 58].forEach((height, i) => {
        const barH = ((bottom - top) * height) / 100
        const x = left + (i * (span - barW)) / 6
        const y = bottom - barH
        if (i === 3) {
          p.rect(x, y, barW, barH, barW / 2, "#1a1a1a")
          p.ctx.save()
          p.ctx.beginPath()
          p.ctx.roundRect(x, y, barW, barH, barW / 2)
          p.ctx.clip()
          p.highlight(x + barW * 0.4, y + barW * 0.6, barW * 0.9)
          p.ctx.restore()
        } else {
          const gradient = p.ctx.createLinearGradient(0, y, 0, bottom)
          gradient.addColorStop(0, "#ffffff")
          gradient.addColorStop(1, "#ffd9c9")
          p.rect(x, y, barW, barH, barW / 2, gradient)
        }
      })
      p.rect(p.x(12), p.h - p.y(13) - p.em * 0.3, p.w - p.x(24), p.em * 0.3, p.em * 0.15, "rgba(255,255,255,0.5)")
    },
  },
  rtmp: {
    background: { at: [20, 0], stops: ["#8f9bff", "#3b3bff", "#6a1bd6"] },
    draw(p) {
      const { em } = p
      const cx = p.x(28)
      const cy = p.h / 2
      ;[80, 58, 36].forEach(size => {
        p.ctx.beginPath()
        p.ctx.arc(cx, cy, p.x(size) / 2 - em * 0.125, 0, Math.PI * 2)
        p.ctx.lineWidth = em * 0.25
        p.ctx.strokeStyle = "rgba(255,255,255,0.3)"
        p.ctx.stroke()
      })
      const r = p.x(7)
      const sphere = p.ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, 0, cx, cy, r)
      sphere.addColorStop(0, "#ffffff")
      sphere.addColorStop(0.55, "#dfe6ff")
      sphere.addColorStop(1, "#aab6ff")
      p.ctx.beginPath()
      p.ctx.arc(cx, cy, r, 0, Math.PI * 2)
      p.ctx.fillStyle = sphere
      p.ctx.fill()
      const h = em * (1.45 + 1.2)
      p.pill(p.w - p.x(7), cy - h / 2, "rtmp://  →", {
        size: 1.45,
        bg: "#ffffff",
        fg: "#2f1bd6",
        padX: 0.9,
        padY: 0.6,
        align: "right",
      })
    },
  },
  live: {
    background: { at: [80, 0], stops: ["#ff9a8a", "#ff3b3b", "#a8101e"], mid: 0.55 },
    draw(p) {
      const { em, ctx } = p
      p.font(2.2)
      const liveW = ctx.measureText("live").width
      p.font(1.2)
      const timeW = ctx.measureText("00:42:18").width
      const w = em * (0.9 * 2 + 0.42 + 0.45 * 2) + liveW + timeW
      const h = em * (2.2 + 1.2)
      const x = (p.w - w) / 2
      const y = p.y(44) - h / 2
      ctx.save()
      ctx.shadowColor = "rgba(90,0,0,0.3)"
      ctx.shadowBlur = em * 0.8
      ctx.shadowOffsetY = em * 0.3
      p.rect(x, y, w, h, h / 2, "#ffffff")
      ctx.restore()
      ctx.beginPath()
      ctx.arc(x + em * (0.9 + 0.21), y + h / 2, em * 0.21, 0, Math.PI * 2)
      ctx.fillStyle = "#ff2d2d"
      ctx.fill()
      ctx.textBaseline = "middle"
      p.font(2.2)
      ctx.fillStyle = "#0a0a0a"
      ctx.fillText("live", x + em * (0.9 + 0.42 + 0.45), y + h / 2)
      p.font(1.2)
      ctx.fillStyle = "rgba(0,0,0,0.5)"
      ctx.fillText("00:42:18", x + em * (0.9 + 0.42 + 0.45 * 2) + liveW, y + h / 2 + em * 0.15)
      p.pill(p.w / 2, p.y(70), "1280×720 · 30 fps", { size: 1.1, bg: "rgba(0,0,0,0.25)", fg: "#fff", align: "center" })
    },
  },
  room: {
    background: { at: [20, 0], stops: ["#c6fff0", "#21ffc0", "#00a3a3"], mid: 0.45 },
    draw(p) {
      const { em, ctx } = p
      const size = em * 3.8
      const overlap = em
      const total = size * 3 - overlap * 2
      ;["#ff4fa3", "#2a5bff", "#ff7a1a"].forEach((color, i) => {
        const x = (p.w - total) / 2 + i * (size - overlap)
        const y = p.y(18)
        ctx.save()
        ctx.beginPath()
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2)
        ctx.fillStyle = "#4dffd0"
        ctx.fill()
        ctx.beginPath()
        ctx.arc(x + size / 2, y + size / 2, size / 2 - em * 0.25, 0, Math.PI * 2)
        ctx.clip()
        ctx.fillStyle = color
        ctx.fillRect(x, y, size, size)
        const inner = size * 0.86
        p.person(x + (size - inner) / 2, y + size + size * 0.08, inner, TONES.cream)
        ctx.restore()
      })
      p.font(1.6)
      const roomW = ctx.measureText("room").width
      const idW = ctx.measureText("k3x9qa").width
      const w = em * (1 + 0.5 * 2 + 0.75 + 0.95) + roomW + idW
      const h = em * (1.6 + 1.2)
      const x = (p.w - w) / 2
      const y = p.y(56)
      ctx.save()
      ctx.shadowColor = "rgba(0,60,50,0.25)"
      ctx.shadowBlur = em * 0.8
      ctx.shadowOffsetY = em * 0.3
      p.rect(x, y, w, h, h / 2, "#ffffff")
      ctx.restore()
      ctx.textBaseline = "middle"
      ctx.fillStyle = "rgba(0,0,0,0.45)"
      ctx.fillText("room", x + em, y + h / 2)
      ctx.fillStyle = "#0a0a0a"
      ctx.fillText("k3x9qa", x + em * 1.5 + roomW, y + h / 2)
      const gx = x + em * 2 + roomW + idW
      ctx.strokeStyle = "rgba(0,0,0,0.45)"
      ctx.lineWidth = em * 0.09
      ctx.beginPath()
      ctx.roundRect(gx + em * 0.3, y + h / 2 - em * 0.3, em * 0.55, em * 0.55, em * 0.12)
      ctx.stroke()
      ctx.beginPath()
      ctx.roundRect(gx, y + h / 2 - em * 0.55, em * 0.55, em * 0.55, em * 0.12)
      ctx.stroke()
    },
  },
  html: {
    background: { at: [80, 0], stops: ["#ff8ad8", "#b21bd6", "#3d0b6e"] },
    draw(p) {
      const { ctx } = p
      p.font(6.5)
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.save()
      ctx.shadowColor = "rgba(60,0,90,0.45)"
      ctx.shadowBlur = p.em * 0.9
      ctx.shadowOffsetY = p.em * 0.4
      ctx.fillStyle = "#ffffff"
      ctx.fillText("</>", p.w / 2, p.y(44))
      ctx.restore()
      ctx.textAlign = "left"
      p.pill(p.x(7), p.h - p.y(9) - p.em * 2.2, "html in canvas", { size: 1.2, bg: "rgba(0,0,0,0.35)", fg: "#fff" })
    },
  },
}
