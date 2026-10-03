import { isMemberCategory, MAX_RECORDS } from "../household";
import type {
  Coordinates,
  EmergencyContact,
  EvacuationPoint,
  HouseholdMember,
  HouseholdPlan,
  LastKnownPosition,
} from "@/types";

const STORAGE_KEY = "wrw.plan";
const CURRENT_SCHEMA_VERSION = 2;

export function createEmptyPlan(): HouseholdPlan {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    evacuationPoint: null,
    lastKnownPosition: null,
    members: [],
    contacts: [],
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

const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";

function parseMember(value: unknown): HouseholdMember | null {
  if (!isRecord(value)) return null;
  const { id, name, category, takesMedication } = value;
  if (!isNonEmptyString(id) || !isNonEmptyString(name) || !isMemberCategory(category)) return null;
  return { id, name, category, takesMedication: takesMedication === true };
}

function parseContact(value: unknown): EmergencyContact | null {
  if (!isRecord(value)) return null;
  const { id, name, phone, relation } = value;
  if (!isNonEmptyString(id) || !isNonEmptyString(name) || !isNonEmptyString(phone)) return null;
  return { id, name, phone, relation: typeof relation === "string" ? relation : "" };
}

/** A damaged record is skipped, the rest of the list survives. */
function parseList<T>(value: unknown, parseItem: (item: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  const items: T[] = [];
  for (const raw of value as unknown[]) {
    const item = parseItem(raw);
    if (item) items.push(item);
  }
  return items.slice(0, MAX_RECORDS);
}

/**
 * Validates the stored shape field by field: a damaged sub-object becomes null instead of
 * reaching /alarm, where a missing `coords` would crash the guidance screen.
 */
export function parsePlan(value: unknown): HouseholdPlan {
  // v1 had no people lists: `parseList` turns the missing fields into empty arrays.
  if (!isRecord(value) || (value.schemaVersion !== 1 && value.schemaVersion !== CURRENT_SCHEMA_VERSION)) {
    return createEmptyPlan();
  }
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    evacuationPoint: parseEvacuationPoint(value.evacuationPoint),
    lastKnownPosition: parseLastKnownPosition(value.lastKnownPosition),
    members: parseList(value.members, parseMember),
    contacts: parseList(value.contacts, parseContact),
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
  };
}

/**
 * Synchronous on purpose: /alarm renders the target in its first React pass.
 * Never throws — a corrupted entry must not break the screen during a crisis.
 * Migrations live in `parsePlan` (v1 → v2 adds the people lists); unknown versions read as an empty plan. Reading never writes back.
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
