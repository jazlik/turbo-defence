const STORAGE_KEY = "wrw.voice";

export interface VoiceSettings {
  enabled: boolean;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** Everything except an explicit `enabled: false` yields enabled: true (default-on, FR-015). */
export function parseVoiceSettings(value: unknown): VoiceSettings {
  if (isRecord(value) && value.enabled === false) return { enabled: false };
  return { enabled: true };
}

/** Synchronous, never throws. */
export function readVoiceSettings(): VoiceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return { enabled: true };
    return parseVoiceSettings(JSON.parse(raw) as unknown);
  } catch {
    return { enabled: true };
  }
}

export function writeVoiceSettings(settings: VoiceSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable — setting lives only for this session.
  }
}
