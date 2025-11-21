"use client"

import { MetricCard } from "./metric-card"

interface UniSpectrumProps {
  value: number
  sampleSize: number
}

export function UniSpectrum({ value, sampleSize }: UniSpectrumProps) {
  const percentage = Math.round(value * 100)
  const position = value * 100

  return (
    <MetricCard title="Uni Spectrum" value={`${percentage}%`} subtitle={`Based on ${sampleSize} contributions`}>
      <div className="space-y-6">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-foreground">{percentage}%</span>
          <span className="text-sm text-muted-foreground">Creator Index</span>
        </div>

        <div className="relative">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Collaborator</span>
            <span>Creator</span>
          </div>

          <div className="relative h-3 bg-secondary/50 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${position}%`,
                background: "linear-gradient(90deg, #6b7280 0%, #d97757 100%)",
              }}
            />

            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-primary transition-all"
              style={{
                left: `calc(${position}% - 8px)`,
              }}
            />
          </div>

          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Tendency</div>
            <div className="text-sm font-medium text-foreground">
              {value > 0.6 ? "Strong Creator" : value > 0.4 ? "Balanced" : "Collaborator"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Sample Size</div>
            <div className="text-sm font-medium text-foreground">{sampleSize} repos</div>
          </div>
        </div>
      </div>
    </MetricCard>
  )
}
