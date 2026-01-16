# Code Style and Conventions

## TypeScript Guidelines

### Type Hints
- Always use explicit TypeScript types for function parameters and return values
- Use `interface` for object shapes, `type` for unions/intersections
- Export types that are used across modules

### Docstrings
- Use JSDoc comments for public APIs with `@param` and `@returns`
- Include design rationale in comments for complex logic
- Example:
```typescript
/**
 * Description of the function.
 * @param paramName - Description of the parameter
 * @returns Description of the return value
 */
```

## Naming Conventions
- **Files**: kebab-case for files (`scan.ts`, `user-repos.graphql`)
- **Classes/P Interfaces**: PascalCase (`GitHubNotFoundError`, `ScanOptions`)
- **Functions/variables**: camelCase (`scanUser`, `fetchAllRepos`)
- **Constants**: SCREAMING_SNAKE_CASE (`DEFAULT_WINDOW`, `MAX_RETRY_COUNT`)
- **Private members**: prefix with underscore `_privateMethod`

## Error Handling
- Use classified error types from `src/errors.ts`
- Error kinds: `network`, `auth`, `not_found`, `analysis`, `cli`, `unknown`
- Throw `DevhuntError` subclasses with kind and message

## Code Organization
- Keep related functionality in dedicated modules
- Use barrel exports (`src/types/index.ts`) for clean imports
- Separate concerns: scan, analyze, export, agent modules

## Frontend Specific (Next.js)
- Use React hooks (`useState`, `useEffect`, `useCallback`)
- Component files: PascalCase (`ContributionCalendar.tsx`)
- Use Server Components where possible, Client Components with `'use client'`
- Tailwind CSS classes for styling
- Radix UI primitives for accessible components
