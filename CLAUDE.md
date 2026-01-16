# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DevHunt is a Developer Intelligence Platform that analyzes GitHub user profiles. It consists of:
- **Backend (Bun + TypeScript)**: CLI tool for scanning GitHub users and generating profiles
- **Frontend (Next.js 16 + React 19)**: Web dashboard for visualization and AI narratives

## Common Commands

```bash
# Install dependencies (both backend and frontend)
./start.sh

# Run backend tests
bun test

# Type check
bun run --bun tsc --noEmit

# Run CLI commands
bun devhunt scan <username> --token $GITHUB_TOKEN
bun devhunt report <username>
bun devhunt narrate <username> [--lang zh|en] [--style professional|casual|brief]

# Frontend commands
cd profile-json-analysis && pnpm dev      # Dev server on port 3000
cd profile-json-analysis && pnpm build    # Production build
cd profile-json-analysis && pnpm lint     # Lint with ESLint
```

## Architecture

### Backend Structure (`src/`)

- **`scan.ts`**: GitHub data fetching via GraphQL API (repos, PRs, commits, contributions)
- **`analyze.ts`**: Profile analysis algorithms and metrics computation
- **`export.ts`**: Report generation and chart rendering (Vega-Lite)
- **`agent/`**: AI narrative generation using LLM APIs
- **`analysis/`**: Metric computation modules (tags, nlp, metrics)
- **`queries/`**: GraphQL query files for GitHub API
- **`types/`**: TypeScript interfaces for GitHub and Profile data

### Frontend Structure (`profile-json-analysis/`)

- **`app/`**: Next.js App Router
  - **`api/analyze/`**: SSE stream API that spawns `bun devhunt` subprocess
  - **`api/profile/[login]/`**: Profile JSON data API
  - **`api/narrate/`**: AI narrative generation API
  - **`launch/`**: Input page for username
  - **`page.tsx`**: Dashboard visualization
- **`components/`**: React components (Recharts, Radix UI, custom UI)

### Data Flow

1. User enters GitHub username in web UI
2. `POST /api/analyze` spawns `bun devhunt scan` + `bun devhunt report` subprocess
3. Results streamed via Server-Sent Events to frontend
4. Profile JSON stored in `out/<login>/profile.json`
5. Dashboard renders charts from profile data
6. AI Narrative generates natural language analysis via `/api/narrate`

### Output Directory

- `out/<login>/raw/` - Raw GitHub data (repos.jsonl, prs.jsonl, commits.jsonl)
- `out/<login>/profile.json` - Analyzed profile metrics
- `out/<login>/charts/` - Generated SVG charts

## Key Types

**Error Handling** (`src/errors.ts`): Uses classified error types (`network`, `auth`, `not_found`, `analysis`, `cli`) with user-friendly messages.

**Profile Metrics** (`src/types/profile.ts`): Main output structure containing skills, UOI, Grit Factor, Fork Destiny, Community Engagement, Contribution Momentum, etc.

## Development Notes

- The CLI entry point isunt.ts`
- `bin/devh GraphQL queries are in `src/queries/*.graphql`
- Tests use Bun's built-in test runner (`bun test`)
- Frontend uses Tailwind CSS v4, Radix UI primitives, and Recharts
- AI narrative supports multiple LLM providers (OpenAI, Claude, DeepSeek, Qwen, Ollama)
