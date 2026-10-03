import { LOCATION_PROBLEMS } from "./guidance-copy";

// Polish inflection: n=1 → form0, n=2–4,22–24,… → form1, n=5–21,25–31,… → form2
export function polishUnit(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n);
  const lastTwo = abs % 100;
  const lastOne = abs % 10;
  if (abs === 1) return forms[0];
  if (lastTwo >= 12 && lastTwo <= 14) return forms[2];
  if (lastOne >= 2 && lastOne <= 4) return forms[1];
  return forms[2];
}

/** Distance spoken aloud in Polish, matching the rounding of formatDistance. */
export function spokenDistance(meters: number): string {
  const rounded = Math.round(meters / 10) * 10;
  if (rounded < 1000) {
    const unit = polishUnit(rounded, ["metr", "metry", "metrów"]);
    return `${rounded} ${unit}`;
  }
  const km = meters / 1000;
  const roundedKm = Math.round(km * 10) / 10;
  if (roundedKm === Math.floor(roundedKm)) {
    const n = Math.round(roundedKm);
    const unit = polishUnit(n, ["kilometr", "kilometry", "kilometrów"]);
    return `${n} ${unit}`;
  }
  // fractional km: always "kilometra"
  return `${roundedKm.toFixed(1).replace(".", ",")} kilometra`;
}

/** Distance threshold bucket: the mark this distance belongs to. */
export function distanceMark(meters: number): number {
  if (meters >= 1000) return Math.floor(meters / 500) * 500;
  if (meters >= 200) return Math.floor(meters / 100) * 100;
  return Math.floor(meters / 50) * 50;
}

function markStep(mark: number): number {
  if (mark >= 1000) return 500;
  if (mark >= 200) return 100;
  return 50;
}

/**
 * Returns whether to announce, and the new lastMark.
 * Never announces mark 0 (arrival handles that).
 * Only a rise of more than one step above lastMark moves it up (silently) — GPS jitter around a mark stays quiet.
 */
export function nextDistanceAnnouncement(lastMark: number | null, meters: number): { announce: boolean; mark: number } {
  const mark = distanceMark(meters);
  if (lastMark === null || mark < lastMark) {
    return { announce: mark > 0, mark };
  }
  if (mark - lastMark > markStep(lastMark)) {
    return { announce: false, mark };
  }
  return { announce: false, mark: lastMark };
}

export type GuidanceVoiceState =
  | { kind: "noPoint" }
  | { kind: "searching"; label: string }
  | { kind: "locationProblem"; label: string; problem: "denied" | "unavailable" }
  | { kind: "guiding"; label: string; meters: number; live: boolean }
  | { kind: "arrived"; label: string };

/** Full or short phrase for the given state transition. */
export function phraseFor(state: GuidanceVoiceState, previous: GuidanceVoiceState | null): string {
  const entry = previous === null;

  switch (state.kind) {
    case "noPoint":
      return "Nie wskazano punktu ewakuacji.";

    case "searching":
      if (entry) return "Szukam sygnału GPS. Wyjdź pod otwarte niebo.";
      return "Utracono sygnał GPS. Czekam na połączenie.";

    case "locationProblem": {
      const p = LOCATION_PROBLEMS[state.problem];
      return `${p.title}. ${p.instruction}`;
    }

    case "guiding": {
      const dist = spokenDistance(state.meters);
      if (entry) {
        const staleSuffix = state.live ? "" : " Dane z ostatniej znanej pozycji.";
        return `Idź do punktu ewakuacji: ${state.label}. ${dist} w linii prostej.${staleSuffix}`;
      }
      // Transition from searching / locationProblem → guiding (got signal)
      if (previous.kind === "searching" || previous.kind === "locationProblem") {
        if (state.live) return `Mam sygnał GPS. Do punktu ${dist}.`;
        return `Dane z ostatniej pozycji. Do punktu ${dist}.`;
      }

      // Transition live → stale
      if (previous.kind === "guiding" && previous.live && !state.live) {
        return "Utracono sygnał GPS. Odległość może być nieaktualna.";
      }

      // Transition stale → live
      if (previous.kind === "guiding" && !previous.live && state.live) {
        return `Odzyskano sygnał GPS. Do punktu ${dist}.`;
      }

      return `Do punktu ${state.label}. ${dist}.`;
    }

    case "arrived":
      return "Jesteś na miejscu. Zostań tutaj i czekaj na pozostałych domowników.";
  }
}

/** Picks the best Polish voice. Works on SpeechSynthesisVoice or plain objects in tests. */
export function pickPolishVoice<T extends { lang: string; localService: boolean }>(
  voices: readonly T[],
): { voice: T; local: boolean } | null {
  const polish = voices.filter((v) => v.lang.replace("_", "-").toLowerCase().startsWith("pl"));
  if (polish.length === 0) return null;
  const local = polish.find((v) => v.localService);
  const chosen = local ?? polish[0];
  return { voice: chosen, local: chosen.localService };
}
