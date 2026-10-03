import { Component, lazy, Suspense, useState, type ReactNode } from "react";
import { ArrowLeft, MapPinOff } from "lucide-react";

import DirectionArrow from "@/components/DirectionArrow";
import { Button } from "@/components/ui/button";
import { formatDistance } from "@/lib/geo";
import type { Guidance } from "@/lib/navigation";
import type { MapPackageState } from "@/lib/services/map-storage";
import type { Coordinates, Destination, SavedRoute } from "@/types";

const ExecutionMap = lazy(() => import("@/components/map/ExecutionMap"));

/** Started after the first /alarm render, so opening the map later is instant and never delays the first step. */
export function prefetchExecutionMap(): void {
  void import("@/components/map/ExecutionMap");
}

/** A failing map module must never take the arrow screen down with it. */
class MapErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

interface MapOverlayProps {
  mapPackage: MapPackageState;
  destination: Destination;
  route: SavedRoute | null;
  guidance: Guidance;
  distanceCaption: string;
  position: Coordinates | null;
  heading: number | null;
  isStale: boolean;
  onClose: () => void;
}

export default function MapOverlay({
  mapPackage,
  destination,
  route,
  guidance,
  distanceCaption,
  position,
  heading,
  isStale,
  onClose,
}: MapOverlayProps) {
  const [failed, setFailed] = useState(false);
  const unavailable = (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <MapPinOff className="text-guidance size-12" strokeWidth={2} aria-hidden="true" />
      <p className="font-heading text-2xl">Mapa niedostępna</p>
      <p className="text-muted-foreground text-lg">Prowadź strzałką — działa bez mapy.</p>
    </div>
  );

  return (
    <div role="dialog" aria-modal="true" aria-label="Mapa" className="bg-background fixed inset-0 z-50 flex flex-col">
      <header className="flex items-center gap-4 px-4 py-3">
        <div className="size-14 shrink-0">
          {guidance.rotation !== null && <DirectionArrow rotationDegrees={guidance.rotation} dimmed={isStale} />}
        </div>
        <div className="min-w-0">
          <p className="font-operational text-guidance text-3xl">
            {guidance.distanceMeters === null ? "—" : formatDistance(guidance.distanceMeters)}
          </p>
          <p className="text-muted-foreground truncate text-base">
            {distanceCaption} · {destination.label}
          </p>
        </div>
      </header>
      {heading === null && (
        <p className="text-muted-foreground px-4 pb-2 text-sm">Kierunek nieznany — mapa z północą u góry.</p>
      )}

      <div className="min-h-0 flex-1">
        {failed ? (
          unavailable
        ) : (
          <MapErrorBoundary fallback={unavailable}>
            <Suspense fallback={<p className="text-muted-foreground p-6 text-center text-lg">Ładuję mapę…</p>}>
              <ExecutionMap
                mapPackage={mapPackage}
                route={route}
                destination={destination}
                position={position}
                heading={heading}
                isStale={isStale}
                onError={() => {
                  setFailed(true);
                }}
              />
            </Suspense>
          </MapErrorBoundary>
        )}
      </div>

      <footer className="px-4 py-3">
        <Button type="button" variant="secondary" size="lg" className="w-full text-lg" autoFocus onClick={onClose}>
          <ArrowLeft className="size-5" strokeWidth={2} aria-hidden="true" />
          Wróć do strzałki
        </Button>
      </footer>
    </div>
  );
}
