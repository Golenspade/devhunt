"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
import type { ApiResponse, DashboardProfile } from "@/types/profile"

// TopRepos 组件期望的数据格式
interface Repo {
  name: string
  description: string
  stars: number
  language: string
  type: "long_term" | "gem" | "variant" | "churn"
  url: string
}

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<DashboardProfile | null>(null)
  const [topRepos, setTopRepos] = useState<Repo[]>([])
  const [contributions, setContributions] = useState<{ date: string; count: number }[]>([])
  const [prByHourData, setPrByHourData] = useState<{ hour: number; count: number }[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        // 从 sessionStorage 获取用户名
        const configStr = sessionStorage.getItem("devhunt-config")
        if (!configStr) {
          // 如果没有配置，使用默认用户名或跳转到 launch 页面
          router.push("/launch")
          return
        }

        const config = JSON.parse(configStr)
        const username = config.username

        // 调用 API 获取数据
        const response = await fetch(`/api/profile/${username}`)
        if (!response.ok) {
          throw new Error("Failed to load profile data")
        }

        const data: ApiResponse = await response.json()

        // 转换数据格式以适配现有组件
        // 将后端的 momentum 状态映射到前端组件支持的状态
        const mapMomentumStatus = (
          status: "accelerating" | "cooling_down" | "steady" | "ghost" | "unknown"
        ): "accelerating" | "stable" | "declining" => {
          if (status === "accelerating") return "accelerating"
          if (status === "cooling_down" || status === "ghost") return "declining"
          return "stable"
        }

        const dashboardProfile: DashboardProfile = {
          login: data.profile.login,
          bio: data.profile.bio ?? "",
          company: data.profile.company,
          location: data.profile.location,
          followers: data.profile.followers,
          following: data.profile.following,
          tags: data.profile.tags,
          gritFactor: {
            value: data.profile.grit_factor.value ?? 0,
            longTermCount: data.profile.grit_factor.long_term_count,
            gemCount: data.profile.grit_factor.gem_count,
            churnCount: data.profile.grit_factor.churn_count,
            sampleSize: data.profile.grit_factor.sample_size,
          },
          uniIndex: {
            value: data.profile.uni_index.value ?? 0,
            sampleSize: data.profile.uni_index.sample_size,
          },
          momentum: mapMomentumStatus(data.profile.contribution_momentum.status),
          velocity: data.profile.contribution_momentum.value ?? 0,
          nightRatio: data.profile.night_ratio ?? 0,
          focusRatio: data.profile.focus_ratio ?? 0,
          uoi: data.profile.uoi ?? 0,
          externalPrAcceptRate: data.profile.external_pr_accept_rate ?? 0,
          skills: data.profile.skills,
        }

        setProfile(dashboardProfile)

        // 转换 topRepos 数据以适配 TopRepos 组件
        const transformedRepos = data.topRepos.map((repo) => ({
          name: repo.repo,
          description: repo.description ?? "No description available",
          stars: repo.stars,
          language: repo.lang ?? "Unknown",
          type: "long_term" as const, // 简化处理，可以根据 score 或其他字段判断
          url: `https://github.com/${repo.repo}`,
        }))
        setTopRepos(transformedRepos)

        // 转换 hoursHistogram 数据
        const hourlyData = data.hoursHistogram.map((count, hour) => ({
          hour,
          count,
        }))
        setPrByHourData(hourlyData)

        // 转换 contributions 数据
        if (data.profile.contributions?.weeks) {
          const contribData = data.profile.contributions.weeks.flatMap((week) =>
            week.contributionDays.map((day) => ({
              date: day.date,
              count: day.contributionCount,
            }))
          )
          setContributions(contribData)
        } else {
          setContributions([])
        }

        setLoading(false)
      } catch (err) {
        console.error("Error loading profile data:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile data...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error || "Profile not found"}</p>
          <button
            onClick={() => router.push("/launch")}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-lg"
          >
            Go to Launch
          </button>
        </div>
      </div>
    )
  }



  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-10 flex items-center justify-center">
              <img
                src="/images/gemini-generated-image-pxdy7lpxdy7lpxdy.jpeg"
                alt="DevHunt Logo"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
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
              login={profile.login}
              bio={profile.bio}
              company={profile.company ?? undefined}
              location={profile.location ?? undefined}
              followers={profile.followers}
              following={profile.following}
              tags={profile.tags}
            />
          </div>
          <MomentumIndicator status={profile.momentum} velocity={profile.velocity} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <GritFactorChart data={profile.gritFactor} />
          <UniSpectrum value={profile.uniIndex.value} sampleSize={profile.uniIndex.sampleSize} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <MetricCard
            title="Night Ratio"
            value={`${Math.round(profile.nightRatio * 100)}%`}
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
            value={`${Math.round(profile.focusRatio * 100)}%`}
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
            value={`${Math.round(profile.uoi * 100)}%`}
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
            value={`${Math.round(profile.externalPrAcceptRate * 100)}%`}
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
            <LanguageProficiencyChart skills={profile.skills} />
          </div>
        </div>

        <div className="mb-6">
          <ContributionCalendar data={contributions} />
        </div>

        <div className="mb-6">
          <TopRepos repos={topRepos} />
        </div>

        <IntelligenceFooter
          tags={profile.tags}
          gritFactor={profile.gritFactor.value}
          momentum={profile.momentum}
          uniIndex={profile.uniIndex.value}
        />

        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>Profile data coverage: 26 repositories · 45 contributions · Last updated 2 hours ago</p>
        </div>
      </div>
    </main>
  )
}
