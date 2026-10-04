import { useEffect, useRef } from "react";
import { MapPin } from "lucide-react";
import { Map as MapLibreMap } from "maplibre-gl";
import { FileSource, PMTiles } from "pmtiles";

import { protocol, readMapPalette } from "@/components/map/pmtiles";
import { buildMapStyle } from "@/lib/map-style";
import type { MapSource } from "@/lib/map-source";
import { openMapFile } from "@/lib/services/map-storage";
import type { Coordinates } from "@/types";

const START_ZOOM = 16;

export interface PlacePickerMapProps {
  source: Exclude<MapSource, { kind: "none" }>;
  initialCenter: Coordinates;
  /** A new value (by reference) moves the map there: "Moja pozycja" or typed coordinates. */
  focus: Coordinates | null;
  /** The point under the pin, after every move — the candidate the card saves. */
  onCenterChange: (coords: Coordinates) => void;
  onError: () => void;
}

const lngLat = ({ latitude, longitude }: Coordinates): [number, number] => [longitude, latitude];

/** Opens the package: from OPFS when downloaded, otherwise by HTTP Range from R2 (header read up front). */
async function openTiles(source: PlacePickerMapProps["source"]): Promise<string | null> {
  if (source.kind === "local") {
    const file = await openMapFile(source);
    if (!file) return null;
    protocol.add(new PMTiles(new FileSource(file)));
    return file.name;
  }
  const tiles = new PMTiles(source.url);
  // A failed header (offline, CORS, missing file) means no tiles will ever load — fall back to coordinates now.
  await tiles.getHeader();
  protocol.add(tiles);
  return source.url;
}

/**
 * Preparation-mode map with a fixed pin in the middle: the user moves the map, not the pin, so the point is
 * set from home without standing at the shelter. North up, no rotation or tilt.
 */
export default function PlacePickerMap({ source, initialCenter, focus, onCenterChange, onError }: PlacePickerMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const callbacks = useRef({ onCenterChange, onError });
  // A focus requested while the package is still opening is applied when the map is created.
  const pendingFocus = useRef(focus);

  useEffect(() => {
    callbacks.current = { onCenterChange, onError };
  }, [onCenterChange, onError]);

  useEffect(() => {
    let cancelled = false;
    openTiles(source)
      .then((key) => {
        if (cancelled || !container.current) return;
        if (key === null) {
          callbacks.current.onError();
          return;
        }
        const map = new MapLibreMap({
          container: container.current,
          style: buildMapStyle(key, readMapPalette()),
          center: lngLat(pendingFocus.current ?? initialCenter),
          zoom: START_ZOOM,
          pitch: 0,
          maxPitch: 0,
          bearing: 0,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          attributionControl: { compact: true },
        });
        map.touchZoomRotate.disableRotation();
        map.keyboard.disableRotation();
        let loaded = false;
        map.on("load", () => {
          loaded = true;
        });
        // Before "load" an error means the style or the package is unusable; later ones are single tiles.
        map.on("error", () => {
          if (!loaded) callbacks.current.onError();
        });
        map.on("moveend", () => {
          const { lat, lng } = map.getCenter();
          callbacks.current.onCenterChange({ latitude: lat, longitude: lng });
        });
        mapRef.current = map;
      })
      .catch(() => {
        if (!cancelled) callbacks.current.onError();
      });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // The map is created once per source; later centring goes through `focus`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.kind === "local" ? source.fileName : source.url]);

  useEffect(() => {
    pendingFocus.current = focus;
    if (focus === null) return;
    mapRef.current?.jumpTo({ center: lngLat(focus) });
  }, [focus]);

  return (
    <div className="border-border relative h-72 overflow-hidden rounded-md border">
      <div
        ref={container}
        className="h-full w-full"
        role="application"
        aria-label="Mapa — przesuń, by ustawić schron pod pinezką"
      />
      {/* The pin's tip marks the centre; it sits above the map, so it never moves with it. */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full"
        aria-hidden="true"
      >
        <MapPin className="text-primary fill-surface size-10 drop-shadow-md" strokeWidth={2.25} />
      </div>
      <div
        className="bg-primary pointer-events-none absolute top-1/2 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
        aria-hidden="true"
      />
    </div>
  );
}
