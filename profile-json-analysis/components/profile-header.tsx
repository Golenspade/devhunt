import { Badge } from "@/components/ui/badge"

interface ProfileHeaderProps {
  login: string
  bio: string
  company?: string
  location?: string
  followers: number
  following: number
  tags: string[]
}

export function ProfileHeader({ login, bio, company, location, followers, following, tags }: ProfileHeaderProps) {
  return (
    <div className="border-b border-border/50 pb-8 mb-8">
      <div className="flex items-start gap-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
          <span className="text-3xl font-bold text-primary">{login[0].toUpperCase()}</span>
        </div>

        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground mb-2">{login}</h1>
          <p className="text-muted-foreground text-base leading-relaxed mb-4">{bio}</p>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
            {company && (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                <span>{company}</span>
              </div>
            )}
            {location && (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>{location}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span>
                {followers} followers · {following} following
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-secondary/50 text-foreground border border-border/50 hover:bg-secondary/70 transition-colors"
              >
                {tag.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
