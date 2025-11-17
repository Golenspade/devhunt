import { describe, it, expect } from "bun:test";
import { parseEmailInfo } from "./email";

describe("parseEmailInfo", () => {
  it("returns null domain for empty email", () => {
    expect(parseEmailInfo(null)).toEqual({ emailDomain: null, emailTld: "other" });
    expect(parseEmailInfo(undefined)).toEqual({ emailDomain: null, emailTld: "other" });
  });

  it("parses normal domain and lowercases it", () => {
    expect(parseEmailInfo("User@Example.Com")).toEqual({
      emailDomain: "example.com",
      emailTld: "other",
    });
  });

  it("classifies .edu/.gov/.org correctly", () => {
    expect(parseEmailInfo("alice@mit.edu")).toEqual({
      emailDomain: "mit.edu",
      emailTld: ".edu",
    });

    expect(parseEmailInfo("bob@whitehouse.gov")).toEqual({
      emailDomain: "whitehouse.gov",
      emailTld: ".gov",
    });

    expect(parseEmailInfo("charlie@nonprofit.org")).toEqual({
      emailDomain: "nonprofit.org",
      emailTld: ".org",
    });
  });

  it("handles malformed emails gracefully", () => {
    expect(parseEmailInfo("no-at-symbol")).toEqual({
      emailDomain: null,
      emailTld: "other",
    });

    expect(parseEmailInfo("@nodomain")).toEqual({
      emailDomain: "nodomain",
      emailTld: "other",
    });
  });
});

