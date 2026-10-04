import { lazy, Suspense, useCallback, useEffect, useId, useRef, useState, type SyntheticEvent } from "react";
import { CheckCircle2, ChevronRight, LocateFixed, MapPin, MapPinOff, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NAVIGATION_CHANGED_EVENT } from "@/components/hooks/useRouteRefresh";
import { requestCurrentPosition, type GeolocationStatus } from "@/components/hooks/useGeolocation";
import MapErrorBoundary from "@/components/map/MapErrorBoundary";
import { parseCoordinates } from "@/lib/geo";
import { pickMapSource, type MapSource } from "@/lib/map-source";
import { readMapPackage } from "@/lib/services/map-storage";
import { readNavigation } from "@/lib/services/navigation-storage";
import { readPlan, readPlanResult, saveLastKnownPosition, writePlan } from "@/lib/services/plan-storage";
import { cn } from "@/lib/utils";
import type { Coordinates, HouseholdPlan, NavigationState } from "@/types";

// MapLibre (~250 kB gz) is fetched only when the editor opens, never with the page.
const PlacePickerMap = lazy(() => import("@/components/map/PlacePickerMap"));

const DEFAULT_LABEL = "Własny schron";

const formatCoordinates = ({ latitude, longitude }: Coordinates) =>
  `${Math.abs(latitude).toFixed(5)}° ${latitude >= 0 ? "N" : "S"}, ${Math.abs(longitude).toFixed(5)}° ${longitude >= 0 ? "E" : "W"}`;

const LOCATION_ERRORS: Partial<Record<GeolocationStatus, string>> = {
  denied: "Brak zgody na lokalizację. Zezwól na nią w ustawieniach przeglądarki dla tej strony albo wpisz współrzędne.",
  unavailable: "Nie udało się ustalić pozycji. Wyjdź pod otwarte niebo i spróbuj ponownie albo wpisz współrzędne.",
};

// Cicha awaria zapisu jest gorsza niż brak zapisu: użytkownik odchodzi przekonany, że plan jest na urządzeniu.
const STORAGE_ERROR =
  "Nie udało się zapisać na tym urządzeniu. Wyłącz tryb prywatny albo odblokuj dane witryny w ustawieniach przeglądarki i spróbuj ponownie.";

/** Zapisany plan może pochodzić z nowszej wersji aplikacji: zapis schronu nie może go zastąpić pustym. */
const UNREADABLE_PLAN =
  "Nie udało się odczytać planu zapisanego na tym urządzeniu, więc schron nie został zapisany. Zaktualizuj aplikację i spróbuj ponownie.";

const MAP_UNAVAILABLE: Record<"offline-no-package" | "outside-region" | "error", string> = {
  "offline-no-package": "Mapa jest dostępna online albo po pobraniu paczki na stronie Offline. Wpisz współrzędne.",
  "outside-region": "Mapa obejmuje na razie Małopolskę. Wpisz współrzędne.",
  error: "Nie udało się wczytać mapy. Wpisz współrzędne.",
};
type MapUnavailableReason = keyof typeof MAP_UNAVAILABLE;

const mapPlaceholder = (
  <div className="border-border bg-surface-secondary text-muted-foreground flex h-72 items-center justify-center rounded-md border text-sm">
    Ładuję mapę…
  </div>
);

/** Policzone przy każdym otwarciu edytora: paczka mogła się pobrać, a sieć zniknąć, od ostatniego razu. */
function currentMapSource(): MapSource {
  const plan = readPlan();
  return pickMapSource({
    mapPackage: readMapPackage(),
    online: navigator.onLine,
    center: plan.shelter?.coords ?? plan.lastKnownPosition?.coords ?? null,
  });
}

type Feedback = { kind: "saved" | "error"; text: string } | null;
type Mode = "idle" | "editing" | "confirm-delete";

const noCandidates = (navigation: NavigationState) =>
  navigation.lastRefresh?.ok === false && navigation.lastRefresh.reason === "no-candidates";

const inputClass =
  "border-input bg-surface focus-visible:ring-ring focus-visible:ring-offset-background h-11 w-full min-w-0 rounded-md border px-3 text-base outline-none focus-visible:ring-[3px] focus-visible:ring-offset-2";

/**
 * Własny schron: cel alarmu, gdy nie ma trasy do schronu PSP. Trzy stany — zwinięty (nic nie ustawiono),
 * podsumowanie i edytor. Nazwa zapisuje się razem z punktem, jednym przyciskiem.
 */
export default function OwnShelterCard() {
  const [plan, setPlan] = useState<HouseholdPlan>(readPlan);
  const [navigation, setNavigation] = useState<NavigationState>(readNavigation);
  // Bez schronu PSP w pobliżu własny schron jest jedynym celem — edytor otwiera się sam.
  const [mode, setMode] = useState<Mode>(() =>
    plan.shelter === null && noCandidates(navigation) ? "editing" : "idle",
  );
  const [label, setLabel] = useState(plan.shelter?.label ?? "");
  const [candidate, setCandidate] = useState<Coordinates | null>(plan.shelter?.coords ?? null);
  const [mapSource, setMapSource] = useState<MapSource | null>(() => (mode === "editing" ? currentMapSource() : null));
  // Bez mapy jedyną drogą z domu są współrzędne — wtedy są rozwinięte od razu.
  const [coordinatesOpen, setCoordinatesOpen] = useState(() => mapSource?.kind === "none");
  const [coordinatesInput, setCoordinatesInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [mapFocus, setMapFocus] = useState<Coordinates | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const ids = { title: useId(), label: useId(), labelHint: useId(), coordinates: useId(), coordinatesError: useId() };

  // Kolejne odświeżenia z tym samym wynikiem nie mogą ponownie otwierać edytora zamkniętego przez „Anuluj”.
  const wasNoCandidates = useRef(noCandidates(navigation));

  // Karta trasy jest osobną wyspą: wynik jej odświeżenia („brak schronu PSP”) przychodzi zdarzeniem.
  useEffect(() => {
    const onNavigation = () => {
      const next = readNavigation();
      setNavigation(next);
      const entered = noCandidates(next) && !wasNoCandidates.current;
      wasNoCandidates.current = noCandidates(next);
      if (entered && readPlan().shelter === null) {
        const source = currentMapSource();
        setMapSource(source);
        setMapFailed(false);
        if (source.kind === "none") setCoordinatesOpen(true);
        setMode("editing");
      }
    };
    window.addEventListener(NAVIGATION_CHANGED_EVENT, onNavigation);
    return () => {
      window.removeEventListener(NAVIGATION_CHANGED_EVENT, onNavigation);
    };
  }, []);

  const shelter = plan.shelter;

  // Przełączenie trybu odmontowuje naciśnięty przycisk; fokus przechodzi na cel nowego trybu,
  // ale tylko gdy faktycznie spadł na <body> — samo otwarcie po wyniku trasy nie kradnie fokusu.
  const modeFocusTarget = useRef<HTMLElement | null>(null);
  const setModeFocusTarget = useCallback((element: HTMLElement | null) => {
    modeFocusTarget.current = element;
  }, []);
  const firstMode = useRef(true);
  useEffect(() => {
    if (firstMode.current) {
      firstMode.current = false;
      return;
    }
    if (document.activeElement === null || document.activeElement === document.body) {
      modeFocusTarget.current?.focus();
    }
  }, [mode]);

  const mapUnavailable: MapUnavailableReason | null =
    mapSource === null ? null : mapSource.kind === "none" ? mapSource.reason : mapFailed ? "error" : null;

  const onMapError = useCallback(() => {
    setMapFailed(true);
    setCoordinatesOpen(true);
  }, []);

  const onMapCenter = useCallback((coords: Coordinates) => {
    setCandidate(coords);
  }, []);

  const openEditor = () => {
    setLabel(shelter?.label ?? "");
    setCandidate(shelter?.coords ?? null);
    setCoordinatesInput("");
    setInputError(null);
    setFeedback(null);
    const source = currentMapSource();
    setMapSource(source);
    setMapFailed(false);
    setMapFocus(null);
    setCoordinatesOpen(source.kind === "none");
    setMode("editing");
  };

  /** Tekst błędu, gdy zapisu nie było — wołający nie może wtedy potwierdzić zapisania; `null` po udanym zapisie. */
  const commit = (nextShelter: HouseholdPlan["shelter"]): string | null => {
    // Inne wyspy zapisują ten sam klucz: czytaj tuż przed zapisem, inaczej nadpiszesz ich zmiany.
    const { plan: fresh, source } = readPlanResult();
    if (source === "unreadable") return UNREADABLE_PLAN;
    const next: HouseholdPlan = { ...fresh, shelter: nextShelter };
    if (!writePlan(next)) return STORAGE_ERROR;
    // Stan karty zmienia się dopiero po udanym zapisie, żeby nie pokazać schronu, którego nie ma w pamięci.
    setPlan(next);
    return null;
  };

  const locateMe = async () => {
    setLocating(true);
    setFeedback(null);
    const result = await requestCurrentPosition();
    setLocating(false);
    if (!result.ok) {
      setFeedback({ kind: "error", text: LOCATION_ERRORS[result.status] ?? LOCATION_ERRORS.unavailable ?? "" });
      setCoordinatesOpen(true);
      return;
    }
    // To jest prawdziwa pozycja użytkownika, więc odświeża też ostatnią znaną pozycję.
    saveLastKnownPosition(result.fix.coords);
    setCandidate(result.fix.coords);
    setMapFocus(result.fix.coords);
    setInputError(null);
  };

  const applyTyped = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseCoordinates(coordinatesInput);
    if (!parsed.ok) {
      setInputError(
        parsed.reason === "format"
          ? "Wpisz szerokość i długość oddzielone przecinkiem, np. 52.2297 N, 21.0122 E."
          : "Szerokość musi mieścić się w zakresie od −90 do 90, a długość od −180 do 180.",
      );
      return;
    }
    setInputError(null);
    // Przy działającej mapie wpis tylko ją centruje; zapis zawsze idzie przez „Zapisz schron”.
    setCandidate(parsed.coords);
    setMapFocus(parsed.coords);
  };

  const save = () => {
    if (candidate === null) {
      setFeedback({
        kind: "error",
        text: "Najpierw wskaż punkt: przesuń mapę, użyj swojej pozycji albo wpisz współrzędne.",
      });
      return;
    }
    const error = commit({ label: label.trim() || DEFAULT_LABEL, coords: candidate });
    if (error !== null) {
      setFeedback({ kind: "error", text: error });
      return;
    }
    setMode("idle");
    setFeedback({ kind: "saved", text: "Zapisano własny schron." });
  };

  const remove = () => {
    const error = commit(null);
    if (error !== null) {
      setFeedback({ kind: "error", text: error });
      return;
    }
    setMode("idle");
    setFeedback({ kind: "saved", text: "Usunięto własny schron." });
  };

  return (
    <section aria-labelledby={ids.title} className="border-border bg-surface rounded-lg border p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-4">
        <div
          className="bg-core-steel-soft text-core-steel-deep flex size-11 shrink-0 items-center justify-center rounded-full"
          aria-hidden="true"
        >
          <MapPin className="size-5" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <h2 id={ids.title} className="font-heading text-xl tracking-[-0.015em]">
            Własny schron
          </h2>
          {shelter && mode !== "editing" ? (
            <p className="mt-1">
              <span className="font-medium">{shelter.label}</span>
              <br />
              <span className="font-operational text-muted-foreground text-sm">
                {formatCoordinates(shelter.coords)}
              </span>
            </p>
          ) : (
            <p className="text-muted-foreground mt-1">
              Na wypadek, gdy w pobliżu nie ma schronu PSP. Wtedy alarm poprowadzi tutaj w linii prostej.
            </p>
          )}
        </div>
      </div>

      {mode === "idle" &&
        (shelter ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <Button ref={setModeFocusTarget} type="button" variant="outline" onClick={openEditor}>
              Zmień
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setFeedback(null);
                setMode("confirm-delete");
              }}
            >
              Usuń
            </Button>
          </div>
        ) : (
          <Button
            ref={setModeFocusTarget}
            type="button"
            variant="outline"
            size="lg"
            className="mt-6 w-full sm:w-auto"
            onClick={openEditor}
          >
            <MapPin strokeWidth={2} aria-hidden="true" />
            Wskaż własny schron
          </Button>
        ))}

      {mode === "confirm-delete" && (
        <div className="mt-6 space-y-4">
          <p role="alert" className="text-sm">
            {navigation.primary
              ? "Alarm poprowadzi wtedy tylko do schronu PSP z przygotowanej trasy."
              : "Bez przygotowanej trasy do schronu PSP alarm nie będzie miał dokąd prowadzić."}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button ref={setModeFocusTarget} type="button" variant="destructive" onClick={remove}>
              Na pewno usuń
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setMode("idle");
              }}
            >
              Anuluj
            </Button>
          </div>
        </div>
      )}

      {mode === "editing" && (
        <div className="mt-6 space-y-6">
          <div className="space-y-3">
            <p ref={setModeFocusTarget} tabIndex={-1} className="text-sm font-medium outline-none">
              Punkt
            </p>
            {mapSource && mapSource.kind !== "none" && !mapFailed && (
              <MapErrorBoundary fallback={null} onError={onMapError}>
                <Suspense fallback={mapPlaceholder}>
                  <PlacePickerMap
                    source={mapSource}
                    initialCenter={mapSource.center}
                    focus={mapFocus}
                    onCenterChange={onMapCenter}
                    onError={onMapError}
                  />
                </Suspense>
              </MapErrorBoundary>
            )}
            {mapUnavailable && (
              <p className="text-muted-foreground flex items-start gap-2 text-sm">
                <MapPinOff className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                {MAP_UNAVAILABLE[mapUnavailable]}
              </p>
            )}
            <p className={candidate ? "font-operational" : "text-muted-foreground"}>
              {candidate
                ? formatCoordinates(candidate)
                : mapUnavailable
                  ? "Nie wskazano"
                  : "Przesuń mapę, aby ustawić punkt pod pinezką"}
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              aria-busy={locating}
              disabled={locating}
              onClick={() => void locateMe()}
            >
              <LocateFixed strokeWidth={2} aria-hidden="true" />
              {locating ? "Ustalam pozycję…" : "Moja pozycja"}
            </Button>
          </div>

          <details
            open={coordinatesOpen}
            onToggle={(event) => {
              setCoordinatesOpen(event.currentTarget.open);
            }}
            className="group border-border border-t pt-4"
          >
            <summary className="focus-visible:ring-ring focus-visible:ring-offset-background flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md text-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
              <ChevronRight
                className="size-4 transition-transform [transition-duration:var(--duration-feedback)] group-open:rotate-90 motion-reduce:transition-none"
                strokeWidth={2}
                aria-hidden="true"
              />
              Wpisz współrzędne
            </summary>
            <form onSubmit={applyTyped} noValidate className="mt-2 space-y-2">
              <label htmlFor={ids.coordinates} className="text-muted-foreground block text-sm">
                Szerokość i długość geograficzna
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id={ids.coordinates}
                  type="text"
                  autoComplete="off"
                  placeholder="52.2297 N, 21.0122 E"
                  value={coordinatesInput}
                  aria-invalid={inputError !== null}
                  aria-describedby={inputError ? ids.coordinatesError : undefined}
                  onChange={(event) => {
                    setCoordinatesInput(event.target.value);
                  }}
                  className={cn("font-operational aria-invalid:border-destructive", inputClass)}
                />
                <Button type="submit" variant="outline">
                  Ustaw punkt
                </Button>
              </div>
              {inputError && (
                <p id={ids.coordinatesError} className="text-destructive flex items-start gap-2 text-sm">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                  {inputError}
                </p>
              )}
            </form>
          </details>

          <div className="border-border space-y-2 border-t pt-4">
            <label htmlFor={ids.label} className="block text-sm font-medium">
              Nazwa
            </label>
            <input
              id={ids.label}
              type="text"
              value={label}
              placeholder={DEFAULT_LABEL}
              aria-describedby={ids.labelHint}
              onChange={(event) => {
                setLabel(event.target.value);
              }}
              className={inputClass}
            />
            <p id={ids.labelHint} className="text-muted-foreground text-sm">
              Nazwa, którą rozpozna każdy domownik, np. „Szkoła na Długiej”.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" size="lg" className="w-full sm:w-auto" onClick={save}>
              Zapisz schron
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => {
                setFeedback(null);
                setMode("idle");
              }}
            >
              Anuluj
            </Button>
          </div>
        </div>
      )}

      <div role="status" aria-live="polite" className="mt-4 empty:hidden">
        {feedback?.kind === "saved" && (
          <p className="text-safe flex items-start gap-2 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            {feedback.text}
          </p>
        )}
        {feedback?.kind === "error" && (
          <p className="text-attention-foreground flex items-start gap-2 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            {feedback.text}
          </p>
        )}
      </div>
    </section>
  );
}
