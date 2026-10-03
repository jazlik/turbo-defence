import type { EvacuationRun } from "@/types";

const STORAGE_KEY = "wrw.run";
const CURRENT_SCHEMA_VERSION = 1;

/**
 * Przebieg ma przeżyć ubicie aplikacji w marszu, ale nie ma witać nikogo dzień później
 * — ani na scenie przy drugim podejściu do demo.
 */
export const RUN_FRESH_MS = 6 * 60 * 60 * 1000;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const isTimestamp = (value: unknown): value is string => typeof value === "string" && !Number.isNaN(Date.parse(value));

/**
 * Eksportowane dla testów, wzorem `parsePlan`. Uszkodzony albo przestarzały przebieg czyta się
 * jako `null`, czyli start od pierwszego kroku — nigdy jako wyjątek w trakcie alarmu.
 */
export function parseRun(value: unknown, now: number): EvacuationRun | null {
  if (!isRecord(value) || value.schemaVersion !== CURRENT_SCHEMA_VERSION) return null;
  const { stepId, fallbackActive, startedAt, updatedAt } = value;
  if (typeof stepId !== "string" || stepId.trim() === "") return null;
  if (typeof fallbackActive !== "boolean") return null;
  if (!isTimestamp(startedAt) || !isTimestamp(updatedAt)) return null;
  if (now - Date.parse(updatedAt) >= RUN_FRESH_MS) return null;
  return { schemaVersion: CURRENT_SCHEMA_VERSION, stepId, fallbackActive, startedAt, updatedAt };
}

/** Synchroniczny jak `readPlan`: bieżący krok jest na ekranie w pierwszym przebiegu renderowania. */
export function readRun(): EvacuationRun | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return parseRun(parsed, Date.now());
  } catch {
    return null;
  }
}

/** `false`, gdy zapis się nie udał — przebieg działa wtedy tylko do zamknięcia karty. */
export function writeRun(run: EvacuationRun): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...run, updatedAt: new Date().toISOString() }));
    return true;
  } catch {
    // Storage unavailable (private mode, blocked site data) — the run lives only for this session.
    return false;
  }
}

/** Osobny klucz od planu: zakończenie przebiegu nie dotyka zapisanych miejsc. */
export function clearRun(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable — nothing to clear.
  }
}
