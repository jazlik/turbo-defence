import type { Coordinates, EvacuationPoint, HouseholdPlan, LastKnownPosition } from "@/types";

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

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

function parseCoords(value: unknown): Coordinates | null {
  if (!isRecord(value)) return null;
  const { latitude, longitude } = value;
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

function parseEvacuationPoint(value: unknown): EvacuationPoint | null {
  if (!isRecord(value) || typeof value.label !== "string") return null;
  const coords = parseCoords(value.coords);
  return coords ? { label: value.label, coords } : null;
}

function parseLastKnownPosition(value: unknown): LastKnownPosition | null {
  if (!isRecord(value) || typeof value.recordedAt !== "string") return null;
  if (Number.isNaN(Date.parse(value.recordedAt))) return null;
  const coords = parseCoords(value.coords);
  return coords ? { coords, recordedAt: value.recordedAt } : null;
}

/**
 * Validates the stored shape field by field: a damaged sub-object becomes null instead of
 * reaching /alarm, where a missing `coords` would crash the guidance screen.
 */
export function parsePlan(value: unknown): HouseholdPlan {
  if (!isRecord(value) || value.schemaVersion !== CURRENT_SCHEMA_VERSION) return createEmptyPlan();
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    evacuationPoint: parseEvacuationPoint(value.evacuationPoint),
    lastKnownPosition: parseLastKnownPosition(value.lastKnownPosition),
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
  };
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
    return parsePlan(parsed);
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

/** Every GPS fix refreshes the position the next /alarm entry starts from. */
export function saveLastKnownPosition(coords: Coordinates): HouseholdPlan {
  const plan: HouseholdPlan = {
    ...readPlan(),
    lastKnownPosition: { coords, recordedAt: new Date().toISOString() },
  };
  writePlan(plan);
  return plan;
}
