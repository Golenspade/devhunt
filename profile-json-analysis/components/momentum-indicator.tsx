"use client"

interface MomentumIndicatorProps {
  status: "accelerating" | "stable" | "declining"
  velocity: number
}

const statusConfig = {
  accelerating: {
    label: "Accelerating",
    color: "text-green-400",
    bgColor: "bg-green-400/10",
    borderColor: "border-green-400/30",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  stable: {
    label: "Stable",
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    borderColor: "border-blue-400/30",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    ),
  },
  declining: {
    label: "Declining",
    color: "text-red-400",
    bgColor: "bg-red-400/10",
    borderColor: "border-red-400/30",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
      </svg>
    ),
  },
}

export function MomentumIndicator({ status, velocity }: MomentumIndicatorProps) {
  const config = statusConfig[status]

  return (
    <div className="inline-flex items-center gap-3 px-4 py-2.5 bg-card border border-border/50 rounded-lg">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded ${config.bgColor} ${config.borderColor} border`}>
          <div className={config.color}>{config.icon}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Momentum</div>
          <div className={`text-sm font-semibold ${config.color}`}>{config.label}</div>
        </div>
      </div>
      <div className="h-8 w-px bg-border" />
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">Velocity</div>
        <div className="text-sm font-semibold text-foreground">{velocity.toFixed(1)}x</div>
      </div>
    </div>
  )
}
