import { describe, expect, it } from "vitest";

import { parseSensors, sensorsReady, type SensorCheckState } from "./sensor-storage";

const valid: SensorCheckState = {
  schemaVersion: 1,
  checkedAt: "2026-10-04T10:00:00.000Z",
  location: "working",
  compass: "working",
};

describe("parseSensors", () => {
  it("keeps a valid state unchanged", () => {
    expect(parseSensors(valid)).toEqual(valid);
  });

  it("reads a non-object, an unknown schema version and a bad date as not checked", () => {
    expect(parseSensors(null)).toBeNull();
    expect(parseSensors("x")).toBeNull();
    expect(parseSensors({ ...valid, schemaVersion: 2 })).toBeNull();
    expect(parseSensors({ ...valid, checkedAt: "wczoraj" })).toBeNull();
    expect(parseSensors({ ...valid, checkedAt: 5 })).toBeNull();
  });

  it("reads an unknown outcome as not checked", () => {
    expect(parseSensors({ ...valid, location: "maybe" })).toBeNull();
    expect(parseSensors({ ...valid, compass: undefined })).toBeNull();
  });
});

describe("sensorsReady", () => {
  it("needs working location", () => {
    expect(sensorsReady(valid)).toBe(true);
    expect(sensorsReady({ ...valid, location: "denied" })).toBe(false);
    expect(sensorsReady({ ...valid, location: "unavailable" })).toBe(false);
  });

  it("accepts a missing compass but not a refused one", () => {
    expect(sensorsReady({ ...valid, compass: "unavailable" })).toBe(true);
    expect(sensorsReady({ ...valid, compass: "denied" })).toBe(false);
  });
});
