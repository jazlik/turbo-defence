import { describe, expect, it } from "vitest";

import { parsePlan, parsePlanWithSource } from "./plan-storage";

const lastKnownPosition = {
  coords: { latitude: 52.2317, longitude: 21.0059 },
  recordedAt: "2026-10-03T12:00:00.000Z",
};

const meeting = { label: "Plac przed domem", coords: { latitude: 52.2297, longitude: 21.0122 } };
const backup = { label: "Park", coords: { latitude: 52.2301, longitude: 21.0144 } };
const shelter = { label: "Szkoła", coords: { latitude: 52.241, longitude: 21.0202 } };

const validPlan = {
  schemaVersion: 5,
  shelter,
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
  packedItems: [
    { itemId: "water", quantity: 6 },
    { itemId: "radio", quantity: null },
  ],
  updatedAt: "2026-10-03T12:00:00.000Z",
};

const brokenPlaces = [
  { label: "a" },
  "foo",
  { label: "a", coords: { latitude: "52", longitude: 21 } },
  { label: "a", coords: { latitude: null, longitude: 21 } },
  { label: "a", coords: { latitude: 52, longitude: 200 } },
  { label: 7, coords: { latitude: 52, longitude: 21 } },
];

describe("parsePlan", () => {
  it("keeps a valid plan unchanged", () => {
    expect(parsePlan(validPlan)).toEqual(validPlan);
  });

  it("returns an empty plan for a non-object or an unknown schema version", () => {
    for (const value of [null, "plan", 42, { ...validPlan, schemaVersion: 6 }, { ...validPlan, schemaVersion: "5" }]) {
      const plan = parsePlan(value);
      expect(plan.schemaVersion).toBe(5);
      expect(plan.shelter).toBeNull();
      expect(plan.lastKnownPosition).toBeNull();
      expect(plan.members).toEqual([]);
      expect(plan.contacts).toEqual([]);
      expect(plan.packedItems).toEqual([]);
    }
  });

  it("drops a shelter without valid coordinates and keeps the rest of the plan", () => {
    for (const broken of brokenPlaces) {
      const plan = parsePlan({ ...validPlan, shelter: broken });
      expect(plan.shelter).toBeNull();
      expect(plan.lastKnownPosition).toEqual(lastKnownPosition);
      expect(plan.members).toEqual(validPlan.members);
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
      expect(plan.shelter).toEqual(shelter);
    }
  });
});

describe("parsePlan migration to one alarm target", () => {
  const v4 = (places: unknown) => {
    const { shelter: _shelter, ...rest } = validPlan;
    return { ...rest, schemaVersion: 4, places };
  };

  it("keeps the v4 shelter even when the meeting place is set", () => {
    const result = parsePlanWithSource(v4({ meeting, backup, shelter }));
    expect(result.source).toBe("migrated");
    expect(result.plan).toEqual(validPlan);
  });

  it("promotes the v4 meeting place, with its name, when there was no shelter", () => {
    expect(parsePlan(v4({ meeting, backup, shelter: null })).shelter).toEqual(meeting);
  });

  it("promotes the v4 backup place when it was the only one", () => {
    expect(parsePlan(v4({ meeting: null, backup, shelter: null })).shelter).toEqual(backup);
  });

  it("skips a damaged place and promotes the next one", () => {
    for (const broken of brokenPlaces) {
      expect(parsePlan(v4({ meeting, backup, shelter: broken })).shelter).toEqual(meeting);
      expect(parsePlan(v4({ meeting: broken, backup, shelter: null })).shelter).toEqual(backup);
    }
  });

  it("migrates a v4 plan without places to no shelter", () => {
    for (const places of [{ meeting: null, backup: null, shelter: null }, null, "places", 42]) {
      expect(parsePlan(v4(places)).shelter).toBeNull();
    }
  });

  it("migrates a v3 plan keeping the target, position, members and contacts, with no ticks", () => {
    const { packedItems: _packed, ...rest } = v4({ meeting, backup: null, shelter: null });
    const result = parsePlanWithSource({ ...rest, schemaVersion: 3 });
    expect(result.source).toBe("migrated");
    expect(result.plan).toEqual({ ...validPlan, shelter: meeting, packedItems: [] });
  });

  it("migrates a v2 plan keeping the target and the position, with empty people lists", () => {
    const plan = parsePlan({ schemaVersion: 2, places: { meeting: null, backup, shelter: null }, lastKnownPosition });
    expect(plan.schemaVersion).toBe(5);
    expect(plan.shelter).toEqual(backup);
    expect(plan.lastKnownPosition).toEqual(lastKnownPosition);
    expect(plan.members).toEqual([]);
    expect(plan.contacts).toEqual([]);
    expect(plan.packedItems).toEqual([]);
    expect(parsePlan({ schemaVersion: 2, places: { meeting, backup, shelter } }).shelter).toEqual(shelter);
  });

  it("migrates a v1 plan: the evacuation point becomes the shelter", () => {
    const plan = parsePlan({
      schemaVersion: 1,
      evacuationPoint: shelter,
      lastKnownPosition,
      updatedAt: "2026-10-01T08:00:00.000Z",
    });
    expect(plan).toEqual({
      schemaVersion: 5,
      shelter,
      lastKnownPosition,
      members: [],
      contacts: [],
      packedItems: [],
      updatedAt: "2026-10-01T08:00:00.000Z",
    });
  });

  it("migrates a v1 plan with a damaged evacuation point to no shelter", () => {
    const plan = parsePlan({ schemaVersion: 1, evacuationPoint: { label: "Szkoła" }, lastKnownPosition });
    expect(plan.shelter).toBeNull();
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

describe("parsePlan packed items", () => {
  it("skips damaged ticks and keeps the rest", () => {
    const plan = parsePlan({
      ...validPlan,
      packedItems: [
        validPlan.packedItems[0],
        { itemId: "", quantity: 1 },
        { itemId: "food", quantity: -1 },
        { itemId: "food", quantity: Infinity },
        { itemId: "food", quantity: "3" },
        { itemId: "food" },
        { quantity: 3 },
        "water",
        validPlan.packedItems[1],
      ],
    });
    expect(plan.packedItems).toEqual(validPlan.packedItems);
  });

  it("keeps the first record of a duplicated item", () => {
    const plan = parsePlan({
      ...validPlan,
      packedItems: [
        { itemId: "water", quantity: 6 },
        { itemId: "water", quantity: 27 },
      ],
    });
    expect(plan.packedItems).toEqual([{ itemId: "water", quantity: 6 }]);
  });

  it("reads a non-array list as empty", () => {
    expect(parsePlan({ ...validPlan, packedItems: { water: 6 } }).packedItems).toEqual([]);
  });
});

describe("parsePlanWithSource", () => {
  it("marks an unknown schema version as unreadable so no automatic write overwrites it", () => {
    for (const value of [null, "plan", 42, { ...validPlan, schemaVersion: 6 }, { ...validPlan, schemaVersion: "5" }]) {
      expect(parsePlanWithSource(value).source).toBe("unreadable");
    }
  });

  it("reports a readable plan as stored and older versions as migrated", () => {
    expect(parsePlanWithSource(validPlan).source).toBe("stored");
    expect(parsePlanWithSource({ schemaVersion: 4, places: { shelter } }).source).toBe("migrated");
    expect(parsePlanWithSource({ schemaVersion: 2, places: { meeting } }).source).toBe("migrated");
    expect(parsePlanWithSource({ schemaVersion: 1, evacuationPoint: null }).source).toBe("migrated");
  });
});
