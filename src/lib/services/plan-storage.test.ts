import { describe, expect, it } from "vitest";

import { parsePlan } from "./plan-storage";

const lastKnownPosition = {
  coords: { latitude: 52.2317, longitude: 21.0059 },
  recordedAt: "2026-10-03T12:00:00.000Z",
};

const validPlan = {
  schemaVersion: 2,
  places: {
    meeting: { label: "Plac przed domem", coords: { latitude: 52.2297, longitude: 21.0122 } },
    backup: { label: "Park", coords: { latitude: 52.2301, longitude: 21.0144 } },
    shelter: { label: "Szkoła", coords: { latitude: 52.241, longitude: 21.0202 } },
  },
  lastKnownPosition,
  updatedAt: "2026-10-03T12:00:00.000Z",
};

describe("parsePlan", () => {
  it("keeps a valid plan unchanged", () => {
    expect(parsePlan(validPlan)).toEqual(validPlan);
  });

  it("returns an empty plan for a non-object or an unknown schema version", () => {
    for (const value of [null, "plan", 42, { ...validPlan, schemaVersion: 3 }, { ...validPlan, schemaVersion: "2" }]) {
      const plan = parsePlan(value);
      expect(plan.schemaVersion).toBe(2);
      expect(plan.places).toEqual({ meeting: null, backup: null, shelter: null });
      expect(plan.lastKnownPosition).toBeNull();
    }
  });

  it("drops a place without valid coordinates and keeps the other two", () => {
    const broken = [
      { label: "a" },
      "foo",
      { label: "a", coords: { latitude: "52", longitude: 21 } },
      { label: "a", coords: { latitude: null, longitude: 21 } },
      { label: "a", coords: { latitude: 52, longitude: 200 } },
      { label: 7, coords: { latitude: 52, longitude: 21 } },
    ];
    for (const meeting of broken) {
      const plan = parsePlan({ ...validPlan, places: { ...validPlan.places, meeting } });
      expect(plan.places.meeting).toBeNull();
      expect(plan.places.backup).toEqual(validPlan.places.backup);
      expect(plan.places.shelter).toEqual(validPlan.places.shelter);
      expect(plan.lastKnownPosition).toEqual(lastKnownPosition);
    }
  });

  it("drops all three places when the places field itself is damaged", () => {
    for (const places of [null, "places", 42]) {
      expect(parsePlan({ ...validPlan, places }).places).toEqual({ meeting: null, backup: null, shelter: null });
    }
  });

  it("drops a last known position with a bad timestamp or coordinates", () => {
    const broken = [
      { coords: lastKnownPosition.coords, recordedAt: "wczoraj" },
      { coords: lastKnownPosition.coords },
      { coords: { latitude: 95, longitude: 21 }, recordedAt: lastKnownPosition.recordedAt },
    ];
    for (const value of broken) {
      const plan = parsePlan({ ...validPlan, lastKnownPosition: value });
      expect(plan.lastKnownPosition).toBeNull();
      expect(plan.places).toEqual(validPlan.places);
    }
  });

  it("migrates a v1 plan: the evacuation point becomes the shelter", () => {
    const evacuationPoint = { label: "Szkoła", coords: { latitude: 52.241, longitude: 21.0202 } };
    const plan = parsePlan({
      schemaVersion: 1,
      evacuationPoint,
      lastKnownPosition,
      updatedAt: "2026-10-01T08:00:00.000Z",
    });
    expect(plan).toEqual({
      schemaVersion: 2,
      places: { meeting: null, backup: null, shelter: evacuationPoint },
      lastKnownPosition,
      updatedAt: "2026-10-01T08:00:00.000Z",
    });
  });

  it("migrates a v1 plan with a damaged evacuation point to an empty shelter", () => {
    const plan = parsePlan({ schemaVersion: 1, evacuationPoint: { label: "Szkoła" }, lastKnownPosition });
    expect(plan.places).toEqual({ meeting: null, backup: null, shelter: null });
    expect(plan.lastKnownPosition).toEqual(lastKnownPosition);
  });
});
