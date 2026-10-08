export type LayoutMode = 'grid' | 'spotlight' | 'sidebar';

// Everything drawn on top of the videos. The compositor renders this as real
// HTML inside the <canvas> (HTML-in-Canvas) and falls back to plain 2D drawing
// in browsers without that API, so the server never has to edit the video.
export interface OverlayConfig {
  layout: LayoutMode;
  accent: string;
  title: string;
  lowerThirdName: string;
  lowerThirdRole: string;
  ticker: string;
  showNameTags: boolean;
  showLiveBadge: boolean;
  showClock: boolean;
  showWatermark: boolean;
  // Rendered only when the browser supports HTML-in-Canvas.
  customHtml: string;
}

export const defaultOverlay: OverlayConfig = {
  layout: 'grid',
  accent: '#e11d48',
  title: '',
  lowerThirdName: '',
  lowerThirdRole: '',
  ticker: '',
  showNameTags: true,
  showLiveBadge: true,
  showClock: false,
  showWatermark: true,
  customHtml: '',
};
