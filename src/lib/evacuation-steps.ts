import type { EvacuationRun, HouseholdPlan } from "@/types";

/** `instruction` jest kontraktem dla głosu w S-03 — ekran czyta ten sam tekst, który przeczyta lektor. */
export type EvacuationStep =
  | { id: string; kind: "action"; title: string; instruction: string }
  | { id: string; kind: "navigate"; title: string; instruction: string };

const BACKPACK_STEP: EvacuationStep = {
  id: "backpack",
  kind: "action",
  title: "Zabierz plecak ewakuacyjny",
  instruction: "Weź przygotowany plecak i wyjdź z domu. Nie pakuj nic więcej.",
};

/** Jedno źródło treści kroku schronu: ekran i głos czytają stąd. */
const SHELTER_STEP: EvacuationStep = {
  id: "shelter",
  kind: "navigate",
  title: "Idź do schronu",
  instruction: "Idź do schronu wskazanego w planie.",
};

/**
 * Plan → sekwencja kroków. Wyliczana przy każdym wejściu w tryb alarmu, nigdy nie przechowywana:
 * zmiana planu między przebiegami ma od razu zmieniać kroki.
 */
export interface StepOptions {
  /** A saved PSP route exists (S-04): the shelter step exists even without the organiser's own shelter. */
  shelterRoute?: boolean;
}

export function buildSteps(plan: HouseholdPlan, { shelterRoute = false }: StepOptions = {}): EvacuationStep[] {
  // Bez celu prowadzenie nie ma sensu — /alarm ma na ten przypadek osobny stan.
  if (plan.shelter === null && !shelterRoute) return [];
  return [BACKPACK_STEP, SHELTER_STEP];
}

/** Przebieg wskazuje krok identyfikatorem: nieznany identyfikator startuje sekwencję od początku. */
export function resumeIndex(steps: EvacuationStep[], run: EvacuationRun | null): number {
  if (run === null) return 0;
  const index = steps.findIndex((step) => step.id === run.stepId);
  return index === -1 ? 0 : index;
}
