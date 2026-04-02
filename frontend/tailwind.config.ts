import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#06080f',    // near-black, deep space
          1: '#0b0f1c',          // sidebar base
          2: '#101624',          // card base
          3: '#161e30',          // elevated card
          border: '#1c2740',     // subtle border
          'border-bright': '#2a3a5c',  // hover/active borders
        },
        accent: {
          blue:   '#38bdf8',   // sky blue
          cyan:   '#22d3ee',   // electric cyan
          violet: '#a78bfa',   // soft violet
          green:  '#34d399',   // emerald
          amber:  '#fbbf24',   // gold amber
          red:    '#f87171',   // coral red
          orange: '#fb923c',   // vivid orange
          pink:   '#f472b6',   // hot pink
          indigo: '#818cf8',   // indigo
        },
        decision: {
          normal:   '#34d399',
          degraded: '#fbbf24',
          stop:     '#f87171',
          reroute:  '#fb923c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card:   '0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.8)',
        panel:  '0 4px 32px rgba(0,0,0,0.7)',
        glow:   '0 0 20px rgba(34,211,238,0.15)',
        'glow-amber': '0 0 20px rgba(251,191,36,0.15)',
        'glow-red':   '0 0 20px rgba(248,113,113,0.15)',
      },
    },
  },
  plugins: [],
} satisfies Config
