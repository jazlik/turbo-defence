import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Compass, Navigation2 } from "lucide-react";

import DirectionArrow from "@/components/DirectionArrow";
import MapErrorBoundary from "@/components/map/MapErrorBoundary";
import { Button } from "@/components/ui/button";
import { formatDistance } from "@/lib/geo";
import type { Guidance } from "@/lib/navigation";
import type { MapPackageState } from "@/lib/services/map-storage";
import type { Coordinates, Destination, SavedRoute } from "@/types";

const ExecutionMap = lazy(() => import("@/components/map/ExecutionMap"));

const NORTH_UP_KEY = "wrw.mapNorthUp";

/** A viewer preference only — losing it (private mode, cleared storage) just restores the default view. */
function readNorthUp(): boolean {
  try {
    return localStorage.getItem(NORTH_UP_KEY) === "1";
  } catch {
    return false;
  }
}

function writeNorthUp(northUp: boolean): void {
  try {
    localStorage.setItem(NORTH_UP_KEY, northUp ? "1" : "0");
  } catch {
    // Not persisted; the toggle still works for this visit.
  }
}

/** Started after the first /alarm render, so opening the map later is instant and never delays the first step. */
export function prefetchExecutionMap(): void {
  void import("@/components/map/ExecutionMap");
}

export interface MapNotice {
  text: string;
  /** Guidance colour for an instruction ("Wróć na trasę"), muted for a status line. */
  emphasis: boolean;
}

interface MapOverlayProps {
  mapPackage: MapPackageState;
  destination: Destination;
  route: SavedRoute | null;
  guidance: Guidance;
  /** Current step title — the map view still shows exactly one next step. */
  title: string;
  distanceCaption: string;
  notice: MapNotice | null;
  position: Coordinates | null;
  heading: number | null;
  isStale: boolean;
  /** Step actions from GuidanceScreen (voice unlock, compass, "niedostępne", switch to the big arrow). */
  controls: ReactNode;
  /** Map file or module failed — /alarm switches to the S-01 arrow view. */
  onUnavailable: () => void;
}

/** Default Execution Mode view when a saved route and the offline map exist; the big arrow is the fallback. */
export default function MapOverlay({
  mapPackage,
  destination,
  route,
  guidance,
  title,
  distanceCaption,
  notice,
  position,
  heading,
  isStale,
  controls,
  onUnavailable,
}: MapOverlayProps) {
  const [northUp, setNorthUp] = useState(readNorthUp);
  // Switching views unmounts the focused button; land focus on the step title so keyboard/screen-reader users
  // are not dropped onto <body>.
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <main aria-label="Prowadzenie na mapie" className="bg-background fixed inset-0 z-50 flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3">
        <div className="size-14 shrink-0">
          {guidance.rotation !== null && <DirectionArrow rotationDegrees={guidance.rotation} dimmed={isStale} />}
        </div>
        <div className="min-w-0 flex-1">
          <h1 ref={titleRef} tabIndex={-1} className="text-guidance truncate text-base font-semibold outline-none">
            {title}
          </h1>
          <p className="font-operational text-guidance text-3xl">
            {guidance.distanceMeters === null ? "—" : formatDistance(guidance.distanceMeters)}
          </p>
          <p className="text-muted-foreground truncate text-base">
            {distanceCaption} · {destination.label}
          </p>
        </div>
        {heading !== null && (
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="shrink-0"
            aria-pressed={northUp}
            aria-label={northUp ? "Kierunek marszu u góry" : "Północ u góry"}
            onClick={() => {
              writeNorthUp(!northUp);
              setNorthUp(!northUp);
            }}
          >
            {northUp ? (
              <Navigation2 className="size-5" strokeWidth={2} aria-hidden="true" />
            ) : (
              <Compass className="size-5" strokeWidth={2} aria-hidden="true" />
            )}
          </Button>
        )}
      </header>
      {/* Always mounted, so the first notice is announced; the distance itself stays out of live regions. */}
      <div role="status" aria-live="polite" className="empty:hidden">
        {notice && (
          <p
            className={
              notice.emphasis
                ? "font-heading text-guidance px-4 pb-2 text-xl"
                : "text-muted-foreground px-4 pb-2 text-sm"
            }
          >
            {notice.text}
          </p>
        )}
      </div>
      {heading === null && (
        <p className="text-muted-foreground px-4 pb-2 text-sm">Kierunek nieznany — mapa z północą u góry.</p>
      )}

      <div className="min-h-0 flex-1">
        <MapErrorBoundary onError={onUnavailable}>
          <Suspense fallback={<p className="text-muted-foreground p-6 text-center text-lg">Ładuję mapę…</p>}>
            <ExecutionMap
              mapPackage={mapPackage}
              route={route}
              destination={destination}
              position={position}
              heading={heading}
              northUp={northUp}
              isStale={isStale}
              onError={onUnavailable}
            />
          </Suspense>
        </MapErrorBoundary>
      </div>

      <footer className="flex flex-col items-center gap-3 px-4 py-3">{controls}</footer>
    </main>
  );
}
