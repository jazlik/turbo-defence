import { describe, expect, it } from "vitest";

import { parseRun, RUN_FRESH_MS } from "./run-storage";

const now = Date.parse("2026-10-03T12:00:00.000Z");

const validRun = {
  schemaVersion: 1,
  stepId: "shelter",
  fallbackActive: true,
  startedAt: "2026-10-03T11:30:00.000Z",
  updatedAt: "2026-10-03T11:55:00.000Z",
};

const at = (offsetMs: number) => new Date(now - offsetMs).toISOString();

describe("parseRun", () => {
  it("keeps a run saved within the freshness window", () => {
    expect(parseRun(validRun, now)).toEqual(validRun);
  });

  it("accepts a run just inside the window and drops one just outside it", () => {
    expect(parseRun({ ...validRun, updatedAt: at(RUN_FRESH_MS - 1000) }, now)).not.toBeNull();
    expect(parseRun({ ...validRun, updatedAt: at(RUN_FRESH_MS) }, now)).toBeNull();
    expect(parseRun({ ...validRun, updatedAt: at(RUN_FRESH_MS + 60_000) }, now)).toBeNull();
  });

  it("returns null for a non-object or an unknown schema version", () => {
    const broken = [null, undefined, "run", 42, { ...validRun, schemaVersion: 2 }, { ...validRun, schemaVersion: "1" }];
    for (const value of broken) {
      expect(parseRun(value, now)).toBeNull();
    }
  });

  it("returns null for a damaged step id or fallback flag", () => {
    const broken = [
      { ...validRun, stepId: "" },
      { ...validRun, stepId: "   " },
      { ...validRun, stepId: 7 },
      { ...validRun, stepId: undefined },
      { ...validRun, fallbackActive: "true" },
      { ...validRun, fallbackActive: undefined },
    ];
    for (const value of broken) {
      expect(parseRun(value, now)).toBeNull();
    }
  });

  it("returns null for an unparsable timestamp", () => {
    const broken = [
      { ...validRun, updatedAt: "wczoraj" },
      { ...validRun, updatedAt: undefined },
      { ...validRun, startedAt: "przed chwilą" },
      { ...validRun, startedAt: 0 },
    ];
    for (const value of broken) {
      expect(parseRun(value, now)).toBeNull();
    }
  });
});
