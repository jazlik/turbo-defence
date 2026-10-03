import { describe, expect, it } from "vitest";

import { buildSteps } from "./evacuation-steps";
import { createEmptyNavigation } from "./services/navigation-storage";
import { resolveStepTarget, shelterAlternateAvailable, shelterFallbackContent } from "./step-target";
import type { HouseholdPlan, NavigationState, Place, SavedRoute } from "@/types";

const place = (label: string): Place => ({ label, coords: { latitude: 50.06, longitude: 19.94 } });

const plan = (shelter: Place | null): HouseholdPlan => ({
  schemaVersion: 4,
  places: { meeting: place("Plac"), backup: place("Park"), shelter },
  lastKnownPosition: null,
  members: [],
  contacts: [],
  packedItems: [],
  updatedAt: "2026-10-03T12:00:00.000Z",
});

const route = (id: string, label: string): SavedRoute => ({
  destination: { id, label, coords: { latitude: 50.07, longitude: 19.95 }, source: "psp" },
  origin: { latitude: 50.06, longitude: 19.94 },
  geometry: [
    [19.94, 50.06],
    [19.95, 50.07],
  ],
  distanceMeters: 1300,
  durationSeconds: 1000,
  createdAt: "2026-10-03T12:00:00.000Z",
  provider: "test",
});

const withRoutes: NavigationState = {
  ...createEmptyNavigation(),
  primary: route("A", "ul. A 1"),
  alternate: route("B", "ul. B 2"),
};

describe("resolveStepTarget", () => {
  it("leads the shelter step to PSP route A, and to route B after 'niedostępne'", () => {
    expect(resolveStepTarget("shelter", plan(place("Szkoła")), withRoutes, false)).toMatchObject({
      label: "ul. A 1",
      source: "psp",
      role: "primary",
    });
    expect(resolveStepTarget("shelter", plan(place("Szkoła")), withRoutes, true)).toMatchObject({
      label: "ul. B 2",
      role: "alternate",
    });
  });

  it("falls back to the manual shelter without a prepared route", () => {
    expect(resolveStepTarget("shelter", plan(place("Szkoła")), createEmptyNavigation(), false)).toMatchObject({
      label: "Szkoła",
      source: "manual",
      route: null,
    });
    expect(resolveStepTarget("shelter", plan(null), createEmptyNavigation(), false)).toBeNull();
  });

  it("keeps manual places for the meeting and backup steps", () => {
    expect(resolveStepTarget("meeting", plan(null), withRoutes, false)).toMatchObject({ label: "Plac", route: null });
    expect(resolveStepTarget("backup", plan(null), withRoutes, true)).toMatchObject({ label: "Park", route: null });
  });
});

describe("shelter fallback", () => {
  it("is available only with both routes", () => {
    expect(shelterAlternateAvailable(withRoutes)).toBe(true);
    expect(shelterAlternateAvailable({ ...withRoutes, alternate: null })).toBe(false);
  });

  it("renames the shelter step while route B is active", () => {
    const shelter = buildSteps(plan(null), { shelterRoute: true }).find((step) => step.id === "shelter");
    if (!shelter) throw new Error("missing shelter step");
    const onB = resolveStepTarget("shelter", plan(null), withRoutes, true);
    expect(shelterFallbackContent(shelter, onB)?.title).toBe("Idź do zapasowego schronu");
    expect(shelterFallbackContent(shelter, resolveStepTarget("shelter", plan(null), withRoutes, false))).toBeNull();
  });
});
