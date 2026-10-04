import { buildBackpack, summarizeBackpack, summarizeKeyItems } from "./backpack";
import { distanceMeters } from "./geo";
import { packageCovers, regionCovering } from "./map-regions";
import { SHORTLIST_RADIUS_METERS } from "./shelters";
import type { InstallState } from "./services/install";
import type { OfflineShellState } from "./services/offline-shell";
import { isMapUsable, mapHealth, type MapFileCheck } from "./map-health";
import type { MapPackageState } from "./services/map-storage";
import type { PlanSource } from "./services/plan-storage";
import { sensorsReady, type SensorCheckState } from "./services/sensor-storage";
import type { HouseholdPlan, NavigationState } from "@/types";

/**
 * Readiness is derived, never stored: the quick-win catalog below is the single source for the
 * "next step" button, the level, the area strip and the full path. Copy lives here, like step copy
 * in `evacuation-steps.ts`, so every screen says the same thing.
 */

export type AreaId = "places" | "family" | "backpack" | "offline" | "sensors";
export type StageId = "target" | "family" | "offline" | "complete";
export type QuickWinId =
  "shelter" | "household" | "backpack-key" | "offline-shell" | "install" | "map" | "sensors" | "backpack-full";
export type QuickWinStatus = "done" | "todo" | "unavailable";
export type LevelId = "start" | "basics" | "ready-to-go" | "ready-72h";

export const AREAS: readonly { id: AreaId; title: string; href: string }[] = [
  { id: "places", title: "Miejsca ewakuacji", href: "/miejsca" },
  { id: "family", title: "Rodzina", href: "/domownicy" },
  { id: "backpack", title: "Plecak", href: "/plecak" },
  { id: "offline", title: "Offline", href: "/offline" },
  { id: "sensors", title: "Czujniki", href: "/czujniki" },
];

export const STAGES: readonly { id: StageId; title: string }[] = [
  { id: "target", title: "Cel alarmu" },
  { id: "family", title: "Rodzina i plecak" },
  { id: "offline", title: "Działanie bez internetu" },
  { id: "complete", title: "Pełny plecak" },
];

export interface ReadinessLevel {
  id: LevelId;
  /** Position in `LEVELS`, 0-based. */
  index: number;
  title: string;
  description: string;
}

export const LEVELS: readonly ReadinessLevel[] = [
  {
    id: "start",
    index: 0,
    title: "Zaczynamy",
    description: "Alarm sam wyszuka najbliższy punkt schronienia. Z planem poprowadzi pewniej.",
  },
  {
    id: "basics",
    index: 1,
    title: "Podstawy",
    description: "Masz już miejsce ewakuacji. Teraz dodaj osoby, z którymi będziesz działać.",
  },
  {
    id: "ready-to-go",
    index: 2,
    title: "Gotowi do wyjścia",
    description: "Masz cel, osoby i najważniejsze rzeczy w plecaku.",
  },
  {
    id: "ready-72h",
    index: 3,
    title: "Plan przygotowany",
    description: "Cel, domownicy, plecak, mapa i telefon są przygotowane.",
  },
];

export interface QuickWin {
  id: QuickWinId;
  area: AreaId;
  stage: StageId;
  status: QuickWinStatus;
  /** The action, e.g. "Wybierz schron i przygotuj trasę" — also the label of the main button. */
  title: string;
  reason: string;
  href: string;
  progress?: { done: number; total: number };
}

export interface AreaStatus {
  id: AreaId;
  title: string;
  href: string;
  status: "done" | "partial" | "todo";
}

export type NoticeId =
  "map-outside-region" | "map-no-region" | "route-stale" | "plan-unreadable" | "offline-unavailable";

export interface ReadinessNotice {
  id: NoticeId;
  text: string;
}

export interface ReadinessInput {
  plan: HouseholdPlan;
  planSource: PlanSource;
  navigation: NavigationState;
  map: MapPackageState | null;
  /** Result of checking the package file on disk; `missing` overrides a `ready` flag. */
  mapFile: MapFileCheck;
  sensors: SensorCheckState | null;
  install: InstallState;
  shell: OfflineShellState;
}

export interface Readiness {
  level: ReadinessLevel;
  /** In priority order; `unavailable` steps stay listed, a step that does not apply here is left out. */
  quickWins: QuickWin[];
  /** The first step still to do, or null when nothing is left. */
  next: QuickWin | null;
  areas: AreaStatus[];
  notices: ReadinessNotice[];
}

const NOTICE_TEXT = {
  "map-no-region":
    "Jesteś poza obszarem dostępnych map offline (na razie Małopolska). Prowadzenie strzałką działa bez mapy.",
  "route-stale": "Trasa do schronu jest nieaktualna dla Twojej pozycji. Odśwież ją, gdy masz internet.",
  "offline-unavailable":
    "Tryb offline nie działa na tym urządzeniu, więc aplikacja nie otworzy się bez internetu. Otwórz ją przez HTTPS w aktualnej przeglądarce.",
  "plan-unreadable":
    "Nie udało się odczytać zapisanego planu. Nie nadpisuj go: odśwież aplikację albo otwórz ją w tej samej przeglądarce, w której plan zapisano.",
} as const;

const SHELL_REASON: Record<Exclude<OfflineShellState, "na">, string> = {
  ready: "Aplikacja otworzy się bez internetu.",
  pending: "Aplikacja zapisuje się na tym urządzeniu. Poczekaj chwilę i odśwież stronę.",
  unsupported:
    "Ta przeglądarka albo adres nie obsługuje trybu offline. Otwórz aplikację przez HTTPS w aktualnej przeglądarce.",
  failed: "Nie udało się zapisać aplikacji na tym urządzeniu. Odśwież stronę przy włączonym internecie.",
};

const status = (done: boolean): QuickWinStatus => (done ? "done" : "todo");

interface Evaluation {
  quickWins: QuickWin[];
  notices: ReadinessNotice[];
}

function evaluate(input: ReadinessInput): Evaluation {
  const { plan, navigation, map, mapFile, sensors, install, shell } = input;
  const position = plan.lastKnownPosition?.coords ?? null;
  const notices: ReadinessNotice[] = [];
  const quickWins: QuickWin[] = [];

  // A saved route is fresh while the last known position is within the shortlist radius of its origin.
  const route = navigation.primary;
  const routeFresh =
    route !== null && (position === null || distanceMeters(position, route.origin) <= SHORTLIST_RADIUS_METERS);
  const routeStale = route !== null && !routeFresh;
  const noCandidates = navigation.lastRefresh?.ok === false && navigation.lastRefresh.reason === "no-candidates";
  const shelterDone = plan.shelter !== null || routeFresh;
  let shelterCopy = {
    title: "Wybierz schron i przygotuj trasę",
    reason: "Aplikacja wybierze najbliższy punkt schronienia i przygotuje trasę, która zadziała bez internetu.",
    href: "/miejsca",
  };
  if (!shelterDone && routeStale) {
    notices.push({ id: "route-stale", text: NOTICE_TEXT["route-stale"] });
    shelterCopy = {
      title: "Odśwież trasę do schronu",
      reason: "Pozycja jest daleko od miejsca, z którego policzono trasę. Odśwież ją, gdy masz internet.",
      href: "/miejsca",
    };
  } else if (!shelterDone && noCandidates) {
    shelterCopy = {
      title: "Wskaż własny schron",
      reason: "W pobliżu nie ma punktu schronienia z danych PSP (na razie Małopolska). Wskaż własny schron.",
      href: "/miejsca",
    };
  }
  quickWins.push({ id: "shelter", area: "places", stage: "target", status: status(shelterDone), ...shelterCopy });

  quickWins.push({
    id: "household",
    area: "family",
    stage: "family",
    status: status(plan.members.length > 0 || plan.contacts.length > 0),
    title: "Dodaj kontakt awaryjny lub domownika",
    reason: "Osoby, które ewakuują się z Tobą, i kontakt na wypadek kryzysu. Od nich zależy zawartość plecaka.",
    href: "/domownicy",
  });

  const items = buildBackpack(plan.members);
  const key = summarizeKeyItems(items, plan.packedItems);
  const all = summarizeBackpack(items, plan.packedItems);
  quickWins.push({
    id: "backpack-key",
    area: "backpack",
    stage: "family",
    status: status(key.packed === key.total),
    title: "Spakuj rzeczy kluczowe",
    reason: "Woda, jedzenie, dokumenty, apteczka i rzeczy potrzebne domownikom.",
    href: "/plecak",
    progress: { done: key.packed, total: key.total },
  });

  if (shell !== "na") {
    const broken = shell === "unsupported" || shell === "failed";
    if (broken) notices.push({ id: "offline-unavailable", text: NOTICE_TEXT["offline-unavailable"] });
    quickWins.push({
      id: "offline-shell",
      area: "offline",
      stage: "offline",
      status: status(shell === "ready"),
      title: "Włącz tryb offline",
      reason: SHELL_REASON[shell],
      href: "/offline",
    });
  }

  if (install !== "na") {
    quickWins.push({
      id: "install",
      area: "offline",
      stage: "offline",
      status: status(install === "done"),
      title: "Dodaj aplikację do ekranu początkowego",
      reason: "Na iPhonie mapa pobrana w przeglądarce nie jest widoczna w aplikacji z ekranu początkowego.",
      href: "/offline",
    });
  }

  const mapStep = {
    id: "map",
    area: "offline",
    stage: "offline",
    href: "/offline",
  } as const;
  const regionHere = position === null ? undefined : regionCovering(position);
  if (isMapUsable(map, mapFile)) {
    if (position === null || packageCovers(map.regionId, position)) {
      quickWins.push({
        ...mapStep,
        status: "done",
        title: "Pobierz mapę offline",
        reason: "Mapa regionu na telefonie pokaże trasę i Twoją pozycję bez internetu.",
      });
    } else if (regionHere) {
      notices.push({
        id: "map-outside-region",
        text: `Jesteś poza obszarem pobranej mapy. Pobierz mapę: ${regionHere.name}.`,
      });
      quickWins.push({
        ...mapStep,
        status: "todo",
        title: `Pobierz mapę: ${regionHere.name}`,
        reason: "Twoja pozycja leży poza pobraną mapą. Pobierz ją przez Wi-Fi.",
      });
    } else {
      notices.push({ id: "map-no-region", text: NOTICE_TEXT["map-no-region"] });
      quickWins.push({
        ...mapStep,
        status: "unavailable",
        title: "Pobierz mapę offline",
        reason: "Mapy offline są na razie dostępne tylko dla Małopolski.",
      });
    }
  } else if (position !== null && !regionHere) {
    notices.push({ id: "map-no-region", text: NOTICE_TEXT["map-no-region"] });
    quickWins.push({
      ...mapStep,
      status: "unavailable",
      title: "Pobierz mapę offline",
      reason: "Mapy offline są na razie dostępne tylko dla Małopolski.",
    });
  } else {
    const evicted = mapHealth(map, mapFile) === "file-missing";
    quickWins.push({
      ...mapStep,
      status: "todo",
      title: evicted ? "Pobierz mapę ponownie" : "Pobierz mapę offline",
      reason: evicted
        ? "Telefon usunął pobraną mapę. Pobierz ją ponownie przez Wi-Fi."
        : "Mapa regionu na telefonie pokaże trasę i Twoją pozycję bez internetu.",
    });
  }

  quickWins.push({
    id: "sensors",
    area: "sensors",
    stage: "offline",
    status: status(sensors !== null && sensorsReady(sensors)),
    title: "Sprawdź lokalizację i kompas",
    reason: "Zgodę na lokalizację i kompas daj teraz, nie w kryzysie.",
    href: "/czujniki",
  });

  quickWins.push({
    id: "backpack-full",
    area: "backpack",
    stage: "complete",
    status: status(all.packed === all.total),
    title: "Dopakuj resztę plecaka",
    reason: "Reszta listy na 72 godziny, dobrana do Twojej rodziny.",
    href: "/plecak",
    progress: { done: all.packed - key.packed, total: all.total - key.total },
  });

  return { quickWins, notices };
}

function levelFor(quickWins: readonly QuickWin[]): ReadinessLevel {
  const done = (id: QuickWinId) => quickWins.find((quickWin) => quickWin.id === id)?.status === "done";
  const basics = done("shelter");
  const readyToGo = basics && done("household") && done("backpack-key");
  const complete = quickWins.every((quickWin) => quickWin.status !== "todo");
  return LEVELS[complete ? 3 : readyToGo ? 2 : basics ? 1 : 0];
}

function areasFor(quickWins: readonly QuickWin[]): AreaStatus[] {
  return AREAS.map((area) => {
    const counted = quickWins.filter((quickWin) => quickWin.area === area.id && quickWin.status !== "unavailable");
    const done = counted.filter((quickWin) => quickWin.status === "done").length;
    const state = done === counted.length ? "done" : done === 0 ? "todo" : "partial";
    return { ...area, status: state };
  });
}

/** Pure: reads no storage and no clock — the hook gathers the inputs. */
export function computeReadiness(input: ReadinessInput): Readiness {
  // Anything computed from the empty stand-in plan would be a claim about data we could not read.
  if (input.planSource === "unreadable") {
    return {
      level: LEVELS[0],
      quickWins: [],
      next: null,
      areas: [],
      notices: [{ id: "plan-unreadable", text: NOTICE_TEXT["plan-unreadable"] }],
    };
  }
  const { quickWins, notices } = evaluate(input);
  return {
    level: levelFor(quickWins),
    quickWins,
    next: quickWins.find((quickWin) => quickWin.status === "todo") ?? null,
    areas: areasFor(quickWins),
    notices,
  };
}
