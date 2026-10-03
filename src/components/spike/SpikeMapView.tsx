// Phase 1 spike only (removed in Phase 6): renders the OPFS package with the production style builder.
import { useEffect, useRef, useState } from "react";
import { addProtocol, Map as MapLibreMap, setWorkerUrl, type GeoJSONSource } from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { FileSource, PMTiles, Protocol } from "pmtiles";
import "maplibre-gl/dist/maplibre-gl.css";

import { useGeolocation } from "@/components/hooks/useGeolocation";
import { useHeading } from "@/components/hooks/useHeading";
import { distanceMeters } from "@/lib/geo";
import { buildMapStyle } from "@/lib/map-style";

setWorkerUrl(maplibreWorkerUrl);
const protocol = new Protocol();
addProtocol("pmtiles", protocol.tile);

const PLACES = {
  "Kraków Rynek z17": { center: [19.9373, 50.0617] as [number, number], zoom: 17 },
  "Kraków z13": { center: [19.945, 50.06] as [number, number], zoom: 13 },
  "Tarnów z16": { center: [20.9886, 50.0125] as [number, number], zoom: 16 },
  "Nowy Sącz z16": { center: [20.6917, 49.625] as [number, number], zoom: 16 },
};

// Throttle thresholds from the plan: sensor-rate heading must not drive jumpTo on every event.
const MIN_BEARING_DELTA = 3;

export default function SpikeMapView({ file }: { file: File }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [headingUp, setHeadingUp] = useState(true);
  const [follow, setFollow] = useState(true);
  const [info, setInfo] = useState("");
  const { coords, accuracyMeters } = useGeolocation();
  const { heading, source } = useHeading(coords, accuracyMeters);
  const lastBearing = useRef(0);

  useEffect(() => {
    if (!container.current) return;
    protocol.add(new PMTiles(new FileSource(file)));
    const map = new MapLibreMap({
      container: container.current,
      style: buildMapStyle(file.name),
      center: PLACES["Kraków Rynek z17"].center,
      zoom: 16,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: { compact: true },
    });
    map.touchZoomRotate.disableRotation();
    map.on("load", () => {
      map.addSource("user", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "user",
        type: "circle",
        source: "user",
        paint: {
          "circle-radius": 8,
          "circle-color": "#f3f7fa",
          "circle-stroke-color": "#0b1117",
          "circle-stroke-width": 3,
        },
      });
    });
    map.on("moveend", () => {
      setInfo(`z${map.getZoom().toFixed(1)} · bearing ${Math.round(map.getBearing())}°`);
    });
    mapRef.current = map;
    // Spike debugging handle for DevTools / remote inspection.
    (window as unknown as { spikeMap?: MapLibreMap }).spikeMap = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [file]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !coords) return;
    const point = { type: "Point" as const, coordinates: [coords.longitude, coords.latitude] };
    void map.getSource<GeoJSONSource>("user")?.setData({ type: "Feature", properties: {}, geometry: point });
    if (!follow) return;
    const bearing = headingUp && heading !== null ? heading : 0;
    const turn = Math.abs(((bearing - lastBearing.current + 540) % 360) - 180);
    const center = map.getCenter();
    const moved = distanceMeters({ latitude: center.lat, longitude: center.lng }, coords);
    if (turn < MIN_BEARING_DELTA && moved < 2) return;
    lastBearing.current = bearing;
    map.jumpTo({
      center: [coords.longitude, coords.latitude],
      bearing,
      padding: { top: 200, bottom: 0, left: 0, right: 0 },
    });
  }, [coords, heading, headingUp, follow]);

  return (
    <div className="space-y-2">
      <div ref={container} className="h-[70vh] w-full overflow-hidden rounded-md" />
      <p className="text-muted-foreground text-sm">
        {info} · kurs: {heading ?? "—"} ({source ?? "brak"}) · GPS:{" "}
        {coords ? `±${Math.round(accuracyMeters ?? 0)} m` : "brak"}
      </p>
      <div className="flex flex-wrap gap-2 text-sm">
        <button
          type="button"
          className="rounded border px-2 py-1"
          onClick={() => {
            setHeadingUp((v) => !v);
          }}
        >
          {headingUp ? "Heading-up ✓" : "North-up"}
        </button>
        <button
          type="button"
          className="rounded border px-2 py-1"
          onClick={() => {
            setFollow((v) => !v);
          }}
        >
          {follow ? "Śledzenie ✓" : "Śledzenie ✗"}
        </button>
        {Object.entries(PLACES).map(([label, view]) => (
          <button
            key={label}
            type="button"
            className="rounded border px-2 py-1"
            onClick={() => {
              setFollow(false);
              mapRef.current?.jumpTo({ ...view, bearing: 0 });
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
