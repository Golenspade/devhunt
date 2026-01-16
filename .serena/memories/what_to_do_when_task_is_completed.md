# What to Do When Task is Completed

## Before Submitting Changes

### 1. Run Tests
```bash
bun test
```
Ensure all existing tests pass and add tests for new functionality.

### 2. Type Check
```bash
bun run --bun tsc --noEmit
```
Fix any TypeScript errors before completing.

### 3. Lint (Frontend)
```bash
cd profile-json-analysis && pnpm lint
```
Fix any linting issues.

### 4. Verify Functionality
- Test the specific feature or fix that was implemented
- Check related functionality hasn't regressed

### 5. Review Changes
- Review your code changes for correctness
- Ensure no unintended modifications

## When Adding New Features
1. Add appropriate tests for new functionality
2. Update type definitions if needed
3. Document complex logic with comments
4. Update README.md if adding user-facing features

## When Fixing Bugs
1. Add regression tests if possible
2. Verify the fix resolves the original issue
3. Check for similar issues in related code

## Git Workflow
1. Stage relevant changes: `git add <files>`
2. Write clear commit message
3. Push if necessary for PR/review
