import type { ReactNode } from "react"

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  children?: ReactNode
}

export function MetricCard({ title, value, subtitle, icon, children }: MetricCardProps) {
  return (
    <div className="bg-card border border-border/50 rounded-lg p-6 backdrop-blur-sm hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{title}</h3>
        {icon && <div className="text-primary">{icon}</div>}
      </div>

      {children || (
        <>
          <div className="text-3xl font-bold text-foreground mb-1">{value}</div>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </>
      )}
    </div>
  )
}
