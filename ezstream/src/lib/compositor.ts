import type { LayoutMode } from '@/types/overlay';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const PADDING = 8;

function gridDims(count: number) {
  if (count <= 1) return { rows: 1, cols: 1 };
  if (count === 2) return { rows: 1, cols: 2 };
  if (count <= 4) return { rows: 2, cols: 2 };
  if (count <= 6) return { rows: 2, cols: 3 };
  if (count <= 8) return { rows: 2, cols: 4 };
  const cols = Math.ceil(Math.sqrt(count));
  return { rows: Math.ceil(count / cols), cols };
}

function grid(count: number, area: Rect): Rect[] {
  const { rows, cols } = gridDims(count);
  const cellW = (area.w - PADDING * (cols - 1)) / cols;
  const cellH = (area.h - PADDING * (rows - 1)) / rows;
  const rects: Rect[] = [];

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    // Center the last row when it isn't full.
    const inRow = row === rows - 1 ? count - row * cols : cols;
    const rowOffset = ((cols - inRow) * (cellW + PADDING)) / 2;
    rects.push({
      x: area.x + rowOffset + col * (cellW + PADDING),
      y: area.y + row * (cellH + PADDING),
      w: cellW,
      h: cellH,
    });
  }

  // Three people: one tall tile on the left, two stacked on the right.
  if (count === 3) {
    rects[0] = { x: area.x, y: area.y, w: cellW, h: area.h };
    rects[1] = { x: area.x + cellW + PADDING, y: area.y, w: cellW, h: cellH };
    rects[2] = { x: area.x + cellW + PADDING, y: area.y + cellH + PADDING, w: cellW, h: cellH };
  }
  return rects;
}

// Tile positions in canvas pixels. Shared by the video drawing loop and the HTML
// overlay so name tags always sit on the right tile.
export function computeLayout(count: number, width: number, height: number, mode: LayoutMode): Rect[] {
  if (count === 0) return [];
  const area = { x: PADDING, y: PADDING, w: width - PADDING * 2, h: height - PADDING * 2 };
  if (count === 1 || mode === 'grid') return grid(count, area);

  const rest = count - 1;
  if (mode === 'spotlight') {
    const stripH = Math.round(area.h * 0.22);
    const main = { ...area, h: area.h - stripH - PADDING };
    const thumbW = Math.min(stripH * (16 / 9), (area.w - PADDING * (rest - 1)) / rest);
    const stripW = thumbW * rest + PADDING * (rest - 1);
    const startX = area.x + (area.w - stripW) / 2;
    const thumbs = Array.from({ length: rest }, (_, i) => ({
      x: startX + i * (thumbW + PADDING),
      y: main.y + main.h + PADDING,
      w: thumbW,
      h: stripH,
    }));
    return [main, ...thumbs];
  }

  // sidebar
  const sideW = Math.round(area.w * 0.26);
  const main = { ...area, w: area.w - sideW - PADDING };
  const thumbH = Math.min(sideW * (9 / 16), (area.h - PADDING * (rest - 1)) / rest);
  const columnH = thumbH * rest + PADDING * (rest - 1);
  const startY = area.y + (area.h - columnH) / 2;
  const thumbs = Array.from({ length: rest }, (_, i) => ({
    x: main.x + main.w + PADDING,
    y: startY + i * (thumbH + PADDING),
    w: sideW,
    h: thumbH,
  }));
  return [main, ...thumbs];
}

// Draws the video into rect: "cover" crops to fill (cameras), "contain"
// letterboxes so nothing is cut off (screen shares).
export function drawVideoInRect(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  rect: Rect,
  fit: 'cover' | 'contain',
  radius = 10
) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;

  const scale = fit === 'cover' ? Math.max(rect.w / vw, rect.h / vh) : Math.min(rect.w / vw, rect.h / vh);
  const dw = vw * scale;
  const dh = vh * scale;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, radius);
  ctx.clip();
  ctx.fillStyle = '#141414';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.drawImage(video, rect.x + (rect.w - dw) / 2, rect.y + (rect.h - dh) / 2, dw, dh);
  ctx.restore();
}

// --- HTML-in-Canvas -------------------------------------------------------
// WICG proposal, shipping behind chrome://flags/#canvas-draw-element and as an
// origin trial. Early builds used the `layoutsubtree` attribute and
// drawElement(); newer ones use content="drawable" and drawElementImage().
// We set both attributes and accept either method name.

type DrawElementFn = (element: Element, dx: number, dy: number, dw?: number, dh?: number) => unknown;

export function getDrawElement(ctx: CanvasRenderingContext2D): DrawElementFn | null {
  const anyCtx = ctx as unknown as { drawElementImage?: DrawElementFn; drawElement?: DrawElementFn };
  const fn = anyCtx.drawElementImage ?? anyCtx.drawElement;
  return typeof fn === 'function' ? fn.bind(ctx) : null;
}

export function enableCanvasSubtree(canvas: HTMLCanvasElement) {
  canvas.setAttribute('layoutsubtree', '');
  canvas.setAttribute('content', 'drawable');
}

let probeResult: Promise<boolean> | null = null;

// Some builds (e.g. the Chrome 141 prototype behind a flag) expose the method
// but taint the canvas after drawing HTML. A tainted canvas can't be captured,
// so only use the API if a throwaway canvas stays readable after a draw.
export function probeHtmlInCanvas(): Promise<boolean> {
  if (probeResult) return probeResult;

  probeResult = new Promise<boolean>(resolve => {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 4;
    enableCanvasSubtree(canvas);
    canvas.style.cssText = 'position:fixed;left:-100px;top:0;width:4px;height:4px;pointer-events:none';
    const child = document.createElement('div');
    child.style.cssText = 'width:4px;height:4px;background:#f00';
    canvas.appendChild(child);

    const ctx = canvas.getContext('2d');
    const draw = ctx && getDrawElement(ctx);
    if (!ctx || !draw) {
      resolve(false);
      return;
    }

    document.body.appendChild(canvas);
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      canvas.remove();
      resolve(ok);
    };

    let attempts = 0;
    const attempt = () => {
      if (done) return;
      try {
        draw(child, 0, 0, 4, 4);
        ctx.getImageData(0, 0, 1, 1);
        finish(true);
      } catch (err) {
        // Before the first snapshot the draw throws; anything security related is final.
        const securityError = err instanceof DOMException && err.name === 'SecurityError';
        if (securityError || ++attempts >= 10) finish(false);
        else window.setTimeout(attempt, 50);
      }
    };
    window.setTimeout(attempt, 50);
    window.setTimeout(() => finish(false), 3000);
  });
  return probeResult;
}

// Custom overlay HTML is typed by the host into their own page, but it is still
// injected with innerHTML, so strip anything that can run script.
export function sanitizeOverlayHtml(html: string): string {
  if (!html.trim() || typeof DOMParser === 'undefined') return '';
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return '';

  root.querySelectorAll('script, iframe, object, embed, link, meta, base, form').forEach(el => el.remove());
  root.querySelectorAll('*').forEach(el => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith('on') || /^(javascript|vbscript|data:text\/html)/.test(value) || value.includes('javascript:')) {
        el.removeAttribute(attr.name);
      }
    }
  });
  return root.innerHTML;
}

// --- Frame clock -----------------------------------------------------------
// requestAnimationFrame stops and main-thread timers are throttled when the tab
// is hidden, which would freeze the live stream. Timers inside a worker keep
// ticking, so drive frames from one.

export function startFrameClock(fps: number, onFrame: () => void): () => void {
  const interval = 1000 / fps;
  if (typeof Worker === 'undefined') {
    const id = window.setInterval(onFrame, interval);
    return () => window.clearInterval(id);
  }

  const source = `let id; onmessage = (e) => { clearInterval(id); if (e.data > 0) id = setInterval(() => postMessage(0), e.data); };`;
  const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  const worker = new Worker(url);
  worker.onmessage = onFrame;
  worker.postMessage(interval);

  return () => {
    worker.postMessage(0);
    worker.terminate();
    URL.revokeObjectURL(url);
  };
}

// --- Audio mixer -----------------------------------------------------------
// MediaRecorder only records the first audio track of a stream, so every
// selected participant's audio is mixed into one track. Sources can be added
// and removed while recording without restarting the recorder.

export class AudioMixer {
  readonly context: AudioContext;
  readonly destination: MediaStreamAudioDestinationNode;
  private inputs = new Map<string, { node: MediaStreamAudioSourceNode; gain: GainNode }>();

  constructor() {
    this.context = new AudioContext({ sampleRate: 48000 });
    this.destination = this.context.createMediaStreamDestination();
  }

  get track(): MediaStreamTrack {
    return this.destination.stream.getAudioTracks()[0];
  }

  // Keyed by MediaStreamTrack id so a stream that gains or loses tracks is handled.
  sync(streams: MediaStream[]) {
    const wanted = new Map<string, MediaStreamTrack>();
    for (const stream of streams) {
      for (const track of stream.getAudioTracks()) {
        if (track.readyState === 'live') wanted.set(track.id, track);
      }
    }

    this.inputs.forEach((input, id) => {
      if (!wanted.has(id)) {
        input.node.disconnect();
        input.gain.disconnect();
        this.inputs.delete(id);
      }
    });

    wanted.forEach((track, id) => {
      if (this.inputs.has(id)) return;
      const node = this.context.createMediaStreamSource(new MediaStream([track]));
      const gain = this.context.createGain();
      gain.gain.value = 1;
      node.connect(gain).connect(this.destination);
      this.inputs.set(id, { node, gain });
    });
  }

  resume() {
    return this.context.state === 'suspended' ? this.context.resume() : Promise.resolve();
  }

  close() {
    this.inputs.forEach(input => {
      input.node.disconnect();
      input.gain.disconnect();
    });
    this.inputs.clear();
    void this.context.close();
  }
}

export function getSupportedMimeType(): string {
  const types = [
    'video/webm;codecs=h264,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm',
  ];
  return types.find(type => MediaRecorder.isTypeSupported(type)) || '';
}
