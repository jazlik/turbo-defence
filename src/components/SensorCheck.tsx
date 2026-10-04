import { useEffect, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  CircleX,
  Compass,
  LoaderCircle,
  LocateFixed,
  Map as MapIcon,
  Route,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import VoiceCheck from "@/components/VoiceCheck";
import { useMapFile } from "@/components/hooks/useMapFile";
import { useGeolocation } from "@/components/hooks/useGeolocation";
import { requestHeadingPermission, useHeading } from "@/components/hooks/useHeading";
import { formatClockTime } from "@/lib/format";
import { mapHealth, type MapHealth } from "@/lib/map-health";
import { openMapFile, readMapPackage } from "@/lib/services/map-storage";
import { readNavigation } from "@/lib/services/navigation-storage";
import { saveLastKnownPosition } from "@/lib/services/plan-storage";
import { readSensors, writeSensors } from "@/lib/services/sensor-storage";
import { cn } from "@/lib/utils";

type SensorResult = "pending" | "working" | "denied" | "unavailable";

// Compass events arrive within milliseconds when the sensor exists; silence after this means there is none.
const COMPASS_TIMEOUT_MS = 3000;

const RESULT_COPY: Record<Exclude<SensorResult, "pending">, { label: string; icon: ReactNode; className: string }> = {
  working: {
    label: "Działa",
    icon: <CheckCircle2 className="size-5" strokeWidth={2} aria-hidden="true" />,
    className: "text-safe",
  },
  denied: {
    label: "Brak zgody",
    icon: <TriangleAlert className="size-5" strokeWidth={2} aria-hidden="true" />,
    className: "text-attention-foreground",
  },
  unavailable: {
    label: "Niedostępny",
    icon: <CircleX className="size-5" strokeWidth={2} aria-hidden="true" />,
    className: "text-destructive",
  },
};

function ResultBadge({ result }: { result: SensorResult }) {
  if (result === "pending") {
    return (
      <p className="text-muted-foreground flex items-center gap-2 font-medium">
        <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" strokeWidth={2} aria-hidden="true" />
        Sprawdzam…
      </p>
    );
  }
  const { label, icon, className } = RESULT_COPY[result];
  return (
    <p className={cn("flex items-center gap-2 font-medium", className)}>
      {icon}
      {label}
    </p>
  );
}

function Reading({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="font-operational text-lg">{value}</dd>
    </div>
  );
}

/** Read-only diagnostics: the only practical way to inspect saved routes on an iPhone without a cable. */
function RouteDiagnostics() {
  const [navigation] = useState(readNavigation);
  const { primary, alternate, lastRefresh, routingConsent } = navigation;
  const describe = (route: typeof primary) =>
    route ? `${route.destination.label} · ${formatClockTime(Date.parse(route.createdAt))}` : "brak";
  return (
    <section
      aria-labelledby="route-diagnostics-title"
      className="border-border bg-surface rounded-lg border p-6 shadow-sm"
    >
      <h2 id="route-diagnostics-title" className="font-heading flex items-center gap-3 text-2xl">
        <Route className="text-core-steel-deep size-6" strokeWidth={2} aria-hidden="true" />
        Trasa
      </h2>
      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Reading label="Trasa A" value={describe(primary)} />
        <Reading label="Trasa B" value={describe(alternate)} />
        <Reading
          label="Liczona z"
          value={primary ? `${primary.origin.latitude.toFixed(5)}, ${primary.origin.longitude.toFixed(5)}` : "—"}
        />
        <Reading label="Zgoda na serwis tras" value={routingConsent ? "Tak" : "Nie"} />
        <Reading
          label="Ostatnia próba"
          value={
            lastRefresh
              ? `${formatClockTime(Date.parse(lastRefresh.at))} · ${lastRefresh.ok ? "OK" : (lastRefresh.reason ?? "błąd")}`
              : "—"
          }
        />
      </dl>
    </section>
  );
}

const megabytes = (bytes: number | null | undefined) =>
  bytes === null || bytes === undefined ? "—" : `${(bytes / 1e6).toFixed(1)} MB`;

interface StorageReadings {
  fileBytes: number | null;
  usage: number | null;
  quota: number | null;
  persisted: boolean | null;
}

const MAP_HEALTH_LABEL: Record<MapHealth, string> = {
  none: "Nie pobrano",
  downloading: "Pobieranie w toku",
  failed: "Pobieranie przerwane",
  ready: "Gotowa",
  "file-missing": "Telefon usunął plik mapy",
};

function MapDiagnostics() {
  const [map] = useState(readMapPackage);
  const health = mapHealth(map, useMapFile(map));
  const [readings, setReadings] = useState<StorageReadings | null>(null);

  useEffect(() => {
    if (typeof navigator.storage === "undefined") return;
    void (async () => {
      const file = map ? await openMapFile(map) : null;
      const estimate = await navigator.storage.estimate().catch(() => null);
      const persisted = await navigator.storage.persisted().catch(() => null);
      setReadings({
        fileBytes: file?.size ?? null,
        usage: estimate?.usage ?? null,
        quota: estimate?.quota ?? null,
        persisted,
      });
    })();
  }, [map]);

  return (
    <section
      aria-labelledby="map-diagnostics-title"
      className="border-border bg-surface rounded-lg border p-6 shadow-sm"
    >
      <h2 id="map-diagnostics-title" className="font-heading flex items-center gap-3 text-2xl">
        <MapIcon className="text-core-steel-deep size-6" strokeWidth={2} aria-hidden="true" />
        Mapa offline
      </h2>
      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Reading label="Paczka" value={map ? `${map.regionId} ${map.version}` : "brak"} />
        <Reading
          label="Stan"
          value={
            health === "downloading" || health === "failed"
              ? `${MAP_HEALTH_LABEL[health]} · ${megabytes(map?.receivedBytes)} z ${megabytes(map?.bytes)}`
              : MAP_HEALTH_LABEL[health]
          }
        />
        <Reading label="Plik na telefonie" value={megabytes(readings?.fileBytes)} />
        <Reading
          label="Trwały magazyn"
          value={readings?.persisted === null || !readings ? "?" : readings.persisted ? "Tak" : "Nie"}
        />
        <Reading label="Zajęte / dostępne" value={`${megabytes(readings?.usage)} / ${megabytes(readings?.quota)}`} />
      </dl>
    </section>
  );
}

/** The plain-language state of the offline map and routes; the raw readings stay under "Szczegóły diagnostyczne". */
function OfflineSummary() {
  const [map] = useState(readMapPackage);
  const health = mapHealth(map, useMapFile(map));
  const [{ primary }] = useState(readNavigation);
  const rows = [
    health === "ready"
      ? { ok: true, text: "Mapa offline jest pobrana", action: null }
      : health === "file-missing"
        ? { ok: false, text: "Telefon usunął pobraną mapę", action: "Pobierz mapę ponownie" }
        : { ok: false, text: "Mapa offline nie jest pobrana", action: "Pobierz mapę" },
    primary
      ? { ok: true, text: `Trasa offline zapisana o ${formatClockTime(Date.parse(primary.createdAt))}`, action: null }
      : { ok: false, text: "Nie przygotowano tras offline", action: "Przygotuj trasy" },
  ];
  return (
    <section aria-labelledby="offline-summary-title">
      <h2 id="offline-summary-title" className="font-heading flex items-center gap-3 text-xl">
        <MapIcon className="text-core-steel-deep size-6" strokeWidth={2} aria-hidden="true" />
        Mapa i trasy
      </h2>
      <ul className="mt-4 space-y-3">
        {rows.map((row, index) => (
          <li key={row.text} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {row.ok ? (
              <CheckCircle2 className="text-safe size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
            ) : (
              <TriangleAlert className="text-attention-foreground size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
            )}
            <span className={row.ok ? "text-safe font-medium" : "font-medium"}>{row.text}</span>
            {row.action && (
              <a href={index === 0 ? "/offline" : "/miejsca"} className="text-primary text-sm underline">
                {row.action}
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function SensorCheck() {
  const [locationRequested, setLocationRequested] = useState(false);
  const [compassPermission, setCompassPermission] = useState<PermissionState | null>(null);
  const [compassTimedOut, setCompassTimedOut] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const { coords, accuracyMeters, status } = useGeolocation({ watch: locationRequested });
  const { heading, source } = useHeading(coords, accuracyMeters);

  useEffect(() => {
    if (coords) saveLastKnownPosition(coords);
  }, [coords]);

  useEffect(() => {
    if (compassPermission !== "granted") return;
    const timer = window.setTimeout(() => {
      setCompassTimedOut(true);
    }, COMPASS_TIMEOUT_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [compassPermission]);

  const checkCompass = async () => {
    // Called straight from the click handler: iOS only shows the permission prompt for a user gesture.
    setCompassTimedOut(false);
    setCompassPermission(await requestHeadingPermission());
  };

  const locationResult: SensorResult | null = !locationRequested
    ? null
    : status === "ready"
      ? "working"
      : status === "denied"
        ? "denied"
        : status === "unavailable"
          ? "unavailable"
          : "pending";

  const compassResult: SensorResult | null =
    source === "compass"
      ? "working"
      : compassPermission === null
        ? null
        : compassPermission === "denied"
          ? "denied"
          : compassTimedOut
            ? "unavailable"
            : "pending";

  // The readiness screen asks whether the sensors were checked: record it once both readings have settled.
  // The write runs in a timer callback, like the compass timeout above, so its result can reach state.
  useEffect(() => {
    if (locationResult === null || locationResult === "pending") return;
    if (compassResult === null || compassResult === "pending") return;
    const timer = window.setTimeout(() => {
      const saved = writeSensors({
        schemaVersion: 1,
        checkedAt: new Date().toISOString(),
        location: locationResult,
        compass: compassResult,
      });
      setSaveFailed(!saved);
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [locationResult, compassResult]);

  const [checkedAt] = useState(() => readSensors()?.checkedAt ?? null);

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        {checkedAt ? `Ostatnie sprawdzenie: ${formatClockTime(Date.parse(checkedAt))}` : "Jeszcze nie sprawdzono"}
      </p>

      <div className="border-border bg-surface divide-border divide-y rounded-lg border shadow-sm">
        <section aria-labelledby="location-title" className="p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id="location-title" className="font-heading flex items-center gap-3 text-2xl">
              <LocateFixed className="text-core-steel-deep size-6" strokeWidth={2} aria-hidden="true" />
              Lokalizacja
            </h2>
            <div aria-live="polite">{locationResult && <ResultBadge result={locationResult} />}</div>
          </div>

          {!locationRequested && (
            <>
              <p className="text-muted-foreground mt-2">
                Telefon zapyta o zgodę. Najlepiej sprawdzać pod otwartym niebem.
              </p>
              <Button
                type="button"
                size="lg"
                className="mt-4 w-full sm:w-auto"
                onClick={() => {
                  setLocationRequested(true);
                }}
              >
                Sprawdź lokalizację
              </Button>
            </>
          )}

          {locationResult === "denied" && (
            <p className="text-muted-foreground mt-4">
              Przeglądarka nie ma zgody na lokalizację. Otwórz ustawienia strony w przeglądarce (ikona obok adresu),
              zezwól na lokalizację i odśwież tę stronę.
            </p>
          )}
          {locationResult === "unavailable" && (
            <p className="text-muted-foreground mt-4">
              Telefon nie podaje pozycji. Sprawdź, czy usługi lokalizacji są włączone w ustawieniach systemu, i spróbuj
              pod otwartym niebem.
            </p>
          )}

          {coords && (
            <dl className="mt-6 grid grid-cols-2 gap-4">
              <Reading label="Szerokość" value={coords.latitude.toFixed(5)} />
              <Reading label="Długość" value={coords.longitude.toFixed(5)} />
              <Reading label="Dokładność" value={`±${Math.round(accuracyMeters ?? 0)} m`} />
              <Reading label="Zapisano jako ostatnią pozycję" value="Tak" />
            </dl>
          )}
        </section>

        <section aria-labelledby="compass-title" className="p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id="compass-title" className="font-heading flex items-center gap-3 text-2xl">
              <Compass className="text-core-steel-deep size-6" strokeWidth={2} aria-hidden="true" />
              Kompas
            </h2>
            <div aria-live="polite">{compassResult && <ResultBadge result={compassResult} />}</div>
          </div>

          {compassPermission === null && source !== "compass" && (
            <>
              <p className="text-muted-foreground mt-2">
                Kompas obraca strzałkę prowadzenia. Na iPhonie telefon zapyta o dostęp do ruchu i orientacji.
              </p>
              <Button type="button" size="lg" className="mt-4 w-full sm:w-auto" onClick={() => void checkCompass()}>
                Sprawdź kompas
              </Button>
            </>
          )}

          {compassResult === "denied" && (
            <p className="text-muted-foreground mt-4">
              Brak zgody na dostęp do ruchu i orientacji. Na iPhonie zamknij i otwórz aplikację, a potem dotknij
              „Sprawdź kompas” ponownie. Bez kompasu strzałka ustawi się dopiero po kilku krokach marszu.
            </p>
          )}
          {compassResult === "unavailable" && (
            <p className="text-muted-foreground mt-4">
              Ta przeglądarka nie podaje kierunku północy. Strzałka będzie liczona z kierunku marszu, po kilku krokach.
            </p>
          )}

          {heading !== null && (
            <dl className="mt-6 grid grid-cols-2 gap-4">
              <Reading label="Kurs" value={`${Math.round(heading) % 360}°`} />
              <Reading label="Źródło kursu" value={source === "compass" ? "Kompas" : "Kierunek marszu"} />
            </dl>
          )}
        </section>
      </div>

      {saveFailed && (
        <p role="status" className="text-attention-foreground flex items-start gap-2 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
          Nie udało się zapisać wyniku sprawdzenia na tym urządzeniu. Wyłącz tryb prywatny albo odblokuj dane witryny.
        </p>
      )}

      <VoiceCheck />

      <OfflineSummary />

      <details className="border-border rounded-lg border p-4">
        <summary className="text-muted-foreground min-h-11 cursor-pointer text-sm">Szczegóły diagnostyczne</summary>
        <div className="mt-4 space-y-6">
          <MapDiagnostics />
          <RouteDiagnostics />
        </div>
      </details>
    </div>
  );
}
