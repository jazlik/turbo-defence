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

/**
 * Prowadzenie jest sekwencją kroków (S-02), więc stan głosu nosi tytuł bieżącego kroku, nie tylko
 * nazwę celu: po przełączeniu na zapasowy schron i po przejściu na następny krok cel się zmienia,
 * a głos musi to powiedzieć, zamiast dalej czytać odległość do czegoś innego.
 */
export type GuidanceVoiceState =
  | { kind: "noSteps" }
  | { kind: "resume"; title: string }
  | { kind: "action"; title: string; instruction: string }
  | { kind: "searching"; label: string }
  | { kind: "locationProblem"; label: string; problem: "denied" | "unavailable" }
  | {
      kind: "guiding";
      title: string;
      label: string;
      meters: number;
      live: boolean;
      fallback: boolean;
      /** S-04: the distance is the remaining route length, not a straight line. */
      alongRoute?: boolean;
    }
  | { kind: "arrived"; label: string; next: string | null };

/** Full or short phrase for the given state transition. */
export function phraseFor(state: GuidanceVoiceState, previous: GuidanceVoiceState | null): string {
  const entry = previous === null;

  switch (state.kind) {
    case "noSteps":
      return "Nie ma przygotowanego celu. Dotknij przycisku: Znajdź najbliższy schron teraz.";

    case "resume":
      return `Wracasz do przerwanej ewakuacji. Zatrzymaliście się na kroku: ${state.title}. Wybierz, czy kontynuować, czy zacząć od początku.`;

    case "action":
      return `${state.title}. ${state.instruction}`;

    case "searching":
      // Coming out of a location problem there was never a signal to lose.
      if (entry || previous.kind === "locationProblem") return "Szukam sygnału GPS. Wyjdź pod otwarte niebo.";
      return "Utracono sygnał GPS. Czekam na połączenie.";

    case "locationProblem": {
      const p = LOCATION_PROBLEMS[state.problem];
      return `${p.title}. ${p.instruction}`;
    }

    case "guiding": {
      const dist = spokenDistance(state.meters);
      const measured = state.alongRoute ? "trasą" : "do celu, bez trasy";
      if (entry) {
        const staleSuffix = state.live ? "" : " Dane z ostatniej znanej pozycji.";
        return `${state.title}: ${state.label}. ${dist} ${measured}.${staleSuffix}`;
      }

      // Cel się zmienił: albo wyjście awaryjne na zapasowy schron, albo następny krok sekwencji.
      // Oba trzeba powiedzieć, bo strzałka zaczyna wskazywać w inną stronę.
      if (previous.kind === "guiding" && previous.title !== state.title) {
        if (state.fallback && !previous.fallback) {
          return `Schron niedostępny. Idź do zapasowego schronu: ${state.label}. ${dist}.`;
        }
        return `${state.title}: ${state.label}. ${dist}.`;
      }

      // Wejście w prowadzenie z kroku akcji, z ekranu wznowienia albo z dojścia na poprzedni krok.
      if (previous.kind === "action" || previous.kind === "resume" || previous.kind === "arrived") {
        return `${state.title}: ${state.label}. ${dist} ${measured}.`;
      }

      // Transition from searching / locationProblem → guiding (got signal)
      if (previous.kind === "searching" || previous.kind === "locationProblem") {
        if (state.live) return `Mam sygnał GPS. Do celu ${dist}.`;
        return `Dane z ostatniej pozycji. Do celu ${dist}.`;
      }

      // Transition live → stale
      if (previous.kind === "guiding" && previous.live && !state.live) {
        return "Utracono sygnał GPS. Odległość może być nieaktualna.";
      }

      // Transition stale → live
      if (previous.kind === "guiding" && !previous.live && state.live) {
        return `Odzyskano sygnał GPS. Do celu ${dist}.`;
      }

      return `${state.title}: ${state.label}. ${dist}.`;
    }

    case "arrived":
      if (state.next === null) return "Jesteś na miejscu. Dotarliście na miejsce, to koniec zaplanowanej drogi.";
      return `Jesteś na miejscu: ${state.label}. Zostań tutaj i czekaj na pozostałych domowników. Następny krok: ${state.next}.`;
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
