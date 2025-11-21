interface IntelligenceFooterProps {
  tags: string[]
  gritFactor: number
  momentum: string
  uniIndex: number
}

export function IntelligenceFooter({ tags, gritFactor, momentum, uniIndex }: IntelligenceFooterProps) {
  const generateAnalysis = () => {
    const archetypes = tags.map((tag) => tag.replace(/_/g, " ")).join(", ")
    const gritLevel = gritFactor > 0.7 ? "exceptional" : gritFactor > 0.5 ? "strong" : "moderate"
    const creatorType =
      uniIndex > 0.6
        ? "primarily a creator"
        : uniIndex > 0.4
          ? "balanced between creation and collaboration"
          : "collaborative contributor"
    const momentumDesc =
      momentum === "accelerating"
        ? "showing accelerating growth"
        : momentum === "steady"
          ? "maintaining steady momentum"
          : momentum === "cooling_down"
            ? "in a cooling phase"
            : "exploring new directions"

    return `This developer exhibits ${archetypes} characteristics, demonstrating ${gritLevel} grit with a ${Math.round(gritFactor * 100)}% effective delivery rate. They are ${creatorType}, currently ${momentumDesc}. Their contribution pattern suggests a developer who ${
      gritFactor > 0.6 ? "consistently delivers long-term value" : "balances quick wins with sustained projects"
    } while ${uniIndex > 0.5 ? "driving original work" : "enhancing existing ecosystems"}.`
  }

  return (
    <div className="mt-12 border-t border-border/50 pt-8">
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-2">DevHunt Intelligence</h3>
            <p className="text-sm text-foreground/90 leading-relaxed">{generateAnalysis()}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Analysis generated from behavioral patterns and contribution metrics</span>
        </div>
      </div>
    </div>
  )
}
