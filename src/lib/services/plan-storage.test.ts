import { describe, expect, it } from "vitest";

import { parsePlan } from "./plan-storage";

const validPlan = {
  schemaVersion: 1,
  evacuationPoint: { label: "Szkoła", coords: { latitude: 52.2297, longitude: 21.0122 } },
  lastKnownPosition: { coords: { latitude: 52.2317, longitude: 21.0059 }, recordedAt: "2026-10-03T12:00:00.000Z" },
  updatedAt: "2026-10-03T12:00:00.000Z",
};

describe("parsePlan", () => {
  it("keeps a valid plan unchanged", () => {
    expect(parsePlan(validPlan)).toEqual(validPlan);
  });

  it("returns an empty plan for a non-object or an unknown schema version", () => {
    for (const value of [null, "plan", 42, { ...validPlan, schemaVersion: 2 }]) {
      const plan = parsePlan(value);
      expect(plan.schemaVersion).toBe(1);
      expect(plan.evacuationPoint).toBeNull();
      expect(plan.lastKnownPosition).toBeNull();
    }
  });

  it("drops an evacuation point without valid coordinates", () => {
    const broken = [
      { label: "a" },
      "foo",
      { label: "a", coords: { latitude: "52", longitude: 21 } },
      { label: "a", coords: { latitude: null, longitude: 21 } },
      { label: "a", coords: { latitude: 52, longitude: 200 } },
      { label: 7, coords: { latitude: 52, longitude: 21 } },
    ];
    for (const evacuationPoint of broken) {
      const plan = parsePlan({ ...validPlan, evacuationPoint });
      expect(plan.evacuationPoint).toBeNull();
      expect(plan.lastKnownPosition).toEqual(validPlan.lastKnownPosition);
    }
  });

  it("drops a last known position with a bad timestamp or coordinates", () => {
    const broken = [
      { coords: validPlan.lastKnownPosition.coords, recordedAt: "wczoraj" },
      { coords: validPlan.lastKnownPosition.coords },
      { coords: { latitude: 95, longitude: 21 }, recordedAt: validPlan.lastKnownPosition.recordedAt },
    ];
    for (const lastKnownPosition of broken) {
      const plan = parsePlan({ ...validPlan, lastKnownPosition });
      expect(plan.lastKnownPosition).toBeNull();
      expect(plan.evacuationPoint).toEqual(validPlan.evacuationPoint);
    }
  });
});
