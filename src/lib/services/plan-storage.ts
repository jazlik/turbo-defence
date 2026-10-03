import { isMemberCategory, isPresetNeedKind, MAX_NEED_LABEL_LENGTH, MAX_NEEDS, MAX_RECORDS } from "../household";
import type {
  Coordinates,
  EmergencyContact,
  HouseholdMember,
  HouseholdPlan,
  LastKnownPosition,
  MemberNeed,
  Place,
  PlaceKind,
} from "@/types";

const STORAGE_KEY = "wrw.plan";
const CURRENT_SCHEMA_VERSION = 3;

export function createEmptyPlan(): HouseholdPlan {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    places: { meeting: null, backup: null, shelter: null },
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

function parsePlace(value: unknown): Place | null {
  if (!isRecord(value) || typeof value.label !== "string") return null;
  const coords = parseCoords(value.coords);
  return coords ? { label: value.label, coords } : null;
}

/** Każde miejsce jest walidowane osobno: uszkodzone nie unieważnia dwóch pozostałych. */
function parsePlaces(value: unknown): Record<PlaceKind, Place | null> {
  const source = isRecord(value) ? value : {};
  return {
    meeting: parsePlace(source.meeting),
    backup: parsePlace(source.backup),
    shelter: parsePlace(source.shelter),
  };
}

function parseLastKnownPosition(value: unknown): LastKnownPosition | null {
  if (!isRecord(value) || typeof value.recordedAt !== "string") return null;
  if (Number.isNaN(Date.parse(value.recordedAt))) return null;
  const coords = parseCoords(value.coords);
  return coords ? { coords, recordedAt: value.recordedAt } : null;
}

const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";

function parseNeed(value: unknown): MemberNeed | null {
  if (!isRecord(value)) return null;
  if (isPresetNeedKind(value.kind)) return { kind: value.kind };
  if (value.kind !== "custom" || typeof value.label !== "string") return null;
  const label = value.label.trim();
  return label !== "" && label.length <= MAX_NEED_LABEL_LENGTH ? { kind: "custom", label } : null;
}

function parseMember(value: unknown): HouseholdMember | null {
  if (!isRecord(value)) return null;
  const { id, name, category, needs } = value;
  if (!isNonEmptyString(id) || !isNonEmptyString(name) || !isMemberCategory(category)) return null;
  return { id, name, category, needs: parseList(needs, parseNeed, MAX_NEEDS) };
}

function parseContact(value: unknown): EmergencyContact | null {
  if (!isRecord(value)) return null;
  const { id, name, phone, relation } = value;
  if (!isNonEmptyString(id) || !isNonEmptyString(name) || !isNonEmptyString(phone)) return null;
  return { id, name, phone, relation: typeof relation === "string" ? relation : "" };
}

/** A damaged record is skipped, the rest of the list survives. */
function parseList<T>(value: unknown, parseItem: (item: unknown) => T | null, limit = MAX_RECORDS): T[] {
  if (!Array.isArray(value)) return [];
  const items: T[] = [];
  for (const raw of value as unknown[]) {
    const item = parseItem(raw);
    if (item) items.push(item);
  }
  return items.slice(0, limit);
}

/**
 * Skąd pochodzi wczytany plan. `unreadable` oznacza, że pod kluczem coś jest, ale nie umiemy
 * tego przeczytać — wtedy pusty plan jest tylko wartością zastępczą na ten render, nie prawdą
 * o danych użytkownika, i nie wolno go zapisać na miejsce oryginału.
 */
export type PlanSource = "empty" | "stored" | "migrated" | "unreadable";

export interface PlanReadResult {
  plan: HouseholdPlan;
  source: PlanSource;
}

/**
 * Validates the stored shape field by field: a damaged sub-object becomes null instead of
 * reaching /alarm, where a missing `coords` would crash the guidance screen.
 * Eksportowane dla testów, wzorem `parseRun`.
 */
export function parsePlanWithSource(value: unknown): PlanReadResult {
  if (!isRecord(value)) return { plan: createEmptyPlan(), source: "unreadable" };
  const lastKnownPosition = parseLastKnownPosition(value.lastKnownPosition);
  const updatedAt = typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString();

  if (value.schemaVersion === CURRENT_SCHEMA_VERSION) {
    return {
      plan: {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        places: parsePlaces(value.places),
        lastKnownPosition,
        members: parseList(value.members, parseMember),
        contacts: parseList(value.contacts, parseContact),
        updatedAt,
      },
      source: "stored",
    };
  }

  // v2 miało miejsca, ale nie miało list domowników i kontaktów — dostają puste listy.
  if (value.schemaVersion === 2) {
    return {
      plan: {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        places: parsePlaces(value.places),
        lastKnownPosition,
        members: [],
        contacts: [],
        updatedAt,
      },
      source: "migrated",
    };
  }

  // v1 trzymało jedno miejsce — staje się punktem ewakuacji, a dwa pozostałe czekają na uzupełnienie.
  if (value.schemaVersion === 1) {
    return {
      plan: {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        places: { meeting: null, backup: null, shelter: parsePlace(value.evacuationPoint) },
        lastKnownPosition,
        members: [],
        contacts: [],
        updatedAt,
      },
      source: "migrated",
    };
  }

  // Nieznana wersja — najpewniej zapis z nowszego wydania aplikacji. Nie wiemy, co tam jest,
  // więc oddajemy pusty plan do wyświetlenia, ale oznaczamy go jako nieczytelny.
  return { plan: createEmptyPlan(), source: "unreadable" };
}

export function parsePlan(value: unknown): HouseholdPlan {
  return parsePlanWithSource(value).plan;
}

/**
 * Synchronous on purpose: /alarm renders the target in its first React pass.
 * Never throws — a corrupted entry must not break the screen during a crisis.
 * Future schema versions add their migration branch to parsePlan; unknown versions read as an empty plan.
 */
export function readPlanResult(): PlanReadResult {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return { plan: createEmptyPlan(), source: "empty" };
    const parsed: unknown = JSON.parse(raw);
    return parsePlanWithSource(parsed);
  } catch {
    return { plan: createEmptyPlan(), source: "unreadable" };
  }
}

export function readPlan(): HouseholdPlan {
  return readPlanResult().plan;
}

/** `false`, gdy zapis się nie udał — wołający musi to pokazać, zamiast potwierdzać nieistniejący zapis. */
export function writePlan(plan: HouseholdPlan): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...plan, updatedAt: new Date().toISOString() }));
    return true;
  } catch {
    // Storage unavailable (private mode, blocked site data) — the plan lives only for this session.
    return false;
  }
}

/** Every GPS fix refreshes the position the next /alarm entry starts from. */
export function saveLastKnownPosition(coords: Coordinates): HouseholdPlan {
  const { plan: stored, source } = readPlanResult();
  const plan: HouseholdPlan = {
    ...stored,
    lastKnownPosition: { coords, recordedAt: new Date().toISOString() },
  };
  // Ten zapis nie jest inicjowany przez użytkownika — leci przy każdym fixie GPS. Nadpisanie
  // nieczytelnego wpisu pustym planem skasowałoby jedyną kopię miejsc, i to w trakcie ewakuacji.
  if (source === "unreadable") return plan;
  writePlan(plan);
  return plan;
}
