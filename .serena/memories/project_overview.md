# DevHunt Project Overview

## Project Purpose
DevHunt is a Developer Intelligence Platform - a GitHub profile analysis tool that scans GitHub users and generates comprehensive developer profiles with metrics like skills, collaboration patterns, activity hours, and AI-generated narratives.

## Tech Stack
- **Runtime**: Bun >= 1.0
- **Language**: TypeScript
- **Frontend**: Next.js 16 with React 19, Tailwind CSS v4, Radix UI, Recharts
- **Package Manager**: pnpm (for frontend)
- **Testing**: Bun's built-in test runner (bun test)
- **Charts**: Vega-Lite

## Project Structure
```
devhunt/
├── bin/devhunt.ts          # CLI entry point
├── src/                    # Backend core
│   ├── scan.ts             # GitHub data fetching
│   ├── analyze.ts          # Profile analysis
│   ├── export.ts           # Report generation
│   ├── agent/              # AI narrative module
│   ├── analysis/           # Metrics computation
│   ├── queries/            # GraphQL queries
│   └── types/              # TypeScript interfaces
├── profile-json-analysis/  # Next.js frontend
│   ├── app/                # App Router pages & API routes
│   └── components/         # React components
└── out/                    # Output directory (generated data)
