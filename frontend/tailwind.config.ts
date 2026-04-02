import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#07060f',      // deep purple-black
          1: '#0e0b1e',            // rich dark purple
          2: '#14112a',            // medium dark purple
          3: '#1c1838',            // elevated purple
          border: '#2a2550',       // purple border
          'border-bright': '#3d3680',  // bright purple border on hover
        },
        accent: {
          blue:   '#60a5fa',   // lighter blue for readability
          cyan:   '#22d3ee',   // electric cyan (keep)
          violet: '#c084fc',   // bright violet/purple
          green:  '#4ade80',   // bright green
          amber:  '#fcd34d',   // brighter amber/gold
          red:    '#fc8181',   // softer coral red
          orange: '#fdba74',   // light orange
          pink:   '#f472b6',   // hot pink
          teal:   '#2dd4bf',   // teal
        },
        decision: {
          normal:   '#4ade80',   // bright green
          degraded: '#fcd34d',   // gold
          stop:     '#fc8181',   // coral
          reroute:  '#fdba74',   // orange
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
