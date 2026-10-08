import React, { forwardRef, useEffect, useMemo, useState } from 'react';
import type { OverlayConfig } from '@/types/overlay';
import { Rect, sanitizeOverlayHtml } from '@/lib/compositor';

// All sizes are designed for 1280x720 and scaled to the output resolution.
const BASE_WIDTH = 1280;
const FONT = 'Inter, system-ui, -apple-system, sans-serif';
const TICKER_SPEED = 90; // px per second at base width

export interface OverlayState {
  config: OverlayConfig;
  width: number;
  height: number;
  tiles: { rect: Rect; label: string }[];
  isLive: boolean;
}

function useClock(enabled: boolean) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [enabled]);
  return now;
}

// Name tags sit at a tile's bottom-left, but must stay clear of the ticker and
// the lower third; in that case they move to the tile's bottom-right.
function nameTagAnchor(rect: Rect, config: OverlayConfig, height: number, s: number) {
  const tickerTop = height - (config.ticker ? 42 * s : 0);
  const bottom = Math.min(rect.y + rect.h, tickerTop) - 10 * s;
  const lowerThirdTop = tickerTop - 36 * s - (config.lowerThirdRole ? 120 : 90) * s;
  const hitsLowerThird = !!config.lowerThirdName && rect.x < 560 * s && bottom > lowerThirdTop;
  return hitsLowerThird
    ? { x: rect.x + rect.w - 10 * s, bottom, align: 'right' as const }
    : { x: rect.x + 10 * s, bottom, align: 'left' as const };
}

const formatClock = (date: Date) =>
  date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// The overlay as real HTML/CSS. It is a direct child of the <canvas>, so it is
// never shown on the page by itself; the compositor draws it into every frame
// with drawElementImage(), which means it ends up in the outgoing stream.
export const StreamOverlay = forwardRef<HTMLDivElement, OverlayState>(function StreamOverlay(
  { config, width, height, tiles, isLive },
  ref
) {
  const s = width / BASE_WIDTH;
  const now = useClock(config.showClock);
  const customHtml = useMemo(() => sanitizeOverlayHtml(config.customHtml), [config.customHtml]);
  const tickerH = config.ticker ? 42 * s : 0;

  const pill: React.CSSProperties = {
    position: 'absolute',
    background: 'rgba(0,0,0,0.6)',
    color: '#fff',
    borderRadius: 8 * s,
    padding: `${6 * s}px ${12 * s}px`,
    whiteSpace: 'nowrap',
  };

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width,
        height,
        overflow: 'hidden',
        fontFamily: FONT,
        pointerEvents: 'none',
      }}
    >
      {customHtml && (
        <div style={{ position: 'absolute', inset: 0 }} dangerouslySetInnerHTML={{ __html: customHtml }} />
      )}

      {config.showNameTags &&
        tiles.map(({ rect, label }, i) => {
          const anchor = nameTagAnchor(rect, config, height, s);
          return (
            <div
              key={i}
              style={{
                ...pill,
                ...(anchor.align === 'left' ? { left: anchor.x } : { right: width - anchor.x }),
                bottom: height - anchor.bottom,
                fontSize: 15 * s,
                fontWeight: 600,
                padding: `${4 * s}px ${10 * s}px`,
                maxWidth: rect.w - 20 * s,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {label}
            </div>
          );
        })}

      {config.showLiveBadge && isLive && (
        <div
          style={{
            ...pill,
            left: 20 * s,
            top: 20 * s,
            background: config.accent,
            fontSize: 16 * s,
            fontWeight: 800,
            letterSpacing: 1.5 * s,
          }}
        >
          ● LIVE
        </div>
      )}

      {config.showClock && (
        <div style={{ ...pill, right: 20 * s, top: 20 * s, fontSize: 16 * s, fontWeight: 600 }}>
          {formatClock(now)}
        </div>
      )}

      {config.title && (
        <div
          style={{
            ...pill,
            left: '50%',
            top: 20 * s,
            transform: 'translateX(-50%)',
            fontSize: 24 * s,
            fontWeight: 700,
            borderLeft: `${6 * s}px solid ${config.accent}`,
            maxWidth: width * 0.6,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {config.title}
        </div>
      )}

      {config.lowerThirdName && (
        <div style={{ position: 'absolute', left: 40 * s, bottom: tickerH + 36 * s }}>
          <div
            style={{
              display: 'inline-block',
              background: config.accent,
              color: '#fff',
              fontSize: 30 * s,
              fontWeight: 800,
              padding: `${6 * s}px ${18 * s}px`,
            }}
          >
            {config.lowerThirdName}
          </div>
          {config.lowerThirdRole && (
            <div
              style={{
                background: '#fff',
                color: '#111',
                fontSize: 18 * s,
                fontWeight: 600,
                padding: `${4 * s}px ${18 * s}px`,
                width: 'fit-content',
              }}
            >
              {config.lowerThirdRole}
            </div>
          )}
        </div>
      )}

      {config.ticker && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: tickerH,
            background: 'rgba(0,0,0,0.78)',
            borderTop: `${3 * s}px solid ${config.accent}`,
            color: '#fff',
            fontSize: 20 * s,
            fontWeight: 600,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              paddingLeft: width,
              animation: `ezs-ticker ${Math.max(8, (config.ticker.length * 11 * s + width) / (TICKER_SPEED * s))}s linear infinite`,
            }}
          >
            {config.ticker}
          </span>
        </div>
      )}

      {config.showWatermark && (
        <div
          style={{
            position: 'absolute',
            right: 20 * s,
            bottom: tickerH + 14 * s,
            color: 'rgba(255,255,255,0.85)',
            fontSize: 18 * s,
            fontWeight: 700,
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          ezStream
        </div>
      )}
    </div>
  );
});

// --- 2D fallback ------------------------------------------------------------
// Same overlay drawn with plain canvas calls for browsers without
// HTML-in-Canvas. Custom HTML can't be reproduced here and is skipped.

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  opts: { size: number; weight: number; bg: string; color?: string; padX: number; padY: number; radius: number; maxWidth?: number; align?: 'left' | 'right' | 'center' }
) {
  ctx.font = `${opts.weight} ${opts.size}px ${FONT}`;
  const label = opts.maxWidth ? fitText(ctx, text, opts.maxWidth - opts.padX * 2) : text;
  const w = ctx.measureText(label).width + opts.padX * 2;
  const h = opts.size * 1.25 + opts.padY * 2;
  const left = opts.align === 'right' ? x - w : opts.align === 'center' ? x - w / 2 : x;

  ctx.fillStyle = opts.bg;
  ctx.beginPath();
  ctx.roundRect(left, y, w, h, opts.radius);
  ctx.fill();
  ctx.fillStyle = opts.color ?? '#fff';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, left + opts.padX, y + h / 2);
  return { left, w, h };
}

export function paintOverlayFallback(
  ctx: CanvasRenderingContext2D,
  { config, width, height, tiles, isLive }: OverlayState,
  timeMs: number
) {
  const s = width / BASE_WIDTH;
  const tickerH = config.ticker ? 42 * s : 0;
  const pillBase = { bg: 'rgba(0,0,0,0.6)', radius: 8 * s, padX: 12 * s, padY: 6 * s };

  ctx.save();
  ctx.textAlign = 'left';

  if (config.showNameTags) {
    tiles.forEach(({ rect, label }) => {
      const anchor = nameTagAnchor(rect, config, height, s);
      const pillH = 15 * s * 1.25 + 8 * s;
      drawPill(ctx, label, anchor.x, anchor.bottom - pillH, {
        align: anchor.align,
        ...pillBase,
        size: 15 * s,
        weight: 600,
        padX: 10 * s,
        padY: 4 * s,
        maxWidth: rect.w - 20 * s,
      });
    });
  }

  if (config.showLiveBadge && isLive) {
    drawPill(ctx, '● LIVE', 20 * s, 20 * s, { ...pillBase, bg: config.accent, size: 16 * s, weight: 800 });
  }

  if (config.showClock) {
    drawPill(ctx, formatClock(new Date()), width - 20 * s, 20 * s, {
      ...pillBase,
      size: 16 * s,
      weight: 600,
      align: 'right',
    });
  }

  if (config.title) {
    const box = drawPill(ctx, config.title, width / 2, 20 * s, {
      ...pillBase,
      size: 24 * s,
      weight: 700,
      align: 'center',
      maxWidth: width * 0.6,
    });
    ctx.fillStyle = config.accent;
    ctx.fillRect(box.left, 20 * s, 6 * s, box.h);
  }

  if (config.lowerThirdName) {
    const roleH = config.lowerThirdRole ? 18 * s * 1.25 + 8 * s : 0;
    const nameH = 30 * s * 1.25 + 12 * s;
    const top = height - tickerH - 36 * s - roleH - nameH;
    ctx.textBaseline = 'middle';

    ctx.font = `800 ${30 * s}px ${FONT}`;
    const nameW = ctx.measureText(config.lowerThirdName).width + 36 * s;
    ctx.fillStyle = config.accent;
    ctx.fillRect(40 * s, top, nameW, nameH);
    ctx.fillStyle = '#fff';
    ctx.fillText(config.lowerThirdName, 58 * s, top + nameH / 2);

    if (config.lowerThirdRole) {
      ctx.font = `600 ${18 * s}px ${FONT}`;
      const roleW = ctx.measureText(config.lowerThirdRole).width + 36 * s;
      ctx.fillStyle = '#fff';
      ctx.fillRect(40 * s, top + nameH, roleW, roleH);
      ctx.fillStyle = '#111';
      ctx.fillText(config.lowerThirdRole, 58 * s, top + nameH + roleH / 2);
    }
  }

  if (config.ticker) {
    const y = height - tickerH;
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(0, y, width, tickerH);
    ctx.fillStyle = config.accent;
    ctx.fillRect(0, y, width, 3 * s);

    ctx.font = `600 ${20 * s}px ${FONT}`;
    ctx.textBaseline = 'middle';
    const textW = ctx.measureText(config.ticker).width;
    const travel = textW + width;
    const offset = ((timeMs / 1000) * TICKER_SPEED * s) % travel;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y, width, tickerH);
    ctx.clip();
    ctx.fillStyle = '#fff';
    ctx.fillText(config.ticker, width - offset, y + tickerH / 2 + 1.5 * s);
    ctx.restore();
  }

  if (config.showWatermark) {
    ctx.font = `700 ${18 * s}px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('ezStream', width - 20 * s, height - tickerH - 14 * s);
  }

  ctx.restore();
}
