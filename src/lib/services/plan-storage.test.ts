import { describe, expect, it } from "vitest";

import { parsePlan } from "./plan-storage";

const validPlan = {
  schemaVersion: 2,
  evacuationPoint: { label: "Szkoła", coords: { latitude: 52.2297, longitude: 21.0122 } },
  lastKnownPosition: { coords: { latitude: 52.2317, longitude: 21.0059 }, recordedAt: "2026-10-03T12:00:00.000Z" },
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
    for (const value of [null, "plan", 42, { ...validPlan, schemaVersion: 3 }]) {
      const plan = parsePlan(value);
      expect(plan.schemaVersion).toBe(2);
      expect(plan.evacuationPoint).toBeNull();
      expect(plan.lastKnownPosition).toBeNull();
      expect(plan.members).toEqual([]);
      expect(plan.contacts).toEqual([]);
    }
  });

  it("migrates a v1 plan keeping the evacuation point and position, with empty people lists", () => {
    const { members: _members, contacts: _contacts, ...rest } = validPlan;
    const plan = parsePlan({ ...rest, schemaVersion: 1 });
    expect(plan.schemaVersion).toBe(2);
    expect(plan.evacuationPoint).toEqual(validPlan.evacuationPoint);
    expect(plan.lastKnownPosition).toEqual(validPlan.lastKnownPosition);
    expect(plan.members).toEqual([]);
    expect(plan.contacts).toEqual([]);
  });

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

describe("parsePlan needs", () => {
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
    const many = Array.from({ length: 30 }, (_, i) => ({ kind: "custom", label: `n${i}` }));
    expect(
      parsePlan({ ...validPlan, members: [{ ...validPlan.members[0], needs: many }] }).members[0]?.needs,
    ).toHaveLength(10);
  });

  it("reads a member without needs as having none", () => {
    const { needs: _needs, ...rest } = validPlan.members[0] as Record<string, unknown>;
    expect(parsePlan({ ...validPlan, members: [rest] }).members[0]?.needs).toEqual([]);
  });
});
