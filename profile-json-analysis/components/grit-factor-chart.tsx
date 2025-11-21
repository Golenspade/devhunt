"use client"

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { MetricCard } from "./metric-card"

interface GritFactorData {
  value: number
  longTermCount: number
  gemCount: number
  churnCount: number
  sampleSize: number
}

interface GritFactorChartProps {
  data: GritFactorData
}

export function GritFactorChart({ data }: GritFactorChartProps) {
  const chartData = [
    { name: "Long Term", value: data.longTermCount, color: "#d97757" },
    { name: "Gem", value: data.gemCount, color: "#6b7280" },
    { name: "Churn", value: data.churnCount, color: "#3f3f46" },
  ]

  const percentage = Math.round(data.value * 100)

  return (
    <MetricCard title="Grit Factor" value={`${percentage}%`} subtitle={`Based on ${data.sampleSize} repositories`}>
      <div className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-foreground">{percentage}%</span>
          <span className="text-sm text-muted-foreground">Effective Delivery Rate</span>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-[#d97757]" />
              <span className="text-muted-foreground">Long Term</span>
            </div>
            <span className="text-lg font-semibold text-foreground">{data.longTermCount}</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-[#6b7280]" />
              <span className="text-muted-foreground">Gem</span>
            </div>
            <span className="text-lg font-semibold text-foreground">{data.gemCount}</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full bg-[#3f3f46]" />
              <span className="text-muted-foreground">Churn</span>
            </div>
            <span className="text-lg font-semibold text-foreground">{data.churnCount}</span>
          </div>
        </div>
      </div>
    </MetricCard>
  )
}
