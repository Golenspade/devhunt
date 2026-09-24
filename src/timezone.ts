export type FixedOffsetTimezoneTarget = {
  id: string;
  offsetMinutes: number;
};

export type IanaTimezoneTarget = {
  id: string;
  timeZone: string;
};

export type TimezoneTarget = FixedOffsetTimezoneTarget | IanaTimezoneTarget;
export type TimezoneInput = string | number | null | undefined;

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? "-" : "+";
  const absolute = Math.abs(offsetMinutes);
  const hours = Math.floor(absolute / 60).toString().padStart(2, "0");
  const minutes = (absolute % 60).toString().padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
}

function fixedOffset(offsetMinutes: number): FixedOffsetTimezoneTarget {
  if (!Number.isInteger(offsetMinutes) || Math.abs(offsetMinutes) > 14 * 60) {
    throw new RangeError(`Invalid timezone offset: ${offsetMinutes}`);
  }
  return { id: formatOffset(offsetMinutes), offsetMinutes };
}

/** Parse and normalize explicit timezone input. Missing input preserves UTC behavior. */
export function resolveTimezone(input?: TimezoneInput): TimezoneTarget {
  if (input === undefined || input === null) {
    return fixedOffset(0);
  }
  if (typeof input === "number") {
    return fixedOffset(input);
  }

  if (/^(?:utc|gmt)$/i.test(input)) {
    return { id: "UTC", offsetMinutes: 0 };
  }

  const offsetMatch = /^([+-])(\d{2}):(\d{2})$/.exec(input);
  if (offsetMatch) {
    const hours = Number(offsetMatch[2]);
    const minutes = Number(offsetMatch[3]);
    if (minutes > 59 || hours > 14 || (hours === 14 && minutes !== 0)) {
      throw new RangeError(`Invalid timezone offset: ${input}`);
    }
    const sign = offsetMatch[1] === "-" ? -1 : 1;
    return fixedOffset(sign * (hours * 60 + minutes));
  }

  try {
    const timeZone = new Intl.DateTimeFormat("en-US", { timeZone: input }).resolvedOptions().timeZone;
    return { id: timeZone, timeZone };
  } catch {
    throw new RangeError(`Invalid timezone: ${input}. Use UTC, GMT, ±HH:mm, or a supported IANA timezone.`);
  }
}

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      hourCycle: "h23"
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

/** Convert an ISO timestamp to its local hour in the target timezone. */
export function localHourAt(isoTimestamp: string, target: TimezoneTarget): number | null {
  const instant = new Date(isoTimestamp);
  if (!Number.isFinite(instant.getTime())) return null;

  if ("offsetMinutes" in target) {
    return new Date(instant.getTime() + target.offsetMinutes * 60_000).getUTCHours();
  }

  const hourPart = getFormatter(target.timeZone)
    .formatToParts(instant)
    .find((part) => part.type === "hour");
  if (!hourPart) return null;
  const hour = Number(hourPart.value);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
}

/** Return one offset snapshot, in minutes east of UTC, for compatibility callers. */
export function offsetMinutesAt(isoTimestamp: string, target: TimezoneTarget): number | null {
  const instant = new Date(isoTimestamp);
  const timestamp = instant.getTime();
  if (!Number.isFinite(timestamp)) return null;
  if ("offsetMinutes" in target) return target.offsetMinutes;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: target.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
  const parts = Object.fromEntries(formatter.formatToParts(instant).map(({ type, value }) => [type, value]));
  const localAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return (localAsUtc - Math.floor(timestamp / 1000) * 1000) / 60_000;
}
