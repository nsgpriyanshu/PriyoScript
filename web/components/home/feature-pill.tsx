import type { ComponentType } from 'react'

export function FeaturePill({
  icon: Icon,
  text,
}: {
  icon: ComponentType<{ className?: string }>
  text: string
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-fd-border bg-fd-card px-3 py-1.5 text-[11px] font-medium text-fd-muted-foreground sm:text-xs">
      <Icon className="size-3.5" />
      {text}
    </span>
  )
}
