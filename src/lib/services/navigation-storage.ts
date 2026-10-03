import { isRecord, parseCoords } from "@/lib/services/plan-storage";
import type { Destination, LngLat, NavigationState, RouteRefreshFailure, RouteRole, SavedRoute } from "@/types";

const STORAGE_KEY = "wrw.navigation";
const CURRENT_SCHEMA_VERSION = 1;
const REFRESH_FAILURES: readonly RouteRefreshFailure[] = ["offline", "no-position", "no-candidates", "routing-error"];

export function createEmptyNavigation(): NavigationState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    primary: null,
    alternate: null,
    active: "primary",
    routingConsent: false,
    lastRefresh: null,
  };
}

const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isIsoDate = (value: unknown): value is string => typeof value === "string" && !Number.isNaN(Date.parse(value));

function parseDestination(value: unknown): Destination | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.label !== "string") return null;
  if (value.source !== "psp" && value.source !== "manual") return null;
  const coords = parseCoords(value.coords);
  if (!coords) return null;
  const destination: Destination = { id: value.id, label: value.label, coords, source: value.source };
  if (typeof value.address === "string") destination.address = value.address;
  if (typeof value.availability === "string") destination.availability = value.availability;
  return destination;
}

function parseGeometry(value: unknown): LngLat[] | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const geometry: LngLat[] = [];
  for (const point of value) {
    if (!Array.isArray(point) || point.length < 2) return null;
    const [longitude, latitude] = point as unknown[];
    if (!parseCoords({ latitude, longitude })) return null;
    geometry.push([longitude as number, latitude as number]);
  }
  return geometry;
}

function parseRoute(value: unknown): SavedRoute | null {
  if (!isRecord(value)) return null;
  const destination = parseDestination(value.destination);
  const origin = parseCoords(value.origin);
  const geometry = parseGeometry(value.geometry);
  if (!destination || !origin || !geometry) return null;
  if (!isFiniteNumber(value.distanceMeters) || value.distanceMeters < 0) return null;
  if (!isIsoDate(value.createdAt) || typeof value.provider !== "string") return null;
  return {
    destination,
    origin,
    geometry,
    distanceMeters: value.distanceMeters,
    durationSeconds: isFiniteNumber(value.durationSeconds) ? value.durationSeconds : null,
    createdAt: value.createdAt,
    provider: value.provider,
  };
}

function parseLastRefresh(value: unknown): NavigationState["lastRefresh"] {
  if (!isRecord(value) || !isIsoDate(value.at) || typeof value.ok !== "boolean") return null;
  const reason = REFRESH_FAILURES.find((failure) => failure === value.reason);
  return reason ? { at: value.at, ok: value.ok, reason } : { at: value.at, ok: value.ok };
}

/** Field-by-field validation like parsePlan: a damaged route becomes null and guidance falls back to S-01. */
export function parseNavigation(value: unknown): NavigationState {
  if (!isRecord(value) || value.schemaVersion !== CURRENT_SCHEMA_VERSION) return createEmptyNavigation();
  const primary = parseRoute(value.primary);
  const alternate = parseRoute(value.alternate);
  const active: RouteRole = value.active === "alternate" && alternate ? "alternate" : "primary";
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    primary,
    alternate,
    active,
    routingConsent: value.routingConsent === true,
    lastRefresh: parseLastRefresh(value.lastRefresh),
  };
}

/** Synchronous on purpose, like readPlan: /alarm renders the route in its first pass. Never throws. */
export function readNavigation(): NavigationState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === null ? createEmptyNavigation() : parseNavigation(JSON.parse(raw));
  } catch {
    return createEmptyNavigation();
  }
}

export function writeNavigation(state: NavigationState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable — guidance keeps working from the plan (S-01 fallback).
  }
}

export function activeRoute(state: NavigationState): SavedRoute | null {
  return state.active === "alternate" ? (state.alternate ?? state.primary) : state.primary;
}

/** For S-02: switch guidance to the prepared alternate destination without recomputing anything. */
export function setActiveRoute(role: RouteRole): NavigationState {
  const state = readNavigation();
  const next: NavigationState = { ...state, active: role === "alternate" && state.alternate ? "alternate" : "primary" };
  writeNavigation(next);
  return next;
}
