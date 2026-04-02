export default function EmptyState({ icon, title, description }: { icon?: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      {icon && (
        <div className="w-10 h-10 rounded-xl bg-surface-2 border border-surface-border flex items-center justify-center mb-3 text-slate-500">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-slate-400">{title}</p>
      {description && <p className="text-xs text-slate-600 mt-1 max-w-[200px]">{description}</p>}
    </div>
  )
}
