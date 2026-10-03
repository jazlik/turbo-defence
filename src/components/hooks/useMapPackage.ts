import { useCallback, useEffect, useRef, useState } from "react";

import { proposeRegion, type MapRegion } from "@/lib/map-regions";
import {
  downloadStateFor,
  mapStorageSupported,
  openMapFile,
  QUOTA_MARGIN,
  readMapPackage,
  removeOtherMapFiles,
  verifyMapFile,
  writeMapPackage,
  type MapPackageState,
} from "@/lib/services/map-storage";
import { readPlan } from "@/lib/services/plan-storage";
import type { MapDownloadMessage, MapDownloadRequest } from "@/workers/map-download.worker";

/** iOS keeps a home-screen PWA's storage apart from Safari's: a map downloaded in a Safari tab is not in the app. */
function needsHomeScreenInstall(): boolean {
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    matchMedia("(display-mode: standalone)").matches;
  return ios && !standalone;
}

export interface MapPackage {
  state: MapPackageState | null;
  region: MapRegion;
  /** false: the last known position is outside the region; null: position unknown. */
  covers: boolean | null;
  supported: boolean;
  needsInstall: boolean;
  error: string | null;
  start: () => Promise<void>;
}

export function useMapPackage(): MapPackage {
  const [state, setState] = useState(readMapPackage);
  const [error, setError] = useState<string | null>(null);
  const [{ region, covers }] = useState(() => proposeRegion(readPlan().lastKnownPosition?.coords ?? null));
  const [supported] = useState(mapStorageSupported);
  const [needsInstall] = useState(needsHomeScreenInstall);
  const worker = useRef<Worker | null>(null);

  const update = useCallback((next: MapPackageState | null) => {
    writeMapPackage(next);
    setState(next);
  }, []);

  const start = useCallback(async () => {
    if (!supported || worker.current) return;
    const estimate = await navigator.storage.estimate().catch(() => null);
    // State updates only after the first await: start() also runs from the resume effect.
    setError(null);
    let current = downloadStateFor(region, readMapPackage());
    if (estimate?.quota !== undefined && estimate.usage !== undefined) {
      const missing = region.bytes * QUOTA_MARGIN - current.receivedBytes;
      if (estimate.quota - estimate.usage < missing) {
        setError("Za mało miejsca na telefonie. Zwolnij miejsce i spróbuj ponownie.");
        return;
      }
    }
    // Consent was just given (or given before, when resuming): ask the browser not to evict the map.
    await navigator.storage.persist().catch(() => false);
    update(current);

    const next = new Worker(new URL("../../workers/map-download.worker.ts", import.meta.url), { type: "module" });
    worker.current = next;
    const stop = () => {
      next.terminate();
      worker.current = null;
    };
    next.onmessage = (event: MessageEvent<MapDownloadMessage>) => {
      const message = event.data;
      if (message.type === "error") {
        stop();
        update({ ...current, status: "failed" });
        setError(`Pobieranie przerwane: ${message.message} Dokończę od miejsca przerwania.`);
        return;
      }
      current = { ...current, receivedBytes: message.receivedBytes, etag: message.etag };
      if (message.type === "progress") {
        update(current);
        return;
      }
      stop();
      // Ready only after the whole file is on disk and starts with the PMTiles header — /alarm trusts this flag.
      void openMapFile(current).then(async (file) => {
        if (file && (await verifyMapFile(file, region.bytes))) {
          update({ ...current, status: "ready", completedAt: new Date().toISOString() });
          await removeOtherMapFiles(current.fileName).catch(() => undefined);
        } else {
          update({ ...current, receivedBytes: 0, status: "failed" });
          setError("Pobrany plik mapy jest niekompletny. Spróbuj pobrać ponownie.");
        }
      });
    };
    const request: MapDownloadRequest = {
      type: "start",
      url: region.url,
      fileName: current.fileName,
      etag: current.etag,
    };
    next.postMessage(request);
  }, [region, supported, update]);

  useEffect(() => {
    // Consent was given earlier: an interrupted download continues on its own when the app opens again.
    const resume =
      readMapPackage()?.status === "downloading"
        ? window.setTimeout(() => {
            void start();
          }, 0)
        : undefined;
    return () => {
      window.clearTimeout(resume);
      worker.current?.terminate();
      worker.current = null;
    };
  }, [start]);

  return { state, region, covers, supported, needsInstall, error, start };
}
