import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Backpack,
  Check,
  CheckCircle2,
  Compass,
  History,
  LoaderCircle,
  LocateFixed,
  Map as MapIcon,
  MapPinOff,
  Navigation2,
  RotateCcw,
  Route,
  Satellite,
  TriangleAlert,
  Volume2,
  VolumeX,
} from "lucide-react";

import DirectionArrow from "@/components/DirectionArrow";
import HoldButton from "@/components/HoldButton";
import { requestCurrentPosition, useGeolocation } from "@/components/hooks/useGeolocation";
import MapOverlay, { prefetchExecutionMap, type MapNotice } from "@/components/map/MapOverlay";
import { useNow } from "@/components/hooks/useNow";
import { useScreenWakeLock } from "@/components/hooks/useScreenWakeLock";
import { useVoiceGuidance } from "@/components/hooks/useVoiceGuidance";
import { Button } from "@/components/ui/button";
import { headingPermissionRequired, requestHeadingPermission, useHeading } from "@/components/hooks/useHeading";
import { buildSteps, resumeIndex, stepContent, targetPlaceKind, type EvacuationStep } from "@/lib/evacuation-steps";
import { formatClockTime } from "@/lib/format";
import { formatDistance } from "@/lib/geo";
import { LOCATION_PROBLEMS } from "@/lib/guidance-copy";
import { ARRIVAL_RADIUS_METERS, deriveGuidance, type DistanceKind, type GuidanceMode } from "@/lib/navigation";
import { prepareRoute } from "@/lib/route-progress";
import { isMapReady, readMapPackage } from "@/lib/services/map-storage";
import { findEmergencyTarget } from "@/lib/services/emergency-target";
import { readNavigation, writeNavigation } from "@/lib/services/navigation-storage";
import { loadShelters } from "@/lib/services/route-refresh";
import { walkingRouter } from "@/lib/services/routing";
import { resolveStepTarget, shelterAlternateAvailable, shelterFallbackContent } from "@/lib/step-target";
import { readPlan, saveLastKnownPosition } from "@/lib/services/plan-storage";
import { clearRun, readRun, writeRun } from "@/lib/services/run-storage";
import type { GuidanceVoiceState } from "@/lib/voice";
import type { Coordinates, Destination, EvacuationRun, NavigationState } from "@/types";

// iOS forgets the motion permission between PWA launches; after this much compass silence offer to re-enable it.
const COMPASS_SILENCE_MS = 1000;

// watchPosition goes silent when the signal is lost; a fix older than this is shown as stale, not live.
const FIX_STALE_MS = 20_000;

// Map prefetch waits for the first render to settle; Safari has no requestIdleCallback.
const MAP_PREFETCH_FALLBACK_MS = 1500;

const DISTANCE_CAPTIONS: Record<DistanceKind, string> = {
  route: "trasą",
  "to-route": "do trasy",
  straight: "w linii prostej",
};

// Ten sam czas co alarm: jeden wyuczony gest dla akcji, których nie da się cofnąć.
const HOLD_MS = 2000;

/** "14:32" for today, "12.09, 14:32" otherwise — a position from weeks ago must not read as current. */
function formatFixTime(timestamp: number): string {
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === new Date().toDateString()) return time;
  return `${date.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" })}, ${time}`;
}

/** Alarm started without a prepared target, found on the spot: straight-line guidance only, said out loud. */
const EMERGENCY_STEP: EvacuationStep = {
  id: "emergency",
  kind: "navigate",
  title: "Idź do najbliższego schronu",
  instruction: "Prowadzenie awaryjne w linii prostej, bez trasy po drogach. Omijaj przeszkody i trzymaj kierunek.",
  place: "shelter",
  fallback: null,
};

type FinderState = "idle" | "searching" | "no-position" | "no-candidates" | "no-data" | "failed";

/** A position wait in a crisis is bounded: past this, use the latest watched fix or the saved position. */
const FIND_POSITION_TIMEOUT_MS = 10_000;

const fetchJson = async (url: string): Promise<unknown> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
};

/**
 * Never a dead end in alarm mode: without a prepared target the screen offers to find the nearest PSP shelter now
 * (online: with a walking route; offline: straight-line from the local snapshot). Manual places stay one link away.
 */
function FindTargetScreen({
  voice,
  state,
  onFind,
}: {
  voice: ReturnType<typeof useVoiceGuidance>;
  state: FinderState;
  onFind: () => void;
}) {
  const online = typeof navigator === "undefined" || navigator.onLine;
  return (
    <main className="flex min-h-screen flex-col justify-between gap-8 px-4 py-8">
      <div>
        <MapPinOff className="text-guidance size-12" strokeWidth={2} aria-hidden="true" />
        <h1 className="font-heading mt-6 text-3xl">Nie ma przygotowanego celu</h1>
        <p className="text-muted-foreground mt-3 text-lg">
          {online
            ? "Znajdę najbliższy punkt schronienia i przygotuję trasę pieszą. Do serwisu tras trafi tylko Twoja pozycja."
            : "Bez internetu wskażę najbliższy punkt schronienia z danych zapisanych w telefonie — kierunek w linii prostej, bez trasy po drogach."}
        </p>
        <div role="status" aria-live="polite" className="mt-4 text-lg empty:hidden">
          {state === "searching" && (
            <p className="text-muted-foreground flex items-center gap-2">
              <LoaderCircle
                className="size-5 animate-spin motion-reduce:animate-none"
                strokeWidth={2}
                aria-hidden="true"
              />
              Szukam najbliższego schronu…
            </p>
          )}
          {state === "no-position" && (
            <p className="text-attention-foreground">
              Nie znam Twojej pozycji. Wyjdź pod otwarte niebo, sprawdź zgodę na lokalizację i spróbuj ponownie.
            </p>
          )}
          {state === "no-data" && (
            <p className="text-attention-foreground">
              Nie udało się wczytać punktów schronienia z pamięci telefonu. Spróbuj ponownie albo wskaż miejsce w
              planie.
            </p>
          )}
          {state === "failed" && (
            <p className="text-attention-foreground">
              Nie udało się ustalić celu. Spróbuj ponownie albo wskaż miejsce w planie.
            </p>
          )}
          {state === "no-candidates" && (
            <p className="text-attention-foreground">
              W pobliżu nie ma punktu schronienia z danych PSP (na razie Małopolska). Wskaż miejsce w planie.
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col items-center gap-3">
        <Button
          type="button"
          size="lg"
          className="min-h-14 w-full text-lg font-semibold"
          disabled={state === "searching"}
          onClick={onFind}
        >
          <LocateFixed className="size-6" strokeWidth={2} aria-hidden="true" />
          Znajdź najbliższy schron teraz
        </Button>
        <VoiceUnlockButton voice={voice} />
        <Button asChild variant="secondary" className="min-h-14 w-full text-base">
          <a href="/">Ustaw miejsca w planie</a>
        </Button>
        <VoiceToggle voice={voice} />
      </div>
    </main>
  );
}

function ExitLink() {
  return (
    <Button asChild variant="link" className="text-muted-foreground hover:text-muted-foreground text-base">
      <a href="/">Wyjdź z trybu alarmu</a>
    </Button>
  );
}

function VoiceToggle({ voice }: { voice: ReturnType<typeof useVoiceGuidance> }) {
  if (voice.status === "unavailable") {
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-base">
        <VolumeX className="size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
        Głos niedostępny na tym telefonie — prowadzenie tylko na ekranie
      </p>
    );
  }
  return (
    <Button
      type="button"
      variant="secondary"
      className="w-full text-base"
      aria-pressed={voice.enabled}
      onClick={voice.toggle}
    >
      {voice.enabled ? (
        <Volume2 className="size-5" strokeWidth={2} aria-hidden="true" />
      ) : (
        <VolumeX className="size-5" strokeWidth={2} aria-hidden="true" />
      )}
      {voice.enabled ? "Głos: włączony" : "Głos: wyłączony"}
    </Button>
  );
}

/** Przycisk odblokowania mowy — przeglądarka startuje syntezę tylko z gestu użytkownika. */
function VoiceUnlockButton({ voice }: { voice: ReturnType<typeof useVoiceGuidance> }) {
  if (voice.status !== "blocked") return null;
  return (
    <Button
      type="button"
      size="lg"
      className="min-h-14 w-full text-lg font-semibold"
      // Must stay inside the click handler: browsers only start speech from a user gesture.
      onClick={voice.unlock}
    >
      <Volume2 className="size-6" strokeWidth={2} aria-hidden="true" />
      Włącz głos
    </Button>
  );
}

/**
 * Jeden synchroniczny odczyt planu i przebiegu. Musi dołączyć do pierwszego przebiegu renderowania:
 * `useEffect` pokazałby na moment krok pierwszy, a potem przeskoczył na wznowiony.
 */
function readSession(navigationOverride?: NavigationState) {
  const plan = readPlan();
  // S-04: a saved PSP route gives the shelter step a target even without a manually set shelter.
  const navigation = navigationOverride ?? readNavigation();
  const steps = buildSteps(plan, { shelterRoute: navigation.primary !== null });
  const run = readRun();
  // Turf lines are built once per visit, not on every GPS fix.
  const prepared = {
    primary: navigation.primary ? prepareRoute(navigation.primary) : null,
    alternate: navigation.alternate ? prepareRoute(navigation.alternate) : null,
  };
  return { plan, steps, run, navigation, prepared, mapPackage: readMapPackage(), stepIndex: resumeIndex(steps, run) };
}

export default function GuidanceScreen() {
  const [session, setSession] = useState(readSession);
  const { plan, navigation, prepared, mapPackage } = session;
  // Found on the spot without a route (offline or routing failed): one straight-line step to the nearest PSP point.
  const [emergency, setEmergency] = useState<Destination | null>(null);
  const [finder, setFinder] = useState<FinderState>("idle");
  const steps = emergency ? [EMERGENCY_STEP] : session.steps;
  const mapReady = isMapReady(mapPackage);
  // Happy path: with a saved route and the offline map, the map is the default view; the big arrow is the
  // fallback (no map, no route, map or storage error) and stays one tap away.
  const [preferMap, setPreferMap] = useState(true);
  const [mapFailed, setMapFailed] = useState(false);
  // Leaving the map (button or map failure) unmounts the focused control: land focus on the arrow view's heading.
  const arrowHeadingRef = useRef<HTMLHeadingElement>(null);
  const viewSwitches = useRef(0);
  useEffect(() => {
    viewSwitches.current += 1;
    if (viewSwitches.current > 1 && (!preferMap || mapFailed)) arrowHeadingRef.current?.focus();
  }, [preferMap, mapFailed]);
  const [run, setRun] = useState(session.run);
  const [stepIndex, setStepIndex] = useState(session.stepIndex);
  // Dwustopniowe wyjście bez potwierdzenia GPS: przytrzymanie, a potem dotknięcie potwierdzenia.
  const [confirming, setConfirming] = useState(false);
  const [confirmedArrival, setConfirmedArrival] = useState(false);
  // Wznowienie w środku sekwencji pomija wcześniejsze kroki — w tym plecak. Nie wolno zrobić tego
  // po cichu: świeży alarm (brak przebiegu) startuje od zera i tego ekranu nie zobaczy.
  const [resumePrompt, setResumePrompt] = useState(session.stepIndex > 0);

  // `at` zwraca `undefined` poza zakresem — indeksowanie nawiasem kłamałoby o typie przy pustej sekwencji.
  const step = steps.at(stepIndex);
  const nextStep = steps.at(stepIndex + 1);
  const targetKind = step ? targetPlaceKind(step, run) : null;
  const point = emergency
    ? { label: emergency.label, coords: emergency.coords, source: "psp" as const, route: null, role: null }
    : resolveStepTarget(targetKind, plan, navigation, run?.fallbackActive ?? false);
  // The shelter step's "niedostępne" switches to the prepared PSP route B (S-04).
  const shelterFallback =
    step?.kind === "navigate" &&
    step.place === "shelter" &&
    point?.source === "psp" &&
    shelterAlternateAvailable(navigation);

  // Alarm mode always tracks position — also before a target exists, so "Znajdź" can use a live fix.
  const { coords, accuracyMeters, fixedAt, status } = useGeolocation({ watch: true });
  // "Znajdź" reads the newest watched fix at the moment it needs one, not the one from the tap's render.
  const latestFix = useRef<{ coords: Coordinates; fixedAt: number } | null>(null);
  useEffect(() => {
    if (coords !== null && fixedAt !== null) latestFix.current = { coords, fixedAt };
  }, [coords, fixedAt]);
  const { heading, source } = useHeading(coords, accuracyMeters);
  const [compassSilent, setCompassSilent] = useState(false);
  const now = useNow(5_000);

  useScreenWakeLock();

  useEffect(() => {
    if (!mapReady) return;
    const idleWindow: Partial<Pick<Window, "requestIdleCallback">> = window;
    if (idleWindow.requestIdleCallback) {
      const handle = idleWindow.requestIdleCallback(prefetchExecutionMap);
      return () => {
        window.cancelIdleCallback(handle);
      };
    }
    const timer = window.setTimeout(prefetchExecutionMap, MAP_PREFETCH_FALLBACK_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [mapReady]);

  useEffect(() => {
    if (coords) saveLastKnownPosition(coords);
  }, [coords]);

  // Podmiana HoldButton na przycisk potwierdzenia odmontowuje element, więc focus spadłby na <body>.
  // Bez tego drugi etap jest nieosiągalny z klawiatury i switcha inaczej niż tabulatorem od góry strony.
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirming) confirmButtonRef.current?.focus();
  }, [confirming]);

  useEffect(() => {
    if (!headingPermissionRequired()) return;
    const timer = window.setTimeout(() => {
      setCompassSilent(true);
    }, COMPASS_SILENCE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const runAt = (stepId: string, fallbackActive: boolean): EvacuationRun => {
    const timestamp = new Date().toISOString();
    return {
      schemaVersion: 1,
      stepId,
      fallbackActive,
      startedAt: run?.startedAt ?? timestamp,
      updatedAt: timestamp,
    };
  };

  const goToNextStep = () => {
    if (nextStep === undefined) return;
    // Zapis przebiegu i podmiana widoku w jednej aktualizacji stanu.
    const next = runAt(nextStep.id, false);
    writeRun(next);
    setRun(next);
    setStepIndex(stepIndex + 1);
    setConfirming(false);
    setConfirmedArrival(false);
  };

  const switchToFallback = () => {
    if (step?.kind !== "navigate" || (step.fallback === null && !shelterFallback)) return;
    // Flaga musi trafić do stanu w tym samym renderze co do localStorage: inaczej strzałka
    // pokazywałaby stary kierunek, czyli w kryzysie wskazywała w złe miejsce.
    const next = runAt(step.id, true);
    writeRun(next);
    setRun(next);
  };

  const confirmArrival = () => {
    setConfirming(false);
    if (nextStep !== undefined) goToNextStep();
    else setConfirmedArrival(true);
  };

  const restartRun = () => {
    clearRun();
    setRun(null);
    setStepIndex(0);
    setResumePrompt(false);
  };

  const finishRun = () => {
    clearRun();
    window.location.assign("/");
  };

  const content = step
    ? emergency
      ? { title: EMERGENCY_STEP.title, instruction: EMERGENCY_STEP.instruction }
      : (shelterFallbackContent(step, point) ?? stepContent(step, run))
    : null;

  const locateForSearch = async (): Promise<Coordinates | null> => {
    const watched = latestFix.current;
    if (watched && Date.now() - watched.fixedAt < FIX_STALE_MS) return watched.coords;
    const oneShot = await Promise.race([
      requestCurrentPosition().then((result) => (result.ok ? result.fix.coords : null)),
      new Promise<null>((resolve) => {
        setTimeout(() => {
          resolve(null);
        }, FIND_POSITION_TIMEOUT_MS);
      }),
    ]);
    return oneShot ?? latestFix.current?.coords ?? readPlan().lastKnownPosition?.coords ?? null;
  };

  const findTarget = async () => {
    setFinder("searching");
    try {
      const position = await locateForSearch();
      if (!position) {
        setFinder("no-position");
        return;
      }
      // Same as every live fix: guidance starts from this position until the watcher delivers a newer one.
      saveLastKnownPosition(position);
      const shelters = await loadShelters(fetchJson).catch(() => null);
      if (!shelters || shelters.length === 0) {
        setFinder("no-data");
        return;
      }
      const outcome = await findEmergencyTarget({
        previous: navigation,
        origin: position,
        shelters,
        online: navigator.onLine,
        router: walkingRouter,
      });
      if (outcome.kind === "none") {
        setFinder("no-candidates");
        return;
      }
      clearRun();
      setRun(null);
      setResumePrompt(false);
      if (outcome.kind === "direct") {
        setSession(readSession());
        setEmergency(outcome.destination);
        setStepIndex(0);
      } else {
        // Route prepared: from here it is the normal prepared path, started straight at the shelter step. The
        // session is built from the route in memory, so guidance starts even if storage refuses the write.
        writeNavigation(outcome.navigation);
        const next = readSession(outcome.navigation);
        const shelterIndex = Math.max(
          0,
          next.steps.findIndex((candidate) => candidate.id === "shelter"),
        );
        const startedAt = new Date().toISOString();
        const shelterRun: EvacuationRun = {
          schemaVersion: 1,
          stepId: next.steps.at(shelterIndex)?.id ?? "shelter",
          fallbackActive: false,
          startedAt,
          updatedAt: startedAt,
        };
        // A reload resumes at the shelter step instead of restarting from the backpack.
        writeRun(shelterRun);
        setSession(next);
        setRun(shelterRun);
        setStepIndex(shelterIndex);
      }
      setFinder("idle");
    } catch {
      setFinder("failed");
    }
  };

  const liveFix = coords !== null && fixedAt !== null && now - fixedAt < FIX_STALE_MS ? coords : null;
  // Without a live fix fall back to this session's last fix, then to the position saved before the alarm.
  const lastKnown = plan.lastKnownPosition;
  const staleFix =
    coords !== null && fixedAt !== null
      ? { coords, recordedAt: fixedAt }
      : lastKnown
        ? { coords: lastKnown.coords, recordedAt: Date.parse(lastKnown.recordedAt) }
        : null;
  const origin = liveFix ?? staleFix?.coords ?? null;
  const isStale = liveFix === null && staleFix !== null;
  // One navigation core (S-04): straight bearing for plan places, route following for the PSP shelter.
  const guidanceKey = `${step?.id ?? ""}:${point?.label ?? ""}:${point?.role ?? ""}`;
  const [modeMemory, setModeMemory] = useState<{ key: string; mode: GuidanceMode | null }>({ key: "", mode: null });
  const previousMode = modeMemory.key === guidanceKey ? modeMemory.mode : null;
  const preparedRoute = point?.role ? prepared[point.role] : null;
  const guidance = point
    ? deriveGuidance({
        destination: point.coords,
        route: preparedRoute,
        origin,
        accuracyMeters,
        heading,
        liveFix: liveFix !== null,
        previousMode,
      })
    : null;
  // Hysteresis memory from the previous render, reset when the target changes (next step, route B).
  if (
    guidance &&
    guidance.distanceMeters !== null &&
    (modeMemory.key !== guidanceKey || modeMemory.mode !== guidance.mode)
  ) {
    setModeMemory({ key: guidanceKey, mode: guidance.mode });
  }
  const distance = guidance?.distanceMeters ?? null;
  const straightDistance = guidance?.straightDistanceMeters ?? null;
  const locationProblemKind = liveFix === null && (status === "denied" || status === "unavailable") ? status : null;
  const locationProblem = locationProblemKind ? LOCATION_PROBLEMS[locationProblemKind] : null;
  // Only a live fix can confirm arrival — "Ustaw tutaj" stores the point itself as the last known position.
  const arrived = guidance?.arrived ?? false;
  const showArrival = arrived || confirmedArrival;
  // Doszukane dojście unieważnia uzbrojone potwierdzenie: gdyby fix się zestarzał i prowadzenie
  // wróciło, przycisk wróciłby już uzbrojony, czyli bez bramki przytrzymania.
  if (showArrival && confirming) setConfirming(false);
  const guiding =
    !showArrival &&
    distance !== null &&
    !(isStale && straightDistance !== null && straightDistance < ARRIVAL_RADIUS_METERS);
  const rotation = guidance?.rotation ?? null;
  const showCompassButton = compassSilent && source !== "compass" && !showArrival;
  // Po dojściu zostaje jedna akcja guidance: czerwone „punkt niedostępny” pod nogami celu,
  // na który właśnie doszliśmy, czyta się jak ostrzeżenie o tym miejscu.
  const fallbackAvailable =
    step?.kind === "navigate" &&
    !showArrival &&
    (step.fallback !== null || shelterFallback) &&
    !(run?.fallbackActive ?? false);

  // Stan głosu musi powstać przed pierwszym `return`, bo `useVoiceGuidance` jest hookiem.
  // Kolejność warunków odpowiada kolejności ekranów poniżej, żeby głos mówił to, co widać.
  let voiceState: GuidanceVoiceState;
  if (step === undefined || content === null) voiceState = { kind: "noSteps" };
  else if (resumePrompt) voiceState = { kind: "resume", title: content.title };
  else if (step.kind === "action")
    voiceState = { kind: "action", title: content.title, instruction: content.instruction };
  else if (point === null) voiceState = { kind: "noSteps" };
  else if (showArrival) voiceState = { kind: "arrived", label: point.label, next: nextStep?.title ?? null };
  else if (guiding)
    voiceState = {
      kind: "guiding",
      title: content.title,
      label: point.label,
      meters: distance,
      live: !isStale,
      fallback: run?.fallbackActive ?? false,
      alongRoute: guidance?.distanceKind === "route",
    };
  else if (locationProblemKind !== null)
    voiceState = { kind: "locationProblem", label: point.label, problem: locationProblemKind };
  else voiceState = { kind: "searching", label: point.label };

  const voice = useVoiceGuidance(voiceState);

  if (step === undefined || content === null)
    return <FindTargetScreen voice={voice} state={finder} onFind={() => void findTarget()} />;

  if (resumePrompt) {
    return (
      <main className="flex min-h-screen flex-col gap-6 px-4 py-6">
        <header>
          <p className="text-guidance text-lg font-semibold">Przerwana ewakuacja</p>
          <h1 className="font-heading mt-1 text-3xl break-words">Wracasz do trwającego przebiegu</h1>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <History className="text-guidance size-24" strokeWidth={2} aria-hidden="true" />
          <p className="text-xl">
            Ostatnio zatrzymaliście się na kroku „{content.title}”. Wcześniejsze kroki — w tym zabranie plecaka — są już
            za wami.
          </p>
        </section>

        <footer className="flex flex-col items-center gap-3">
          <Button
            type="button"
            size="lg"
            className="min-h-14 w-full text-lg font-semibold"
            onClick={() => {
              setResumePrompt(false);
            }}
          >
            <ArrowRight strokeWidth={2} aria-hidden="true" />
            Kontynuuj: {content.title}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-14 w-full text-base font-semibold"
            onClick={restartRun}
          >
            <RotateCcw strokeWidth={2} aria-hidden="true" />
            Zacznij od początku
          </Button>
          <VoiceToggle voice={voice} />
          <ExitLink />
        </footer>
      </main>
    );
  }

  if (step.kind === "action") {
    return (
      <main className="flex min-h-screen flex-col gap-6 px-4 py-6">
        <header>
          <p className="text-guidance text-lg font-semibold">Następny krok</p>
          <h1 className="font-heading mt-1 text-3xl break-words">{content.title}</h1>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <Backpack className="text-guidance size-24" strokeWidth={2} aria-hidden="true" />
          <p className="text-xl">{content.instruction}</p>
        </section>

        <footer className="flex flex-col items-center gap-3">
          <VoiceUnlockButton voice={voice} />
          <Button type="button" size="lg" className="min-h-14 w-full text-lg font-semibold" onClick={goToNextStep}>
            <Check strokeWidth={2} aria-hidden="true" />
            Zrobione — dalej
          </Button>
          <VoiceToggle voice={voice} />
          <ExitLink />
        </footer>
      </main>
    );
  }

  // `buildSteps` tworzy krok `navigate` tylko dla ustawionego miejsca, więc to stan nieosiągalny
  // przy spójnym planie — ekran prowadzenia nigdy nie pokazuje kroku bez celu.
  if (point === null) return <FindTargetScreen voice={voice} state={finder} onFind={() => void findTarget()} />;

  const mapAvailable = mapReady && !mapFailed && point.route !== null;

  const compassButton = showCompassButton && (
    <Button
      type="button"
      variant="secondary"
      className="w-full text-base"
      onClick={() => {
        // Must stay inside the click handler: iOS only grants motion access to a user gesture.
        void requestHeadingPermission();
      }}
    >
      <Compass className="size-5" strokeWidth={2} aria-hidden="true" />
      Włącz kompas
    </Button>
  );

  const fallbackHold = fallbackAvailable && (
    <HoldButton
      holdMs={HOLD_MS}
      onComplete={switchToFallback}
      label="Punkt niedostępny — idź do zapasowego"
      icon={TriangleAlert}
      hintId="hold-hint"
      className="border-destructive text-destructive focus-visible:ring-destructive active:bg-surface-secondary"
    />
  );

  // S-02 manual arrival (indoors, weak GPS) — the same two-stage hold + confirm on the map and the arrow view.
  const confirmArrivalControl = (
    <>
      {!showArrival && (
        // Stopka nie jest objęta regionem aria-live sekcji: bez tego drugi etap pojawia się bez zapowiedzi.
        <div role="status" className="w-full">
          {confirming ? (
            <Button
              ref={confirmButtonRef}
              type="button"
              variant="secondary"
              className="min-h-14 w-full text-base font-semibold"
              onClick={confirmArrival}
            >
              <Check strokeWidth={2} aria-hidden="true" />
              Potwierdź: jestem na miejscu
            </Button>
          ) : (
            <HoldButton
              holdMs={HOLD_MS}
              onComplete={() => {
                setConfirming(true);
              }}
              label="Potwierdź dojście"
              icon={Check}
              hintId="hold-hint"
              className="border-input text-foreground focus-visible:ring-ring active:bg-surface-secondary"
            />
          )}
        </div>
      )}

      {(fallbackAvailable || (!showArrival && !confirming)) && (
        <p id="hold-hint" className="text-muted-foreground text-sm">
          Akcje z pierścieniem przytrzymaj przez 2 sekundy.
        </p>
      )}
    </>
  );

  if (preferMap && mapAvailable && point.route && guidance && !showArrival) {
    // The arrow screen's status lines, condensed to one line above the map.
    const mapNotice: MapNotice | null =
      !guiding && locationProblem
        ? { text: `${locationProblem.title}. ${locationProblem.instruction}`, emphasis: false }
        : !guiding
          ? { text: "Szukam sygnału GPS — wyjdź pod otwarte niebo.", emphasis: false }
          : guidance.mode === "rejoin"
            ? { text: "Wróć na trasę", emphasis: true }
            : guidance.mode === "direct"
              ? { text: "Jesteś daleko od zapisanej trasy — idź w kierunku celu.", emphasis: false }
              : isStale
                ? { text: `Dane z ${formatFixTime(staleFix.recordedAt)} — czekam na sygnał GPS`, emphasis: false }
                : null;

    return (
      <MapOverlay
        mapPackage={mapPackage}
        destination={point.route.destination}
        route={point.route}
        guidance={guidance}
        title={content.title}
        distanceCaption={DISTANCE_CAPTIONS[guidance.distanceKind]}
        notice={mapNotice}
        position={origin}
        heading={heading}
        isStale={isStale}
        onUnavailable={() => {
          setMapFailed(true);
        }}
        controls={
          <>
            <VoiceUnlockButton voice={voice} />
            {compassButton}
            {fallbackHold}
            {confirmArrivalControl}
            <Button
              type="button"
              variant="secondary"
              className="w-full text-base"
              onClick={() => {
                setPreferMap(false);
              }}
            >
              <Navigation2 className="size-5" strokeWidth={2} aria-hidden="true" />
              Duża strzałka i więcej opcji
            </Button>
          </>
        }
      />
    );
  }

  return (
    <main className="flex min-h-screen flex-col gap-6 px-4 py-6">
      <header>
        <p className="text-guidance text-lg font-semibold">{content.title}</p>
        <h1 ref={arrowHeadingRef} tabIndex={-1} className="font-heading mt-1 text-3xl break-words outline-none">
          {point.label}
        </h1>
        {point.route && (
          <p className="text-muted-foreground mt-1 flex items-center gap-2 text-base">
            <Route className="size-4" strokeWidth={2} aria-hidden="true" />
            Trasa z {formatClockTime(Date.parse(point.route.createdAt))}
          </p>
        )}
      </header>

      <section aria-live="polite" className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        {showArrival && (
          <>
            <CheckCircle2 className="text-safe size-24" strokeWidth={2} aria-hidden="true" />
            <p className="font-heading text-display text-safe">Jesteś na miejscu</p>
            <p className="text-muted-foreground text-lg">
              {nextStep !== undefined
                ? "Zostań tutaj i czekaj na pozostałych domowników."
                : "Dotarliście na miejsce. To koniec zaplanowanej drogi."}
            </p>
          </>
        )}

        {guiding && (
          <>
            {guidance?.mode === "rejoin" && <p className="font-heading text-guidance text-2xl">Wróć na trasę</p>}
            <div className="w-3/5 max-w-64">
              {rotation !== null ? (
                <DirectionArrow rotationDegrees={rotation} dimmed={isStale} />
              ) : (
                <p className="text-muted-foreground text-lg">Ustalam kierunek — zrób kilka kroków.</p>
              )}
            </div>
            <p className="font-operational text-display text-guidance">{formatDistance(distance)}</p>
            <p className="text-muted-foreground text-lg">
              {guidance ? DISTANCE_CAPTIONS[guidance.distanceKind] : "w linii prostej"}
            </p>
            {emergency && (
              <p className="text-attention-foreground text-base">
                Prowadzenie awaryjne w linii prostej — bez wyznaczonej trasy po drogach.
              </p>
            )}
            {guidance?.mode === "direct" && point.route && (
              <p className="text-muted-foreground text-base">Jesteś daleko od zapisanej trasy — idź w kierunku celu.</p>
            )}
            {isStale && (
              <p className="text-muted-foreground flex items-center gap-2 text-base">
                <Satellite className="size-5" strokeWidth={2} aria-hidden="true" />
                Dane z {formatFixTime(staleFix.recordedAt)} —{" "}
                {locationProblem ? locationProblem.title.toLowerCase() : "czekam na sygnał GPS"}
              </p>
            )}
            {locationProblem && <p className="text-muted-foreground text-base">{locationProblem.instruction}</p>}
            {rotation !== null && source === "movement" && (
              <p className="text-muted-foreground text-base">Kierunek liczony z marszu</p>
            )}
          </>
        )}

        {!showArrival && !guiding && locationProblem && (
          <>
            <MapPinOff className="text-guidance size-16" strokeWidth={2} aria-hidden="true" />
            <p className="font-heading text-2xl">{locationProblem.title}</p>
            <p className="text-muted-foreground text-lg">{locationProblem.instruction}</p>
          </>
        )}

        {!showArrival && !guiding && !locationProblem && (
          <>
            <Satellite className="text-guidance size-16" strokeWidth={2} aria-hidden="true" />
            <p className="font-heading text-2xl">Szukam sygnału GPS</p>
            <p className="text-muted-foreground text-lg">
              Wyjdź pod otwarte niebo. Strzałka pojawi się po ustaleniu pozycji.
            </p>
          </>
        )}
      </section>

      <footer className="flex flex-col items-center gap-3">
        {showArrival &&
          (nextStep !== undefined ? (
            <Button type="button" size="lg" className="min-h-14 w-full text-lg font-semibold" onClick={goToNextStep}>
              <ArrowRight strokeWidth={2} aria-hidden="true" />
              Dalej: {nextStep.title}
            </Button>
          ) : (
            <Button type="button" size="lg" className="min-h-14 w-full text-lg font-semibold" onClick={finishRun}>
              <Check strokeWidth={2} aria-hidden="true" />
              Zakończ tryb alarmu
            </Button>
          ))}

        <VoiceUnlockButton voice={voice} />

        {compassButton}

        {mapAvailable && !showArrival && (
          <Button
            type="button"
            variant="secondary"
            className="w-full text-base"
            onClick={() => {
              setPreferMap(true);
            }}
          >
            <MapIcon className="size-5" strokeWidth={2} aria-hidden="true" />
            Mapa
          </Button>
        )}

        {fallbackHold}

        {confirmArrivalControl}

        <VoiceToggle voice={voice} />
        <ExitLink />
      </footer>
    </main>
  );
}
