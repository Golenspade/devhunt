import { describe, expect, it } from "bun:test";
import {
  resolveTimezone,
  localHourAt,
  offsetMinutesAt,
  type TimezoneInput,
  type TimezoneTarget
} from "./timezone";

describe("resolveTimezone", () => {
  it("defaults absent input to UTC as a fixed zero offset", () => {
    expect(resolveTimezone()).toEqual({ id: "+00:00", offsetMinutes: 0 });
    expect(resolveTimezone(undefined)).toEqual({ id: "+00:00", offsetMinutes: 0 });
  });

  it("normalizes case-insensitive UTC and GMT aliases", () => {
    expect(resolveTimezone("utc")).toEqual({ id: "UTC", offsetMinutes: 0 });
    expect(resolveTimezone("gMt")).toEqual({ id: "UTC", offsetMinutes: 0 });
  });

  it("accepts fixed offsets within the civil bounds", () => {
    expect(resolveTimezone("+14:00")).toEqual({ id: "+14:00", offsetMinutes: 840 });
    expect(resolveTimezone("-14:00")).toEqual({ id: "-14:00", offsetMinutes: -840 });
    expect(resolveTimezone("+00:30")).toEqual({ id: "+00:30", offsetMinutes: 30 });
    expect(resolveTimezone(330)).toEqual({ id: "+05:30", offsetMinutes: 330 });
  });

  it("rejects malformed and out-of-range fixed offsets", () => {
    for (const value of ["+14:01", "-14:01", "+15:00", "+1:00", "+01:0", "+01:60", "01:00", " +01:00"]) {
      expect(() => resolveTimezone(value)).toThrow();
    }
  });

  it("canonicalizes IANA identifiers and aliases through Intl", () => {
    const ny = resolveTimezone("America/New_York");
    expect(ny).toEqual({ id: "America/New_York", timeZone: "America/New_York" });
    const alias = resolveTimezone("US/Eastern");
    const runtimeCanonicalAlias = new Intl.DateTimeFormat("en-US", { timeZone: "US/Eastern" }).resolvedOptions().timeZone;
    expect(alias).toEqual({ id: runtimeCanonicalAlias, timeZone: runtimeCanonicalAlias });
  });

  it("rejects unsupported IANA names", () => {
    expect(() => resolveTimezone("Mars/Olympus")).toThrow();
    expect(() => resolveTimezone("" )).toThrow();
  });

  it("converts fixed offsets arithmetically and returns null for invalid timestamps", () => {
    const target = resolveTimezone("+08:00");
    const normalizedInput: TimezoneInput = target;
    const legacyInput: TimezoneInput = 480;
    expect(normalizedInput).toBe(target);
    expect(legacyInput).toBe(480);
    expect(localHourAt("2024-01-01T20:30:00Z", target)).toBe(4);
    expect(localHourAt("not-a-date", target)).toBeNull();
  });

  it("extracts IANA local hour at the event instant across spring DST", () => {
    const target = resolveTimezone("America/New_York");
    expect(localHourAt("2024-03-10T06:59:00Z", target)).toBe(1);
    expect(localHourAt("2024-03-10T07:01:00Z", target)).toBe(3);
  });

  it("extracts IANA local hour at the event instant across fall DST", () => {
    const target = resolveTimezone("America/New_York");
    expect(localHourAt("2024-11-03T05:59:00Z", target)).toBe(1);
    expect(localHourAt("2024-11-03T06:01:00Z", target)).toBe(1);
  });

  it("reports the offset at the requested instant for compatibility callers", () => {
    const target: TimezoneTarget = resolveTimezone("America/New_York");
    expect(offsetMinutesAt("2024-03-10T06:59:00Z", target)).toBe(-300);
    expect(offsetMinutesAt("2024-03-10T07:01:00Z", target)).toBe(-240);
    expect(offsetMinutesAt("2024-11-03T05:59:00Z", target)).toBe(-240);
    expect(offsetMinutesAt("2024-11-03T06:01:00Z", target)).toBe(-300);
  });
});
