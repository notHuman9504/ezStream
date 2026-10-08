/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Raw values live in globals.css; the site is dark only.
      colors: {
        background: 'rgb(var(--bg) / <alpha-value>)',
        foreground: 'rgb(var(--fg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        elevated: 'rgb(var(--elevated) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        fg: {
          DEFAULT: 'rgb(var(--fg) / <alpha-value>)',
          64: 'rgb(var(--fg) / 0.64)',
          50: 'rgb(var(--fg) / 0.5)',
          30: 'rgb(var(--fg) / 0.3)',
          20: 'rgb(var(--fg) / 0.2)',
        },
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          deep: 'rgb(var(--brand-deep) / <alpha-value>)',
        },
        sky: { brand: '#48A3D1' },
        indigo: { brand: '#3A54FF' },
        violet: { brand: '#7A67C5' },
        crimson: { brand: '#9A0101' },
        success: 'rgb(var(--success) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        // shadcn aliases so generated components keep working
        border: 'rgb(var(--line) / <alpha-value>)',
        input: 'rgb(var(--line) / <alpha-value>)',
        ring: 'rgb(var(--fg) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--fg) / <alpha-value>)',
          foreground: 'rgb(var(--bg) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--muted) / <alpha-value>)',
          foreground: 'rgb(var(--fg) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'rgb(var(--danger) / <alpha-value>)',
          foreground: 'rgb(var(--fg) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          foreground: 'rgb(var(--fg) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      // Type scale: regular-weight display type with tight tracking, small UI text.
      fontSize: {
        display: ['clamp(3.25rem, 6.9vw, 7rem)', { lineHeight: '1', letterSpacing: '-0.03em', fontWeight: '400' }],
        h1: ['clamp(2.75rem, 5.1vw, 5.5rem)', { lineHeight: '0.96', letterSpacing: '-0.03em', fontWeight: '400' }],
        h2: ['clamp(2.25rem, 3.7vw, 4rem)', { lineHeight: '1', letterSpacing: '-0.03em', fontWeight: '400' }],
        h3: ['clamp(1.75rem, 3vw, 3rem)', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '500' }],
        h4: ['clamp(1.5rem, 2.1vw, 2.25rem)', { lineHeight: '1.1', letterSpacing: '-0.025em', fontWeight: '400' }],
        title: ['1.25rem', { lineHeight: '1.25', letterSpacing: '-0.02em', fontWeight: '500' }],
        'body-lg': ['1.0625rem', { lineHeight: '1.45', letterSpacing: '-0.01em' }],
        body: ['0.9375rem', { lineHeight: '1.5', letterSpacing: '-0.005em' }],
        'body-sm': ['0.875rem', { lineHeight: '1.45' }],
        btn: ['0.875rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        tag: ['0.875rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        small: ['0.75rem', { lineHeight: '1.35' }],
        micro: ['0.625rem', { lineHeight: '1.3', letterSpacing: '0.01em' }],
      },
      borderRadius: {
        card: '1.75rem',
        tile: '1.5rem',
        field: '1rem',
      },
      backgroundImage: {
        'grad-orange': 'linear-gradient(180deg, #F94A00 0%, #FD7B03 100%)',
        'grad-sky': 'linear-gradient(180deg, #48A3D1 0%, #FD7B03 100%)',
        'grad-indigo': 'linear-gradient(180deg, #3A54FF 0%, #7A67C5 23%, #FD7B03 100%)',
        'grad-crimson': 'linear-gradient(180deg, #9A0101 0%, #FD7B03 100%)',
        'fade-down': 'linear-gradient(180deg, rgb(var(--bg) / 0) 0%, rgb(var(--bg)) 100%)',
        'fade-up': 'linear-gradient(0deg, rgb(var(--bg) / 0) 0%, rgb(var(--bg)) 100%)',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out-quart': 'cubic-bezier(0.76, 0, 0.24, 1)',
      },
      keyframes: {
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'live-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        marquee: 'marquee 40s linear infinite',
        'live-pulse': 'live-pulse 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
