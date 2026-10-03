import { describe, expect, it } from "vitest";

import { buildSteps, resumeIndex, stepContent, targetPlaceKind, type EvacuationStep } from "./evacuation-steps";
import type { EvacuationRun, HouseholdPlan, Place, PlaceKind } from "@/types";

const place = (label: string): Place => ({ label, coords: { latitude: 52.2297, longitude: 21.0122 } });

const planWith = (places: Partial<Record<PlaceKind, Place>>): HouseholdPlan => ({
  schemaVersion: 2,
  places: { meeting: places.meeting ?? null, backup: places.backup ?? null, shelter: places.shelter ?? null },
  lastKnownPosition: null,
  updatedAt: "2026-10-03T12:00:00.000Z",
});

const makeRun = (overrides: Partial<EvacuationRun> = {}): EvacuationRun => ({
  schemaVersion: 1,
  stepId: "meeting",
  fallbackActive: false,
  startedAt: "2026-10-03T12:00:00.000Z",
  updatedAt: "2026-10-03T12:00:00.000Z",
  ...overrides,
});

const fullPlan = planWith({ meeting: place("Plac"), backup: place("Park"), shelter: place("Szkoła") });

function navigateStep(steps: EvacuationStep[], id: string) {
  const step = steps.find((candidate) => candidate.id === id);
  if (step?.kind !== "navigate") throw new Error(`no navigate step ${id}`);
  return step;
}

describe("buildSteps", () => {
  it("builds the backpack step, the meeting place and the shelter in order", () => {
    expect(buildSteps(fullPlan).map((step) => step.id)).toEqual(["backpack", "meeting", "shelter"]);
    expect(buildSteps(fullPlan)[0]?.kind).toBe("action");
  });

  it("skips the meeting place when it is not set", () => {
    const steps = buildSteps(planWith({ shelter: place("Szkoła"), backup: place("Park") }));
    expect(steps.map((step) => step.id)).toEqual(["backpack", "shelter"]);
    expect(navigateStep(steps, "shelter").fallback).toBeNull();
  });

  it("skips the shelter when it is not set", () => {
    expect(buildSteps(planWith({ meeting: place("Plac") })).map((step) => step.id)).toEqual(["backpack", "meeting"]);
  });

  it("returns no steps at all when no destination is set", () => {
    expect(buildSteps(planWith({}))).toEqual([]);
    expect(buildSteps(planWith({ backup: place("Park") }))).toEqual([]);
  });

  it("offers the backup place only on the meeting step and only when it is set", () => {
    expect(navigateStep(buildSteps(fullPlan), "meeting").fallback).toBe("backup");
    expect(navigateStep(buildSteps(fullPlan), "shelter").fallback).toBeNull();
    const withoutBackup = planWith({ meeting: place("Plac"), shelter: place("Szkoła") });
    expect(navigateStep(buildSteps(withoutBackup), "meeting").fallback).toBeNull();
  });
});

describe("resumeIndex", () => {
  it("finds the step the run points at", () => {
    expect(resumeIndex(buildSteps(fullPlan), makeRun({ stepId: "shelter" }))).toBe(2);
  });

  it("starts from the beginning for a step missing from the rebuilt sequence", () => {
    expect(resumeIndex(buildSteps(planWith({ shelter: place("Szkoła") })), makeRun({ stepId: "meeting" }))).toBe(0);
    expect(resumeIndex(buildSteps(fullPlan), null)).toBe(0);
  });
});

describe("targetPlaceKind", () => {
  it("resolves the backup place while the fallback is active", () => {
    const meeting = navigateStep(buildSteps(fullPlan), "meeting");
    expect(targetPlaceKind(meeting, makeRun({ fallbackActive: true }))).toBe("backup");
    expect(targetPlaceKind(meeting, makeRun())).toBe("meeting");
  });

  it("ignores an active fallback on a step that has none", () => {
    const shelter = navigateStep(buildSteps(fullPlan), "shelter");
    expect(targetPlaceKind(shelter, makeRun({ stepId: "shelter", fallbackActive: true }))).toBe("shelter");
  });

  it("has no target for an action step", () => {
    const backpack = buildSteps(fullPlan)[0];
    expect(targetPlaceKind(backpack, makeRun({ stepId: "backpack" }))).toBeNull();
  });
});

describe("stepContent", () => {
  it("switches the title and instruction to the backup place with the fallback active", () => {
    const meeting = navigateStep(buildSteps(fullPlan), "meeting");
    expect(stepContent(meeting, makeRun()).title).toBe("Idź do miejsca spotkania");
    expect(stepContent(meeting, makeRun({ fallbackActive: true })).title).toBe("Idź do miejsca zapasowego");
  });

  it("keeps the action step's own content", () => {
    const backpack = buildSteps(fullPlan)[0];
    expect(stepContent(backpack, null).title).toBe("Zabierz plecak ewakuacyjny");
  });
});
