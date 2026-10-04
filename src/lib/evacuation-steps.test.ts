import { describe, expect, it } from "vitest";

import { buildSteps, resumeIndex } from "./evacuation-steps";
import type { EvacuationRun, HouseholdPlan, Place } from "@/types";

const place = (label: string): Place => ({ label, coords: { latitude: 52.2297, longitude: 21.0122 } });

const planWith = (shelter: Place | null): HouseholdPlan => ({
  schemaVersion: 5,
  shelter,
  lastKnownPosition: null,
  members: [],
  contacts: [],
  packedItems: [],
  updatedAt: "2026-10-03T12:00:00.000Z",
});

const makeRun = (overrides: Partial<EvacuationRun> = {}): EvacuationRun => ({
  schemaVersion: 1,
  stepId: "shelter",
  fallbackActive: false,
  startedAt: "2026-10-03T12:00:00.000Z",
  updatedAt: "2026-10-03T12:00:00.000Z",
  ...overrides,
});

describe("buildSteps", () => {
  it("returns no steps at all when there is no destination", () => {
    expect(buildSteps(planWith(null))).toEqual([]);
  });

  it("builds the backpack step and then the own shelter", () => {
    const steps = buildSteps(planWith(place("Szkoła")));
    expect(steps.map((step) => step.id)).toEqual(["backpack", "shelter"]);
    expect(steps.map((step) => step.kind)).toEqual(["action", "navigate"]);
    expect(steps[1]?.title).toBe("Idź do schronu");
  });

  it("adds the shelter step for a saved PSP route even without an own shelter (S-04)", () => {
    expect(buildSteps(planWith(null), { shelterRoute: true }).map((step) => step.id)).toEqual(["backpack", "shelter"]);
  });
});

describe("resumeIndex", () => {
  it("finds the step the run points at", () => {
    expect(resumeIndex(buildSteps(planWith(place("Szkoła"))), makeRun())).toBe(1);
  });

  it("starts from the beginning for a step missing from the rebuilt sequence", () => {
    // A run saved before the meeting place was removed from the plan model.
    expect(resumeIndex(buildSteps(planWith(place("Szkoła"))), makeRun({ stepId: "meeting" }))).toBe(0);
    expect(resumeIndex(buildSteps(planWith(place("Szkoła"))), null)).toBe(0);
  });
});
