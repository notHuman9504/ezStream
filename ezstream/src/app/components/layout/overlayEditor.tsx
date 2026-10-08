"use client"
import React, { Fragment, useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import type { LayoutMode, OverlayConfig } from '@/types/overlay';
import type { OverlayRenderer } from './videoCanvas';
import { Input, fieldStyles } from '@/components/ui/input';
import { Tag } from '@/components/ui/tag';
import { cn } from '@/lib/utils';

type OverlayEditorProps = {
  value: OverlayConfig;
  onChange: (value: OverlayConfig) => void;
  renderer: OverlayRenderer;
};

const layouts: { value: LayoutMode; label: string }[] = [
  { value: 'grid', label: 'grid' },
  { value: 'spotlight', label: 'spotlight' },
  { value: 'sidebar', label: 'sidebar' },
];

const toggles: {
  key: 'showNameTags' | 'showLiveBadge' | 'showClock' | 'showWatermark';
  label: string;
  hint?: string;
}[] = [
  { key: 'showNameTags', label: 'name tags' },
  { key: 'showLiveBadge', label: 'live badge', hint: 'Shown only while you are live' },
  { key: 'showClock', label: 'clock' },
  { key: 'showWatermark', label: 'watermark' },
];

// Slight overshoot, settles fast.
const SPRING = { type: 'spring', stiffness: 480, damping: 30 } as const;

export default function OverlayEditor({ value, onChange, renderer }: OverlayEditorProps) {
  const set = <K extends keyof OverlayConfig>(key: K, v: OverlayConfig[K]) => onChange({ ...value, [key]: v });
  const id = useId();
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h2 className="text-h4">overlay</h2>
          <p className="mt-1.5 text-body-sm text-fg-50">Drawn into every frame of the program.</p>
        </div>
        <RendererChip renderer={renderer} />
      </div>

      <div className="grid gap-x-10 gap-y-8 xl:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-8">
          <div>
            <GroupTitle id={`${id}-layout`}>layout</GroupTitle>
            {/* "grid • spotlight • sidebar": the white pill springs to the active word. */}
            <div
              role="group"
              aria-labelledby={`${id}-layout`}
              className="flex w-full items-center rounded-full bg-muted p-1 sm:inline-flex sm:w-auto"
            >
              {layouts.map((layout, i) => {
                const active = value.layout === layout.value;
                return (
                  <Fragment key={layout.value}>
                    {i > 0 && <span aria-hidden className="mx-0.5 size-1 shrink-0 rounded-full bg-fg-30" />}
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => set('layout', layout.value)}
                      className={cn(
                        'relative h-10 min-w-0 flex-1 rounded-full px-3 text-[0.9375rem] font-medium tracking-[-0.03em] transition-colors duration-300 sm:flex-none sm:px-4 sm:text-btn',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/60',
                        active ? 'text-background' : 'text-fg-50 hover:text-fg'
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId={`${id}-layout-active`}
                          aria-hidden
                          className="absolute inset-0 rounded-full bg-fg"
                          transition={reduceMotion ? { duration: 0 } : SPRING}
                        />
                      )}
                      <span className="relative">{layout.label}</span>
                    </button>
                  </Fragment>
                );
              })}
            </div>
          </div>

          <div>
            <GroupTitle id={`${id}-text`}>text</GroupTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field htmlFor={`${id}-title`} label="title banner" className="sm:col-span-2">
                <Input
                  id={`${id}-title`}
                  placeholder="centered across the top"
                  value={value.title}
                  onChange={e => set('title', e.target.value)}
                />
              </Field>
              <Field htmlFor={`${id}-lt-name`} label="lower third">
                <Input
                  id={`${id}-lt-name`}
                  placeholder="name"
                  value={value.lowerThirdName}
                  onChange={e => set('lowerThirdName', e.target.value)}
                />
              </Field>
              <Field htmlFor={`${id}-lt-role`} label="subtitle">
                <Input
                  id={`${id}-lt-role`}
                  placeholder="role or subtitle"
                  value={value.lowerThirdRole}
                  onChange={e => set('lowerThirdRole', e.target.value)}
                />
              </Field>
              <Field htmlFor={`${id}-ticker`} label="ticker" className="sm:col-span-2">
                <Input
                  id={`${id}-ticker`}
                  placeholder="scrolls along the bottom edge"
                  value={value.ticker}
                  onChange={e => set('ticker', e.target.value)}
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-8">
          <div>
            <GroupTitle id={`${id}-elements`}>elements</GroupTitle>
            <div role="group" aria-labelledby={`${id}-elements`} className="flex flex-wrap gap-2">
              {toggles.map(toggle => (
                <ToggleChip
                  key={toggle.key}
                  label={toggle.label}
                  hint={toggle.hint}
                  checked={value[toggle.key]}
                  onChange={checked => set(toggle.key, checked)}
                />
              ))}
              <AccentSwatch value={value.accent} onChange={accent => set('accent', accent)} />
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h3>
                <label htmlFor={`${id}-html`} className="cursor-pointer">
                  <Tag className="text-fg">custom html</Tag>
                </label>
              </h3>
              {renderer !== 'html' && <span className="text-small text-fg-30">needs html-in-canvas</span>}
            </div>
            <textarea
              id={`${id}-html`}
              className={cn(
                fieldStyles,
                'block min-h-[7.5rem] resize-y py-3 font-mono text-body-sm tracking-normal'
              )}
              placeholder={'Custom HTML, e.g. <div style="position:absolute;top:20px;right:20px;color:white">Sponsored by …</div>'}
              spellCheck={false}
              value={value.customHtml}
              onChange={e => set('customHtml', e.target.value)}
            />
            {value.customHtml && renderer !== 'html' && (
              <p className="mt-3 flex gap-2.5 rounded-field bg-muted px-4 py-3 text-small text-fg-64">
                <AlertTriangle aria-hidden className="mt-px size-4 shrink-0 text-fg" />
                <span>
                  Custom HTML needs HTML-in-Canvas (Chrome with chrome://flags/#canvas-draw-element or the origin
                  trial). It won&apos;t appear in the stream in this browser.
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RendererChip({ renderer }: { renderer: OverlayRenderer }) {
  const isHtml = renderer === 'html';

  return (
    <span
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-2 rounded-full px-3 text-small font-medium',
        isHtml ? 'bg-success/10 text-success' : 'bg-muted text-fg-50'
      )}
      title={
        isHtml
          ? 'Overlay HTML is drawn straight into the canvas'
          : 'HTML-in-Canvas is not available in this browser; built-in overlays are drawn with the 2D canvas instead'
      }
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', isHtml ? 'bg-success' : 'bg-fg-30')} />
      {isHtml ? 'html-in-canvas' : '2d fallback'}
    </span>
  );
}

function GroupTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="mb-3">
      <Tag className="text-fg">{children}</Tag>
    </h3>
  );
}

function Field({
  htmlFor,
  label,
  className,
  children,
}: {
  htmlFor: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <label htmlFor={htmlFor} className="mb-2 block text-tag text-fg-50">
        {label}
      </label>
      {children}
    </div>
  );
}

// A real checkbox (visually hidden) so keyboard and screen readers get native toggle semantics.
// On: white pill with a dark trailing dot. Off: muted pill, the dot dimmed.
function ToggleChip({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="relative cursor-pointer select-none" title={hint}>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
      <span
        className={cn(
          'inline-flex h-10 items-center gap-2.5 rounded-full pl-4 pr-3.5 text-[0.9375rem] font-medium tracking-[-0.03em]',
          'transition-[background-color,color,transform] duration-300 ease-spring active:scale-[0.96] motion-reduce:transition-none',
          'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-fg/60',
          checked ? 'bg-fg text-background' : 'bg-muted text-fg-64 hover:bg-elevated hover:text-fg'
        )}
      >
        {label}
        <span
          aria-hidden
          className={cn(
            'size-1.5 shrink-0 rounded-full transition-[background-color,transform] duration-500 ease-spring motion-reduce:transition-none',
            checked ? 'scale-125 bg-current' : 'bg-fg-30'
          )}
        />
      </span>
    </label>
  );
}

// The native color input sits invisibly on top of the swatch, so a click opens the picker.
function AccentSwatch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="group/swatch relative inline-flex cursor-pointer">
      <input
        type="color"
        aria-label="Accent color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="peer absolute inset-0 size-full cursor-pointer opacity-0"
      />
      <span
        className={cn(
          'inline-flex h-10 items-center gap-2.5 rounded-full bg-muted pl-1.5 pr-4 text-[0.9375rem] font-medium tracking-[-0.03em] text-fg-64 transition-colors duration-300',
          'group-hover/swatch:bg-elevated group-hover/swatch:text-fg',
          'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-fg/60'
        )}
      >
        <span
          aria-hidden
          className="size-7 rounded-full ring-1 ring-inset ring-fg/20 transition-transform duration-500 ease-spring group-hover/swatch:scale-110 motion-reduce:transition-none"
          style={{ backgroundColor: value }}
        />
        accent
        <span className="font-mono text-small tracking-normal text-fg-50">{value}</span>
      </span>
    </label>
  );
}
