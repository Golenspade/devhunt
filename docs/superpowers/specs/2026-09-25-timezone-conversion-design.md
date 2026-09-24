# Explicit Timezone Conversion

Date: 2026-09-25

Status: Approved in conversation; awaiting review of this written specification.

## Problem

DevHunt accepts `--tz`, but the current analysis resolves only numeric offsets and `Asia/Shanghai`. Other values silently fall back to UTC. The report calculations apply one fixed offset to every event, so they cannot represent IANA time zones whose offsets change with daylight saving time. GitHub timestamps are stored as UTC instants; this feature converts those instants into a timezone explicitly selected by the user. It does not infer the user's location or timezone.

## Goals

- Accept `UTC` and `GMT` as case-insensitive aliases for UTC.
- Continue accepting fixed offsets in `±HH:mm` form.
- Accept valid IANA timezone identifiers supported by the runtime, including aliases that `Intl` resolves.
- Convert each event using the selected zone's rules at that event's timestamp, including daylight saving changes.
- Apply the same selected zone to PR activity hours and commit night-ratio calculations.
- Reject malformed or unsupported timezone input instead of silently using UTC.
- Keep the existing `timezone` object keys in `profile.json`.

## Non-goals

- Inferring a timezone from commit activity, account location, or network geolocation.
- Changing how timestamps are collected or stored.
- Adding a timezone package or making changes to the Launch page.

## User-visible behavior

| Input | Normalized timezone | Conversion behavior |
| --- | --- | --- |
| No `--tz` | `+00:00` | Existing UTC behavior |
| `--tz GMT` or `--tz UTC` (any letter case) | `UTC` | Zero-offset conversion |
| `--tz +08:00` | `+08:00` | Fixed-offset conversion |
| `--tz Asia/Shanghai` | Runtime-canonical IANA identifier | Convert using the zone rules for each event |
| `--tz America/New_York` | Runtime-canonical IANA identifier | Apply the offset in effect at each event, including DST |
| Invalid offset or unsupported IANA name | None | CLI returns a clear validation error |

Fixed offsets are limited to the civil range `-14:00` through `+14:00`; minutes must be `00` through `59`, and the `14` hour boundary permits only `:00`.

## Design

Timezone input is parsed once into a normalized target. `GMT` and `UTC` normalize to `UTC`; valid IANA names are canonicalized with `Intl.DateTimeFormat(...).resolvedOptions().timeZone`; fixed offsets remain fixed offsets. The CLI validator and analysis parser use the same rules so invalid values cannot pass validation and later fall back silently.

For fixed offsets, local time is calculated by shifting the event instant by the offset. For IANA zones, a cached `Intl.DateTimeFormat` extracts the local hour for the exact event instant. PR histograms use each PR's `createdAt`; the night-ratio metric uses each non-merge commit's `authoredAt`. The rest of the analysis pipeline continues to consume the resulting local-hour values.

`profile.json` retains `timezone.auto`, `timezone.override`, and `timezone.used`. `auto` remains `+00:00`, because automatic inference is outside this feature. `override` preserves the supplied value. `used` records the normalized target: canonical IANA identifier, fixed offset, or `UTC`. A single numeric offset is not reported for an IANA zone because it can vary over the report's event dates.

## Error handling and compatibility

Invalid fixed offsets and unsupported IANA identifiers fail during CLI validation with a message naming the invalid value and showing accepted forms. Analysis helpers also reject invalid timezone input rather than treating it as UTC.

The `timezone` object keeps its current keys and value types. The meaning of `used` changes from a formatted offset to the normalized target timezone for named IANA zones; fixed offsets and UTC remain offset-like identifiers. Repository code does not otherwise consume this field, but external consumers of `profile.json` may need to accept IANA names there. Exported analysis helpers retain their current numeric-minute input for compatibility while also accepting a normalized timezone target; date-aware conversion for IANA zones uses a dedicated helper. The existing offset parser remains for callers that need a single numeric offset.

## Acceptance criteria

- `GMT`, `UTC`, and case variants produce the same hour buckets as UTC.
- Fixed offsets preserve their existing arithmetic behavior and reject out-of-range values.
- IANA zones convert PR and commit timestamps into local hours using the offset in effect at each timestamp.
- Events immediately before and after a DST transition are placed in their correct local-hour buckets.
- An absent `--tz` continues to produce the existing UTC results.
- Unsupported timezone names fail clearly and are not silently treated as UTC.
- `profile.json` records the explicit override and normalized target under the existing timezone keys.

## Verification scope

The implementation should be checked against the acceptance criteria above, with particular attention to UTC/GMT equivalence, fixed-offset boundaries, an IANA zone across both DST transitions, invalid names, and unchanged default-UTC behavior. No external timezone package or network lookup is required.
