# Explicit Timezone Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `--tz` accept GMT/UTC aliases, valid fixed offsets, and runtime-supported IANA zones, then use the selected zone at each PR or commit event time.

**Architecture:** Add a shared timezone resolver that validates and normalizes user input into either a fixed-offset target or a canonical IANA target. Analysis resolves the override once and passes the target to date-aware hour conversion helpers. Keep numeric-minute inputs working for existing exported analysis helpers; retain the profile timezone keys while recording the normalized target in `timezone.used`.

**Tech Stack:** TypeScript, Bun tests, built-in `Intl.DateTimeFormat` and `Date` APIs.

## Global Constraints

- Follow `docs/superpowers/specs/2026-09-25-timezone-conversion-design.md` as the approved behavior contract.
- Do not add a timezone dependency, network lookup, timezone inference, Launch page changes, or new profile fields.
- Treat timestamps as UTC instants and convert each event independently. Use PR `createdAt` for hours and non-merge commit `authoredAt` for night ratio.
- Keep numeric-minute inputs valid for `computeHoursHistogram` and `computeNightRatio`, and keep the existing numeric-offset form of `buildTimezone` callable; never use one numeric offset to calculate an IANA event series.
- Keep the existing `timezone.auto`, `timezone.override`, and `timezone.used` keys. Preserve the raw override; report `+00:00` when no override is supplied and the normalized identifier when one is supplied.
- Use the same parser for CLI validation and analysis so unsupported values cannot pass one layer and silently become UTC in another.

---

### Task 1: Add a shared timezone target resolver

**Files:** `src/timezone.ts` (new), `src/timezone.test.ts` (new)

- [ ] Write resolver tests first for absent input, case-insensitive GMT/UTC aliases, valid fixed offsets, invalid offset shapes/ranges, canonical IANA IDs and aliases, and invalid IANA names.
- [ ] Define and export `TimezoneTarget` as a fixed-offset target (`id`, `offsetMinutes`) or IANA target (`id`, canonical `timeZone`), plus a `TimezoneInput` union that also accepts legacy numeric-minute values where analysis helpers need it.
- [ ] Implement `resolveTimezone(input)` so absent input resolves to the existing default `+00:00`; GMT/UTC aliases normalize to `UTC`; fixed offsets accept only `±HH:mm`, from `-14:00` through `+14:00`; other values are validated and canonicalized by `Intl.DateTimeFormat(...).resolvedOptions().timeZone`.
- [ ] Implement a cached local-hour conversion helper that accepts an ISO timestamp and target, returns `null` for an invalid timestamp, shifts fixed offsets arithmetically, and extracts the IANA local hour for the timestamp with `formatToParts` and an `h23` hour cycle.
- [ ] Add an offset-at-instant helper for compatibility callers that need a single offset snapshot; test New York's offset changing from -05:00 to -04:00 at spring DST and from -04:00 to -05:00 at fall DST. Do not use this snapshot for event calculations in an IANA zone.
- [ ] Run `bun test src/timezone.test.ts`; require all resolver, bounds, canonicalization, and spring/fall DST transition cases to pass.

### Task 2: Make metric calculations consume a timezone target

**Files:** `src/analysis/metrics.ts`, `src/analyze.ts`, `src/analyze.test.ts`

- [ ] Add tests showing fixed-offset results stay unchanged and an IANA target places PRs immediately before and after the New York spring DST transition into local hours 1 and 3.
- [ ] Add night-ratio coverage using commit `authoredAt` at 09:00Z in both winter and summer (New York 04:00 versus 05:00 local) so DST changes the night/day classification; keep merge commits excluded.
- [ ] Update `computeHoursHistogram` and `computeNightRatio` to accept `TimezoneInput` and call the shared local-hour helper for each valid event. Keep their existing numeric-minute call form working.
- [ ] Update the public wrappers and API comments in `src/analyze.ts`; export the timezone input/target types and resolver for callers that need to pass a normalized target.
- [ ] Keep `parseTimezoneOffset` as a compatibility helper for callers requesting one numeric offset, backed by the shared parser and offset-at-instant helper. Make invalid names/offsets throw instead of returning zero silently, and document that its IANA result is only a snapshot.
- [ ] Run `bun test src/timezone.test.ts src/analyze.test.ts`; require legacy numeric helper tests and new IANA metric tests to pass.

### Task 3: Resolve once in the analysis pipeline and report the normalized target

**Files:** `src/analysis/index.ts`, `src/analysis/metrics.ts`, `src/analyze.test.ts`, `src/types/profile.ts`

- [ ] Add integration tests for default UTC, explicit GMT/UTC aliases, a fixed offset, and an IANA zone; verify `hoursHistogram`, night ratio, raw `timezone.override`, and normalized `timezone.used` together.
- [ ] Resolve `tzOverride` once in `analyzeAll` and pass the same target to the PR histogram, commit night ratio, and timezone metadata builder.
- [ ] Update `buildTimezone` to keep the existing object shape and numeric-offset call form, preserve the raw override, use `+00:00` for the unconfigured default, and record the normalized identifier for configured targets (`UTC`, fixed offset, or canonical IANA name).
- [ ] Update the `ProfileJSON.timezone` comment to distinguish the unimplemented `auto` field from explicit override and normalized `used` value.
- [ ] Run `bun test src/analyze.test.ts`; verify default-UTC calculations are unchanged and IANA `timezone.used` is not collapsed to a single offset.

### Task 4: Unify CLI validation with timezone parsing

**Files:** `src/cli.ts`, `bin/devhunt.test.ts`

- [ ] Add CLI parsing tests for UTC/GMT aliases, a boundary fixed offset, a valid IANA alias, an out-of-range offset, and an unsupported zone.
- [ ] Replace `validateTimezone`'s format-only regex/warning path with the shared resolver; surface a concise validation error that names the bad value and shows the accepted forms.
- [ ] Keep the `--tz` argument value in `CLIOptions` unchanged so `timezone.override` preserves exactly what the caller supplied.
- [ ] Confirm invalid values fail during argument parsing and cannot reach report generation with a UTC fallback.
- [ ] Run `bun test bin/devhunt.test.ts`.

### Task 5: Document accepted values and metadata behavior

**Files:** `docs/cli-params.md`, `src/cli.ts`, `src/analyze.ts`

- [ ] Update `report --tz` documentation with case-insensitive GMT/UTC aliases, the `±HH:mm` bounds, runtime-supported IANA identifiers, and per-event DST-aware conversion.
- [ ] Replace the stale “default/inference” description with the actual default: UTC (`+00:00`) when `--tz` is omitted; no timezone is inferred.
- [ ] Document invalid timezone errors and explain that `profile.json` keeps its existing timezone keys while `used` stores the normalized target; a named IANA zone does not have one report-wide numeric offset.
- [ ] Update API comments/examples for `parseTimezoneOffset` and the timezone-aware metric arguments so callers understand the fixed-offset compatibility path and IANA snapshot limitation.

### Task 6: Run focused and full verification

**Files:** no new files; review all files above.

- [ ] Run `bun test src/timezone.test.ts src/analyze.test.ts bin/devhunt.test.ts` and address failures.
- [ ] Run the complete `bun test` suite.
- [ ] Run `bunx tsc --noEmit`; require a zero exit code.
- [ ] Review that tests cover both DST transitions (offset changes in opposite directions), UTC/GMT equivalence, fixed-offset boundaries, invalid zones, unchanged default UTC behavior, CLI rejection, and `profile.json` metadata.
- [ ] Review the diff for stale automatic-inference comments and ensure the profile JSON shape and existing numeric-minute call sites remain compatible.

## Acceptance Mapping

| Approved criterion | Implementation / verification |
| --- | --- |
| UTC/GMT aliases match UTC | Tasks 1, 3, and 4 tests |
| Fixed offsets preserve arithmetic and reject out-of-range values | Tasks 1 and 2 tests |
| PR and commit events use IANA rules at their own timestamps | Tasks 1 and 2 tests |
| Both DST transitions use the correct active offset | Task 1 offset tests plus Task 2 metric tests |
| Missing `--tz` keeps existing UTC results | Task 3 integration tests |
| Invalid zones fail clearly | Tasks 1 and 4 tests |
| Existing profile keys retain override and normalized target | Task 3 integration tests |
