import { describe, expect, it } from "vitest";

import { parsePlan, parsePlanWithSource } from "./plan-storage";

const lastKnownPosition = {
  coords: { latitude: 52.2317, longitude: 21.0059 },
  recordedAt: "2026-10-03T12:00:00.000Z",
};

const validPlan = {
  schemaVersion: 3,
  places: {
    meeting: { label: "Plac przed domem", coords: { latitude: 52.2297, longitude: 21.0122 } },
    backup: { label: "Park", coords: { latitude: 52.2301, longitude: 21.0144 } },
    shelter: { label: "Szkoła", coords: { latitude: 52.241, longitude: 21.0202 } },
  },
  lastKnownPosition,
  members: [
    {
      id: "m1",
      name: "Ola",
      category: "child",
      needs: [{ kind: "medication" }, { kind: "custom", label: "insulina" }],
    },
  ],
  contacts: [{ id: "c1", name: "Babcia", phone: "+48 600 100 200", relation: "babcia" }],
  updatedAt: "2026-10-03T12:00:00.000Z",
};

describe("parsePlan", () => {
  it("keeps a valid plan unchanged", () => {
    expect(parsePlan(validPlan)).toEqual(validPlan);
  });

  it("returns an empty plan for a non-object or an unknown schema version", () => {
    for (const value of [null, "plan", 42, { ...validPlan, schemaVersion: 4 }, { ...validPlan, schemaVersion: "3" }]) {
      const plan = parsePlan(value);
      expect(plan.schemaVersion).toBe(3);
      expect(plan.places).toEqual({ meeting: null, backup: null, shelter: null });
      expect(plan.lastKnownPosition).toBeNull();
      expect(plan.members).toEqual([]);
      expect(plan.contacts).toEqual([]);
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
      schemaVersion: 3,
      places: { meeting: null, backup: null, shelter: evacuationPoint },
      lastKnownPosition,
      members: [],
      contacts: [],
      updatedAt: "2026-10-01T08:00:00.000Z",
    });
  });

  it("migrates a v2 plan keeping all three places and the position, with empty people lists", () => {
    const { members: _members, contacts: _contacts, ...rest } = validPlan;
    const plan = parsePlan({ ...rest, schemaVersion: 2 });
    expect(plan.schemaVersion).toBe(3);
    expect(plan.places).toEqual(validPlan.places);
    expect(plan.lastKnownPosition).toEqual(lastKnownPosition);
    expect(plan.members).toEqual([]);
    expect(plan.contacts).toEqual([]);
  });

  it("migrates a v1 plan with a damaged evacuation point to an empty shelter", () => {
    const plan = parsePlan({ schemaVersion: 1, evacuationPoint: { label: "Szkoła" }, lastKnownPosition });
    expect(plan.places).toEqual({ meeting: null, backup: null, shelter: null });
    expect(plan.lastKnownPosition).toEqual(lastKnownPosition);
  });
});

describe("parsePlan people lists", () => {
  it("skips damaged people records and keeps the rest", () => {
    const plan = parsePlan({
      ...validPlan,
      members: [
        validPlan.members[0],
        { id: "m2", name: "", category: "adult" },
        { id: "m3", name: "Kot", category: "robot" },
        { name: "Bez id", category: "adult" },
        "foo",
      ],
      contacts: [validPlan.contacts[0], { id: "c2", name: "Jan" }, { id: "c3", name: "Ewa", phone: "500 500 500" }],
    });
    expect(plan.members).toEqual(validPlan.members);
    expect(plan.contacts).toEqual([
      validPlan.contacts[0],
      { id: "c3", name: "Ewa", phone: "500 500 500", relation: "" },
    ]);
  });

  it("reads non-array people lists as empty", () => {
    const plan = parsePlan({ ...validPlan, members: "x", contacts: { a: 1 } });
    expect(plan.members).toEqual([]);
    expect(plan.contacts).toEqual([]);
  });

  it("skips damaged needs and caps the list", () => {
    const needs = [
      { kind: "diabetes" },
      { kind: "custom", label: "  wózek " },
      { kind: "custom", label: "" },
      { kind: "custom" },
      { kind: "robot" },
      "foo",
    ];
    const plan = parsePlan({ ...validPlan, members: [{ ...validPlan.members[0], needs }] });
    expect(plan.members[0]?.needs).toEqual([{ kind: "diabetes" }, { kind: "custom", label: "wózek" }]);
    const many = Array.from({ length: 30 }, (_, i) => ({ kind: "custom", label: `n${String(i)}` }));
    expect(
      parsePlan({ ...validPlan, members: [{ ...validPlan.members[0], needs: many }] }).members[0]?.needs,
    ).toHaveLength(10);
  });

  it("reads a member without needs as having none", () => {
    const { needs: _needs, ...rest } = validPlan.members[0] as Record<string, unknown>;
    expect(parsePlan({ ...validPlan, members: [rest] }).members[0]?.needs).toEqual([]);
  });
});

describe("parsePlanWithSource", () => {
  it("marks an unknown schema version as unreadable so no automatic write overwrites it", () => {
    for (const value of [null, "plan", 42, { ...validPlan, schemaVersion: 4 }, { ...validPlan, schemaVersion: "3" }]) {
      expect(parsePlanWithSource(value).source).toBe("unreadable");
    }
  });

  it("reports a readable plan as stored and a v1 plan as migrated", () => {
    expect(parsePlanWithSource(validPlan).source).toBe("stored");
    expect(parsePlanWithSource({ schemaVersion: 2, places: validPlan.places }).source).toBe("migrated");
    expect(parsePlanWithSource({ schemaVersion: 1, evacuationPoint: null }).source).toBe("migrated");
  });
});
