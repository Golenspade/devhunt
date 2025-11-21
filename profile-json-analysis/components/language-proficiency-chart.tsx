"use client"

import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface LanguageProficiencyChartProps {
  skills: Array<{ lang: string; weight: number }>
}

export function LanguageProficiencyChart({ skills }: LanguageProficiencyChartProps) {
  const chartData = skills.map((skill) => ({
    language: skill.lang,
    proficiency: Math.round(skill.weight * 100),
  }))

  return (
    <Card className="bg-card border-border/50">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Language Proficiency
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            proficiency: {
              label: "Proficiency",
              color: "hsl(var(--primary))",
            },
          }}
          className="h-72 w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="language"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="proficiency" fill="var(--color-proficiency)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
