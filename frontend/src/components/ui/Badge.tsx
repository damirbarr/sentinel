import clsx from 'clsx'
type Color = 'blue' | 'cyan' | 'violet' | 'green' | 'amber' | 'red' | 'orange' | 'slate'
const colorMap: Record<Color, string> = {
  blue:   'bg-accent-blue/10 text-accent-blue border-accent-blue/20',
  cyan:   'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20',
  violet: 'bg-accent-violet/10 text-accent-violet border-accent-violet/20',
  green:  'bg-accent-green/10 text-accent-green border-accent-green/20',
  amber:  'bg-accent-amber/10 text-accent-amber border-accent-amber/20',
  red:    'bg-accent-red/10 text-accent-red border-accent-red/20',
  orange: 'bg-accent-orange/10 text-accent-orange border-accent-orange/20',
  slate:  'bg-slate-700/40 text-slate-400 border-slate-700/60',
}
export default function Badge({ children, color = 'slate', className }: { children: React.ReactNode; color?: Color; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium border', colorMap[color], className)}>
      {children}
    </span>
  )
}
