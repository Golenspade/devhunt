"use client"

import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface PRByHourChartProps {
  data: Array<{ hour: number; count: number }>
}

export function PRByHourChart({ data }: PRByHourChartProps) {
  const chartData = data.map((item) => ({
    hour: `${item.hour.toString().padStart(2, "0")}:00`,
    count: item.count,
  }))

  return (
    <Card className="bg-card border-border/50">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          PR Count by Hour
        </CardTitle>
        <CardDescription className="text-xs">Distribution of pull requests throughout the day</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            count: {
              label: "PR Count",
              color: "#d97757",
            },
          }}
          className="h-72 w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="hour"
                stroke="hsl(var(--foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                interval={2}
                tick={{ fill: "hsl(var(--foreground))" }}
              />
              <YAxis
                stroke="hsl(var(--foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                tick={{ fill: "hsl(var(--foreground))" }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="#d97757" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
