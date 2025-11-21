"use client"

interface ContributionDay {
  date: string
  count: number
}

interface ContributionCalendarProps {
  data: ContributionDay[]
}

export function ContributionCalendar({ data }: ContributionCalendarProps) {
  // Generate last 365 days
  const generateCalendarData = () => {
    const today = new Date()
    const oneYearAgo = new Date(today)
    oneYearAgo.setFullYear(today.getFullYear() - 1)

    const weeks: ContributionDay[][] = []
    let currentWeek: ContributionDay[] = []

    // Start from one year ago
    const current = new Date(oneYearAgo)

    // Pad to start on Sunday
    const startDay = current.getDay()
    for (let i = 0; i < startDay; i++) {
      currentWeek.push({ date: "", count: 0 })
    }

    while (current <= today) {
      const dateStr = current.toISOString().split("T")[0]
      const dayData = data.find((d) => d.date === dateStr)

      currentWeek.push({
        date: dateStr,
        count: dayData?.count || 0,
      })

      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }

      current.setDate(current.getDate() + 1)
    }

    // Pad the last week
    while (currentWeek.length < 7 && currentWeek.length > 0) {
      currentWeek.push({ date: "", count: 0 })
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }

    return weeks
  }

  const getIntensityClass = (count: number) => {
    if (count === 0) return "bg-secondary/30"
    if (count <= 2) return "bg-primary/20"
    if (count <= 5) return "bg-primary/40"
    if (count <= 10) return "bg-primary/60"
    return "bg-primary"
  }

  const weeks = generateCalendarData()
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

  return (
    <div className="bg-card border border-border/50 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground mb-1">Contribution Activity</h3>
        <p className="text-sm text-muted-foreground">GitHub-style contribution calendar for the past year</p>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Month labels */}
          <div className="flex gap-1 mb-2 ml-8">
            {months.map((month, i) => (
              <div key={i} className="text-xs text-muted-foreground" style={{ width: "44px" }}>
                {month}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-1 text-xs text-muted-foreground pr-2">
              <div style={{ height: "11px" }}>Sun</div>
              <div style={{ height: "11px" }}></div>
              <div style={{ height: "11px" }}>Tue</div>
              <div style={{ height: "11px" }}></div>
              <div style={{ height: "11px" }}>Thu</div>
              <div style={{ height: "11px" }}></div>
              <div style={{ height: "11px" }}>Sat</div>
            </div>

            {/* Weeks */}
            <div className="flex gap-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className={`w-[11px] h-[11px] rounded-sm ${
                        day.date ? getIntensityClass(day.count) : "bg-transparent"
                      } hover:ring-1 hover:ring-primary/50 transition-all cursor-pointer`}
                      title={day.date ? `${day.date}: ${day.count} contributions` : ""}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-sm bg-secondary/30" />
              <div className="w-3 h-3 rounded-sm bg-primary/20" />
              <div className="w-3 h-3 rounded-sm bg-primary/40" />
              <div className="w-3 h-3 rounded-sm bg-primary/60" />
              <div className="w-3 h-3 rounded-sm bg-primary" />
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  )
}
