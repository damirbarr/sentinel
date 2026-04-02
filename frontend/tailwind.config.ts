import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0f1117',
          1: '#161b27',
          2: '#1e2536',
          3: '#252d40',
          border: '#2a3347',
        },
        accent: {
          blue:   '#3b82f6',
          cyan:   '#06b6d4',
          violet: '#8b5cf6',
          green:  '#10b981',
          amber:  '#f59e0b',
          red:    '#ef4444',
          orange: '#f97316',
        },
        decision: {
          normal:   '#10b981',
          degraded: '#f59e0b',
          stop:     '#ef4444',
          reroute:  '#8b5cf6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card:  '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.6)',
        panel: '0 4px 24px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
} satisfies Config
