import type { HouseholdPlan } from "@/types";

const STORAGE_KEY = "wrw.plan";
const CURRENT_SCHEMA_VERSION = 1;

export function createEmptyPlan(): HouseholdPlan {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    evacuationPoint: null,
    lastKnownPosition: null,
    updatedAt: new Date().toISOString(),
  };
}

function isPlan(value: unknown): value is HouseholdPlan {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<HouseholdPlan>;
  return candidate.schemaVersion === CURRENT_SCHEMA_VERSION && typeof candidate.updatedAt === "string";
}

/**
 * Synchronous on purpose: /alarm renders the target in its first React pass.
 * Never throws — a corrupted entry must not break the screen during a crisis.
 * Future schema versions add their migration branch here; unknown versions read as an empty plan.
 */
export function readPlan(): HouseholdPlan {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return createEmptyPlan();
    const parsed: unknown = JSON.parse(raw);
    return isPlan(parsed) ? parsed : createEmptyPlan();
  } catch {
    return createEmptyPlan();
  }
}

export function writePlan(plan: HouseholdPlan): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...plan, updatedAt: new Date().toISOString() }));
  } catch {
    // Storage unavailable (private mode, blocked site data) — the plan lives only for this session.
  }
}
