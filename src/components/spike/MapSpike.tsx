// Phase 1 spike only (removed in Phase 6): OPFS download + offline map check on real phones.
import { lazy, Suspense, useEffect, useRef, useState } from "react";

import type { MapDownloadMessage, MapDownloadRequest } from "@/workers/map-download.worker";

const SpikeMapView = lazy(() => import("@/components/spike/SpikeMapView"));

const DEFAULT_SRC = "https://pub-52c8b7e32b42466d9dc408ed80a9241c.r2.dev/malopolska-20261003-lean2.pmtiles";

const mb = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`;

function sourceUrl(): string {
  return new URLSearchParams(location.search).get("src") ?? DEFAULT_SRC;
}

const fileNameOf = (url: string) => url.split("/").pop() ?? "map.pmtiles";

interface StorageInfo {
  persisted: boolean | null;
  usage: number | null;
  quota: number | null;
  fileBytes: number | null;
  standalone: boolean;
  opfs: boolean;
}

async function readStorage(fileName: string): Promise<StorageInfo> {
  const standalone =
    matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const opfs = typeof navigator.storage.getDirectory === "function";
  const estimate = await navigator.storage.estimate().catch(() => null);
  const persisted = await navigator.storage.persisted().catch(() => null);
  let fileBytes: number | null = null;
  if (opfs) {
    try {
      const root = await navigator.storage.getDirectory();
      fileBytes = (await (await root.getFileHandle(fileName)).getFile()).size;
    } catch {
      fileBytes = null;
    }
  }
  return { persisted, usage: estimate?.usage ?? null, quota: estimate?.quota ?? null, fileBytes, standalone, opfs };
}

export default function MapSpike() {
  const [url] = useState(sourceUrl);
  const fileName = fileNameOf(url);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [progress, setProgress] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [requests, setRequests] = useState<string[]>([]);
  const worker = useRef<Worker | null>(null);
  const startedAt = useRef(0);

  const refresh = () => {
    void readStorage(fileName).then(setStorage);
  };

  useEffect(refresh, [fileName]);

  useEffect(() => {
    // Every resource fetched after the map opens; in airplane mode only same-origin precache hits may appear.
    const observer = new PerformanceObserver((list) => {
      const names = list.getEntries().map((entry) => entry.name.replace(location.origin, ""));
      setRequests((current) => [...current, ...names].slice(-40));
    });
    observer.observe({ type: "resource", buffered: false });
    return () => {
      observer.disconnect();
    };
  }, []);

  const startDownload = async () => {
    await navigator.storage.persist().catch(() => false);
    worker.current?.terminate();
    const next = new Worker(new URL("../../workers/map-download.worker.ts", import.meta.url), { type: "module" });
    worker.current = next;
    startedAt.current = performance.now();
    next.onmessage = (event: MessageEvent<MapDownloadMessage>) => {
      const message = event.data;
      const seconds = (performance.now() - startedAt.current) / 1000;
      if (message.type === "error") {
        setProgress(`Błąd: ${message.message}`);
        return;
      }
      const line = `${mb(message.receivedBytes)} z ${mb(message.totalBytes)} · ${seconds.toFixed(0)} s · ETag ${message.etag ?? "brak"}`;
      setProgress(message.type === "done" ? `Gotowe: ${line}` : line);
      if (message.type === "done") refresh();
    };
    const request: MapDownloadRequest = { type: "start", url, fileName, etag: null };
    next.postMessage(request);
  };

  const removeFile = async () => {
    worker.current?.terminate();
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(fileName).catch(() => undefined);
    setFile(null);
    refresh();
  };

  const openMap = async () => {
    const root = await navigator.storage.getDirectory();
    setRequests([]);
    setFile(await (await root.getFileHandle(fileName)).getFile());
  };

  return (
    <div className="space-y-4 text-base">
      <section className="space-y-1">
        <p className="text-sm break-all">Źródło: {url}</p>
        {storage && (
          <ul className="text-muted-foreground text-sm">
            <li>
              OPFS: {storage.opfs ? "tak" : "NIE"} · zainstalowana (standalone): {storage.standalone ? "tak" : "nie"}
            </li>
            <li>persisted: {String(storage.persisted)}</li>
            <li>
              usage/quota: {storage.usage === null ? "?" : mb(storage.usage)} /{" "}
              {storage.quota === null ? "?" : mb(storage.quota)}
            </li>
            <li>plik w OPFS: {storage.fileBytes === null ? "brak" : mb(storage.fileBytes)}</li>
          </ul>
        )}
        <p className="text-sm">{progress}</p>
      </section>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded border px-3 py-2" onClick={() => void startDownload()}>
          Pobierz / wznów
        </button>
        <button type="button" className="rounded border px-3 py-2" onClick={refresh}>
          Odśwież stan
        </button>
        <button type="button" className="rounded border px-3 py-2" onClick={() => void openMap()}>
          Otwórz mapę z OPFS
        </button>
        <button type="button" className="rounded border px-3 py-2" onClick={() => void removeFile()}>
          Usuń plik
        </button>
      </div>
      {file && (
        <Suspense fallback={<p>Ładuję MapLibre…</p>}>
          <SpikeMapView file={file} />
        </Suspense>
      )}
      <details>
        <summary className="text-sm">Żądania od otwarcia mapy ({requests.length})</summary>
        <ul className="text-muted-foreground text-xs break-all">
          {requests.map((name, index) => (
            <li key={index}>{name}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
