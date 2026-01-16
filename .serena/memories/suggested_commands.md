# Suggested Commands for DevHunt

## Installation & Setup
```bash
# Full installation (dependencies + frontend)
./start.sh

# Quick start (skip dependency installation)
./dev.sh

# Build production version
./build.sh
```

## Development Commands

### Backend (Bun)
```bash
# Install backend dependencies
bun install

# Run tests
bun test

# Type check
bun run --bun tsc --noEmit

# Run CLI
bun devhunt scan <username> --token $GITHUB_TOKEN [--window quarter|half|year|3y|all]
bun devhunt report <username> [--tz Asia/Shanghai]
bun devhunt narrate <username> [--lang zh|en] [--style professional|casual|brief]
```

### Frontend (Next.js)
```bash
cd profile-json-analysis

# Install dependencies
pnpm install

# Dev server (port 3000)
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Lint
pnpm lint
```

## Git Commands (Darwin)
```bash
# View git status
git status

# View git diff
git diff

# Commit changes
git add . && git commit -m "message"

# View recent commits
git log --oneline -10
```

## File Operations
```bash
# List files
ls -la

# Find files by pattern
find . -name "*.ts" -type f

# Search in files
grep -r "search_term" --include="*.ts"
```
