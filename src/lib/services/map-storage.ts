import { regionFileName, type MapRegion } from "@/lib/map-regions";
import { isRecord } from "@/lib/services/plan-storage";

const STORAGE_KEY = "wrw.map";
const CURRENT_SCHEMA_VERSION = 1;
/** Free space needed before starting: the package plus a margin for the rest of the app. */
export const QUOTA_MARGIN = 1.2;
const PMTILES_MAGIC = "PMTiles";

export type MapPackageStatus = "downloading" | "ready" | "failed";

/** Synchronous metadata about the OPFS file, so /alarm knows without awaiting OPFS whether to offer the map. */
export interface MapPackageState {
  schemaVersion: 1;
  regionId: string;
  version: string;
  fileName: string;
  bytes: number;
  receivedBytes: number;
  etag: string | null;
  status: MapPackageStatus;
  /** ISO 8601 */
  completedAt: string | null;
}

const STATUSES: readonly MapPackageStatus[] = ["downloading", "ready", "failed"];
const nonNegative = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

export function parseMapPackage(value: unknown): MapPackageState | null {
  if (!isRecord(value) || value.schemaVersion !== CURRENT_SCHEMA_VERSION) return null;
  const { regionId, version, fileName, bytes, receivedBytes, etag, status, completedAt } = value;
  if (typeof regionId !== "string" || typeof version !== "string" || typeof fileName !== "string") return null;
  if (!nonNegative(bytes) || !nonNegative(receivedBytes)) return null;
  const knownStatus = STATUSES.find((candidate) => candidate === status);
  if (!knownStatus) return null;
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    regionId,
    version,
    fileName,
    bytes,
    receivedBytes: Math.min(receivedBytes, bytes),
    etag: typeof etag === "string" ? etag : null,
    status: knownStatus,
    completedAt: typeof completedAt === "string" ? completedAt : null,
  };
}

export function readMapPackage(): MapPackageState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === null ? null : parseMapPackage(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeMapPackage(state: MapPackageState | null): void {
  try {
    if (state === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable — the map stays unavailable and guidance works without it.
  }
}

/** The state to download `region` with: resume a matching unfinished package, otherwise start from zero. */
export function downloadStateFor(region: MapRegion, current: MapPackageState | null): MapPackageState {
  const sameVersion = current?.regionId === region.id && current.version === region.version;
  if (sameVersion && current.status !== "ready") return { ...current, status: "downloading" };
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    regionId: region.id,
    version: region.version,
    fileName: regionFileName(region),
    bytes: region.bytes,
    receivedBytes: 0,
    etag: null,
    status: "downloading",
    completedAt: null,
  };
}

export const isMapReady = (state: MapPackageState | null): state is MapPackageState => state?.status === "ready";

export function mapStorageSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "storage" in navigator &&
    typeof navigator.storage.getDirectory === "function" &&
    typeof Worker !== "undefined"
  );
}

export async function openMapFile(state: MapPackageState): Promise<File | null> {
  try {
    const root = await navigator.storage.getDirectory();
    return await (await root.getFileHandle(state.fileName)).getFile();
  } catch {
    return null;
  }
}

/** Size and PMTiles magic: cheap proof the file on disk is the whole package before marking it ready. */
export async function verifyMapFile(file: File, expectedBytes: number): Promise<boolean> {
  if (file.size !== expectedBytes) return false;
  const head = new TextDecoder().decode(await file.slice(0, PMTILES_MAGIC.length).arrayBuffer());
  return head === PMTILES_MAGIC;
}

/** Old package versions are removed only after the new one is ready. */
export async function removeOtherMapFiles(keep: string): Promise<void> {
  const root = await navigator.storage.getDirectory();
  const names: string[] = [];
  for await (const name of (root as FileSystemDirectoryHandle & { keys(): AsyncIterable<string> }).keys()) {
    if (name.endsWith(".pmtiles") && name !== keep) names.push(name);
  }
  await Promise.all(names.map((name) => root.removeEntry(name).catch(() => undefined)));
}
