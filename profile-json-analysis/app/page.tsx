import { ProfileHeader } from "@/components/profile-header"
import { MetricCard } from "@/components/metric-card"
import { GritFactorChart } from "@/components/grit-factor-chart"
import { UniSpectrum } from "@/components/uni-spectrum"
import { IntelligenceFooter } from "@/components/intelligence-footer"
import { TopRepos } from "@/components/top-repos"
import { MomentumIndicator } from "@/components/momentum-indicator"
import { ContributionCalendar } from "@/components/contribution-calendar"
import { LanguageProficiencyChart } from "@/components/language-proficiency-chart"
import { PRByHourChart } from "@/components/pr-by-hour-chart"

export default function Home() {
  const mockProfile = {
    login: "devhunter",
    bio: "Full-stack developer passionate about open source and developer tools. Building the future of code collaboration.",
    company: "DevHunt Labs",
    location: "San Francisco, CA",
    followers: 1247,
    following: 342,
    tags: ["hard_forker", "variant_leader", "accelerating", "high_grit"],
    gritFactor: {
      value: 0.73,
      longTermCount: 18,
      gemCount: 5,
      churnCount: 3,
      sampleSize: 26,
    },
    uniIndex: {
      value: 0.68,
      sampleSize: 45,
    },
    momentum: "accelerating" as const,
    velocity: 1.5,
    nightRatio: 0.34,
    focusRatio: 0.62,
    uoi: 0.45,
    externalPrAcceptRate: 0.78,
    skills: [
      { lang: "TypeScript", weight: 0.85 },
      { lang: "Python", weight: 0.62 },
      { lang: "Rust", weight: 0.48 },
      { lang: "Go", weight: 0.35 },
    ],
  }

  const topRepos = [
    {
      name: "devhunter/code-analyzer",
      description:
        "AI-powered code analysis tool that provides insights into code quality and developer behavior patterns",
      stars: 2847,
      language: "TypeScript",
      type: "long_term" as const,
      url: "https://github.com/devhunter/code-analyzer",
    },
    {
      name: "devhunter/react-flow-builder",
      description: "Visual workflow builder for React applications with drag-and-drop interface",
      stars: 1523,
      language: "TypeScript",
      type: "gem" as const,
      url: "https://github.com/devhunter/react-flow-builder",
    },
    {
      name: "devhunter/next-auth-extended",
      description: "Extended authentication solution for Next.js with additional providers and features",
      stars: 892,
      language: "TypeScript",
      type: "variant" as const,
      url: "https://github.com/devhunter/next-auth-extended",
    },
    {
      name: "devhunter/tailwind-components",
      description: "Collection of reusable Tailwind CSS components for rapid UI development",
      stars: 645,
      language: "TypeScript",
      type: "long_term" as const,
      url: "https://github.com/devhunter/tailwind-components",
    },
    {
      name: "devhunter/api-gateway",
      description: "Lightweight API gateway with rate limiting, caching, and authentication",
      stars: 423,
      language: "Go",
      type: "long_term" as const,
      url: "https://github.com/devhunter/api-gateway",
    },
  ]

  const prByHourData = [
    { hour: 0, count: 2 },
    { hour: 1, count: 1 },
    { hour: 2, count: 0 },
    { hour: 3, count: 1 },
    { hour: 4, count: 0 },
    { hour: 5, count: 0 },
    { hour: 6, count: 3 },
    { hour: 7, count: 5 },
    { hour: 8, count: 8 },
    { hour: 9, count: 12 },
    { hour: 10, count: 15 },
    { hour: 11, count: 18 },
    { hour: 12, count: 14 },
    { hour: 13, count: 16 },
    { hour: 14, count: 20 },
    { hour: 15, count: 22 },
    { hour: 16, count: 19 },
    { hour: 17, count: 15 },
    { hour: 18, count: 12 },
    { hour: 19, count: 10 },
    { hour: 20, count: 8 },
    { hour: 21, count: 6 },
    { hour: 22, count: 4 },
    { hour: 23, count: 3 },
  ]

  const generateMockContributions = () => {
    const contributions = []
    const today = new Date()
    for (let i = 0; i < 365; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      contributions.push({
        date: date.toISOString().split("T")[0],
        count: Math.floor(Math.random() * 15),
      })
    }
    return contributions
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <img
              src="/images/gemini-generated-image-pxdy7lpxdy7lpxdy.jpeg"
              alt="DevHunt Logo"
              className="w-10 h-10 rounded-lg"
            />
            <div>
              <h2 className="text-xl font-bold text-foreground">DevHunt</h2>
              <p className="text-xs text-muted-foreground">Developer Intelligence Platform</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-sm text-primary mb-6">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            DevHunt Profile Analytics
          </div>
          <h1 className="text-5xl font-bold text-foreground mb-3 text-balance">Developer Intelligence Dashboard</h1>
          <p className="text-lg text-muted-foreground text-pretty">
            AI-powered insights into developer behavior, contribution patterns, and code quality metrics.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
          <div className="flex-1">
            <ProfileHeader
              login={mockProfile.login}
              bio={mockProfile.bio}
              company={mockProfile.company}
              location={mockProfile.location}
              followers={mockProfile.followers}
              following={mockProfile.following}
              tags={mockProfile.tags}
            />
          </div>
          <MomentumIndicator status={mockProfile.momentum} velocity={mockProfile.velocity} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <GritFactorChart data={mockProfile.gritFactor} />
          <UniSpectrum value={mockProfile.uniIndex.value} sampleSize={mockProfile.uniIndex.sampleSize} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <MetricCard
            title="Night Ratio"
            value={`${Math.round(mockProfile.nightRatio * 100)}%`}
            subtitle="Late night commits"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            }
          />

          <MetricCard
            title="Focus Ratio"
            value={`${Math.round(mockProfile.focusRatio * 100)}%`}
            subtitle="Primary language focus"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            }
          />

          <MetricCard
            title="UOI"
            value={`${Math.round(mockProfile.uoi * 100)}%`}
            subtitle="Upstream orientation"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                />
              </svg>
            }
          />

          <MetricCard
            title="PR Accept Rate"
            value={`${Math.round(mockProfile.externalPrAcceptRate * 100)}%`}
            subtitle="External contributions"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-8 gap-6 mb-6">
          <div className="lg:col-span-5">
            <PRByHourChart data={prByHourData} />
          </div>
          <div className="lg:col-span-3">
            <LanguageProficiencyChart skills={mockProfile.skills} />
          </div>
        </div>

        <div className="mb-6">
          <ContributionCalendar data={generateMockContributions()} />
        </div>

        <div className="mb-6">
          <TopRepos repos={topRepos} />
        </div>

        <IntelligenceFooter
          tags={mockProfile.tags}
          gritFactor={mockProfile.gritFactor.value}
          momentum={mockProfile.momentum}
          uniIndex={mockProfile.uniIndex.value}
        />

        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>Profile data coverage: 26 repositories · 45 contributions · Last updated 2 hours ago</p>
        </div>
      </div>
    </main>
  )
}
