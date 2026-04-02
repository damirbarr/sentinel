import clsx from 'clsx'
type Color = 'blue' | 'cyan' | 'violet' | 'green' | 'amber' | 'red' | 'orange' | 'slate'
const colorMap: Record<Color, string> = {
  blue:   'bg-accent-blue/15 text-accent-blue border-accent-blue/30 shadow-[0_0_6px_rgba(56,189,248,0.15)]',
  cyan:   'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30 shadow-[0_0_6px_rgba(34,211,238,0.15)]',
  violet: 'bg-accent-violet/15 text-accent-violet border-accent-violet/30 shadow-[0_0_6px_rgba(167,139,250,0.15)]',
  green:  'bg-accent-green/15 text-accent-green border-accent-green/30 shadow-[0_0_6px_rgba(52,211,153,0.15)]',
  amber:  'bg-accent-amber/15 text-accent-amber border-accent-amber/30 shadow-[0_0_6px_rgba(251,191,36,0.15)]',
  red:    'bg-accent-red/15 text-accent-red border-accent-red/30 shadow-[0_0_6px_rgba(248,113,113,0.15)]',
  orange: 'bg-accent-orange/15 text-accent-orange border-accent-orange/30 shadow-[0_0_6px_rgba(251,146,60,0.15)]',
  slate:  'bg-slate-700/40 text-slate-400 border-slate-700/60',
}
export default function Badge({ children, color = 'slate', className }: { children: React.ReactNode; color?: Color; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-semibold border', colorMap[color], className)}>
      {children}
    </span>
  )
}
