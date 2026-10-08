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
        brand: 'rgb(var(--brand) / <alpha-value>)',
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
        sans: ['var(--font-sans)', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      // Medium-weight grotesk set very tight; headings and UI share one voice.
      fontSize: {
        mega: ['clamp(3rem, 8vw, 5.5rem)', { lineHeight: '0.95', letterSpacing: '-0.05em', fontWeight: '500' }],
        h1: ['clamp(2.5rem, 5.5vw, 4rem)', { lineHeight: '1', letterSpacing: '-0.045em', fontWeight: '500' }],
        h2: ['clamp(2rem, 3.6vw, 3rem)', { lineHeight: '1.05', letterSpacing: '-0.04em', fontWeight: '500' }],
        h3: ['clamp(1.5rem, 2.4vw, 1.75rem)', { lineHeight: '1.15', letterSpacing: '-0.035em', fontWeight: '500' }],
        h4: ['1.375rem', { lineHeight: '1.2', letterSpacing: '-0.03em', fontWeight: '500' }],
        title: ['1.1875rem', { lineHeight: '1.25', letterSpacing: '-0.035em', fontWeight: '500' }],
        'body-lg': ['1.1875rem', { lineHeight: '1.4', letterSpacing: '-0.03em' }],
        body: ['1.0625rem', { lineHeight: '1.45', letterSpacing: '-0.025em' }],
        'body-sm': ['0.9375rem', { lineHeight: '1.45', letterSpacing: '-0.02em' }],
        btn: ['1.0625rem', { lineHeight: '1', letterSpacing: '-0.035em', fontWeight: '500' }],
        tag: ['0.9375rem', { lineHeight: '1.3', letterSpacing: '-0.025em', fontWeight: '500' }],
        small: ['0.8125rem', { lineHeight: '1.35', letterSpacing: '-0.01em' }],
      },
      borderRadius: {
        card: '1.25rem',
        tile: '1rem',
        field: '0.75rem',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
        'in-out-quart': 'cubic-bezier(0.76, 0, 0.24, 1)',
        // Slight overshoot, settles quickly.
        spring:
          'linear(0, 0.009, 0.035 2.1%, 0.141 4.4%, 0.281 6.7%, 0.723 12.9%, 0.938 16.7%, 1.017 19.4%, 1.051 22.1%, 1.06 24.9%, 1.044 30.4%, 1.012 39.4%, 0.997 50.9%, 1.001 68%, 1)',
      },
      keyframes: {
        'live-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'live-pulse': 'live-pulse 1.6s ease-in-out infinite',
        'spin-slow': 'spin-slow 18s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
