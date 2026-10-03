import type { EvacuationRun, HouseholdPlan, PlaceKind } from "@/types";

/** `instruction` jest kontraktem dla głosu w S-03 — ekran czyta ten sam tekst, który przeczyta lektor. */
export type EvacuationStep =
  | { id: string; kind: "action"; title: string; instruction: string }
  | { id: string; kind: "navigate"; title: string; instruction: string; place: PlaceKind; fallback: PlaceKind | null };

const BACKPACK_STEP: EvacuationStep = {
  id: "backpack",
  kind: "action",
  title: "Zabierz plecak ewakuacyjny",
  instruction: "Weź przygotowany plecak i wyjdź z domu. Nie pakuj nic więcej.",
};

/** Jedno źródło treści kroków nawigacyjnych: ekran, a w S-03 także głos, czytają stąd. */
const NAVIGATION_CONTENT: Record<PlaceKind, { title: string; instruction: string }> = {
  meeting: {
    title: "Idź do miejsca spotkania",
    instruction: "Idź do miejsca spotkania i zaczekaj tam na pozostałych domowników.",
  },
  backup: {
    title: "Idź do miejsca zapasowego",
    instruction: "Miejsce spotkania jest niedostępne. Idź do miejsca zapasowego i zaczekaj tam na domowników.",
  },
  shelter: {
    title: "Idź do punktu ewakuacji",
    instruction: "Idź do punktu ewakuacji wskazanego w planie.",
  },
};

/**
 * Plan → sekwencja kroków. Wyliczana przy każdym wejściu w tryb alarmu, nigdy nie przechowywana:
 * zmiana planu między przebiegami ma od razu zmieniać kroki.
 */
export interface StepOptions {
  /** A saved PSP route exists (S-04): the shelter step exists even without a manually set shelter. */
  shelterRoute?: boolean;
}

export function buildSteps(plan: HouseholdPlan, { shelterRoute = false }: StepOptions = {}): EvacuationStep[] {
  const navigation: EvacuationStep[] = [];

  if (plan.places.meeting !== null) {
    navigation.push({
      id: "meeting",
      kind: "navigate",
      ...NAVIGATION_CONTENT.meeting,
      place: "meeting",
      fallback: plan.places.backup !== null ? "backup" : null,
    });
  }

  if (plan.places.shelter !== null || shelterRoute) {
    navigation.push({
      id: "shelter",
      kind: "navigate",
      ...NAVIGATION_CONTENT.shelter,
      place: "shelter",
      fallback: null,
    });
  }

  // Bez celu prowadzenie nie ma sensu — /alarm ma na ten przypadek osobny stan.
  if (navigation.length === 0) return [];

  return [BACKPACK_STEP, ...navigation];
}

/** Przebieg wskazuje krok identyfikatorem: nieznany identyfikator startuje sekwencję od początku. */
export function resumeIndex(steps: EvacuationStep[], run: EvacuationRun | null): number {
  if (run === null) return 0;
  const index = steps.findIndex((step) => step.id === run.stepId);
  return index === -1 ? 0 : index;
}

/** Cel bieżącego kroku: miejsce zapasowe, gdy fallback jest aktywny, inaczej miejsce kroku. */
export function targetPlaceKind(step: EvacuationStep, run: EvacuationRun | null): PlaceKind | null {
  if (step.kind !== "navigate") return null;
  if (run !== null && run.fallbackActive && step.fallback !== null) return step.fallback;
  return step.place;
}

/** Tytuł i instrukcja widoczne na ekranie — po przełączeniu na miejsce zapasowe zmienia się jedno i drugie. */
export function stepContent(step: EvacuationStep, run: EvacuationRun | null): { title: string; instruction: string } {
  const kind = targetPlaceKind(step, run);
  if (kind === null) return { title: step.title, instruction: step.instruction };
  return NAVIGATION_CONTENT[kind];
}
