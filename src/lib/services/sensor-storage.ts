import { isRecord } from "@/lib/services/plan-storage";

const STORAGE_KEY = "wrw.sensors";
const CURRENT_SCHEMA_VERSION = 1;
const OUTCOMES: readonly SensorOutcome[] = ["working", "denied", "unavailable"];

export type SensorOutcome = "working" | "denied" | "unavailable";

/**
 * Device state, like `wrw.voice`: whether this phone's location and compass were checked on /czujniki.
 * It cannot be derived from the plan — `lastKnownPosition` also changes on every "Ustaw tutaj".
 */
export interface SensorCheckState {
  schemaVersion: 1;
  /** ISO 8601 */
  checkedAt: string;
  location: SensorOutcome;
  compass: SensorOutcome;
}

const parseOutcome = (value: unknown): SensorOutcome | null => OUTCOMES.find((outcome) => outcome === value) ?? null;

/** Field-by-field like parseNavigation: a damaged entry reads as "not checked". */
export function parseSensors(value: unknown): SensorCheckState | null {
  if (!isRecord(value) || value.schemaVersion !== CURRENT_SCHEMA_VERSION) return null;
  const { checkedAt } = value;
  if (typeof checkedAt !== "string" || Number.isNaN(Date.parse(checkedAt))) return null;
  const location = parseOutcome(value.location);
  const compass = parseOutcome(value.compass);
  if (!location || !compass) return null;
  return { schemaVersion: CURRENT_SCHEMA_VERSION, checkedAt, location, compass };
}

/** Never throws. */
export function readSensors(): SensorCheckState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === null ? null : parseSensors(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** `false`, gdy zapis się nie udał — wołający musi to pokazać, zamiast potwierdzać nieistniejący zapis. */
export function writeSensors(state: SensorCheckState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** Location works and the compass was not refused. A phone without a compass still guides from movement. */
export const sensorsReady = (state: SensorCheckState): boolean =>
  state.location === "working" && state.compass !== "denied";
