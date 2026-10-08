import React from 'react';
import type { LayoutMode, OverlayConfig } from '@/types/overlay';
import type { OverlayRenderer } from './videoCanvas';

type OverlayEditorProps = {
  value: OverlayConfig;
  onChange: (value: OverlayConfig) => void;
  renderer: OverlayRenderer;
};

const inputClass =
  'w-full p-2 rounded-lg bg-black border border-zinc-800 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white';

const layouts: { value: LayoutMode; label: string }[] = [
  { value: 'grid', label: 'Grid' },
  { value: 'spotlight', label: 'Spotlight' },
  { value: 'sidebar', label: 'Sidebar' },
];

const toggles: { key: 'showNameTags' | 'showLiveBadge' | 'showClock' | 'showWatermark'; label: string }[] = [
  { key: 'showNameTags', label: 'Name tags' },
  { key: 'showLiveBadge', label: 'LIVE badge' },
  { key: 'showClock', label: 'Clock' },
  { key: 'showWatermark', label: 'Watermark' },
];

export default function OverlayEditor({ value, onChange, renderer }: OverlayEditorProps) {
  const set = <K extends keyof OverlayConfig>(key: K, v: OverlayConfig[K]) => onChange({ ...value, [key]: v });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Overlay</h2>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            renderer === 'html' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-400'
          }`}
          title={
            renderer === 'html'
              ? 'Overlay HTML is drawn straight into the canvas'
              : 'HTML-in-Canvas is not available in this browser; built-in overlays are drawn with the 2D canvas instead'
          }
        >
          {renderer === 'html' ? 'HTML-in-Canvas' : '2D fallback'}
        </span>
      </div>

      <div className="flex gap-2">
        {layouts.map(layout => (
          <button
            key={layout.value}
            onClick={() => set('layout', layout.value)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              value.layout === layout.value ? 'bg-white text-black' : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}
          >
            {layout.label}
          </button>
        ))}
      </div>

      <input className={inputClass} placeholder="Title banner" value={value.title} onChange={e => set('title', e.target.value)} />
      <div className="flex gap-2">
        <input
          className={inputClass}
          placeholder="Lower third: name"
          value={value.lowerThirdName}
          onChange={e => set('lowerThirdName', e.target.value)}
        />
        <input
          className={inputClass}
          placeholder="Role / subtitle"
          value={value.lowerThirdRole}
          onChange={e => set('lowerThirdRole', e.target.value)}
        />
      </div>
      <input className={inputClass} placeholder="Scrolling ticker" value={value.ticker} onChange={e => set('ticker', e.target.value)} />

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm items-center">
        {toggles.map(toggle => (
          <label key={toggle.key} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value[toggle.key]}
              onChange={e => set(toggle.key, e.target.checked)}
              className="accent-white"
            />
            {toggle.label}
          </label>
        ))}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="color"
            value={value.accent}
            onChange={e => set('accent', e.target.value)}
            className="w-6 h-6 bg-transparent border-0 p-0 cursor-pointer"
          />
          Accent
        </label>
      </div>

      <div>
        <textarea
          className={`${inputClass} font-mono h-20 resize-y`}
          placeholder={'Custom HTML, e.g. <div style="position:absolute;top:20px;right:20px;color:white">Sponsored by …</div>'}
          value={value.customHtml}
          onChange={e => set('customHtml', e.target.value)}
        />
        {value.customHtml && renderer !== 'html' && (
          <p className="text-xs text-amber-400 mt-1">
            Custom HTML needs HTML-in-Canvas (Chrome with chrome://flags/#canvas-draw-element or the origin trial). It
            won&apos;t appear in the stream in this browser.
          </p>
        )}
      </div>
    </div>
  );
}
