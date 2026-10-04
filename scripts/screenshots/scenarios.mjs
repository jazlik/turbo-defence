import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The real backpack builder gives exact item ids and quantities (a stale quantity counts as "outdated").
const outfile = join(mkdtempSync(join(tmpdir(), "wrw-shots-")), "backpack.mjs");
await build({ entryPoints: ["src/lib/backpack.ts"], bundle: true, format: "esm", outfile, alias: { "@": "./src" }, logLevel: "silent" });
const { buildBackpack, isKeyItem } = await import(pathToFileURL(outfile).href);
const packAll = (members, only = () => true) =>
  buildBackpack(members).filter(only).map((item) => ({ itemId: item.id, quantity: item.quantity?.amount ?? null }));

// Seeds for the iPhone 13 mini screenshot run. Shapes follow src/lib/services/*-storage.ts.
const NOW = new Date().toISOString();
const ORIGIN = { latitude: 50.0647, longitude: 19.945 };
const SHELTER = { latitude: 50.0647, longitude: 19.93 };

const BASE_IDS = [
  "water", "food", "clothes", "blanket", "masks", "documents", "cash", "flashlight", "radio", "powerbank",
  "first-aid", "fire", "knife", "whistle", "hygiene", "trash-bags", "notebook", "guide",
];
const CHILD_IDS = ["child-documents", "child-clothes", "child-snacks", "child-diapers", "child-toy", "child-card"];
const KEY_IDS = ["water", "food", "documents", "first-aid"];
const packed = (ids) => ids.map((itemId) => ({ itemId, quantity: null }));

const members = [
  { id: "m1", name: "Ola", category: "child", needs: [] },
  { id: "m2", name: "Marek", category: "adult", needs: [{ kind: "medication" }] },
];
const contacts = [{ id: "c1", name: "Anna Kowalska", phone: "+48 600 100 200", relation: "Siostra" }];

const plan = (over = {}) => ({
  schemaVersion: 5,
  shelter: null,
  lastKnownPosition: { coords: ORIGIN, recordedAt: NOW },
  members: [],
  contacts: [],
  packedItems: [],
  updatedAt: NOW,
  ...over,
});

const route = (id, label, dest) => ({
  destination: { id, label, coords: dest, source: "psp", address: label, availability: "Całodobowa" },
  origin: ORIGIN,
  geometry: [
    [ORIGIN.longitude, ORIGIN.latitude],
    [19.9375, ORIGIN.latitude],
    [dest.longitude, dest.latitude],
  ],
  distanceMeters: 1050,
  durationSeconds: 760,
  createdAt: NOW,
  provider: "osrm",
});

const navigation = (withAlternate = true) => ({
  schemaVersion: 1,
  primary: route("OZO-1", "ul. Stańczyka 18, Kraków", SHELTER),
  alternate: withAlternate ? route("OZO-2", "ul. Dietla 50, Kraków", { latitude: 50.0555, longitude: 19.94 }) : null,
  active: "primary",
  routingConsent: true,
  lastRefresh: { at: NOW, ok: true },
});

const mapReady = {
  schemaVersion: 1,
  regionId: "malopolska",
  version: "20261003-lean2",
  fileName: "malopolska-20261003-lean2.pmtiles",
  bytes: 99077167,
  receivedBytes: 99077167,
  etag: null,
  status: "ready",
  completedAt: NOW,
};
const sensors = { schemaVersion: 1, checkedAt: NOW, location: "working", compass: "working" };
const run = (stepId) => ({ schemaVersion: 1, stepId, fallbackActive: false, startedAt: NOW, updatedAt: NOW });

const full = plan({
  shelter: { label: "Moja szkoła", coords: SHELTER },
  members,
  contacts,
  packedItems: packAll(members),
});

// Backpack with a third of the list still to pack, so the "Do spakowania" / "Spakowane" split is visible.
let packedIndex = 0;
const partial = { ...full, packedItems: packAll(members, () => packedIndex++ % 3 !== 0) };

// Positions (route runs west along lat 50.0647 from 19.945 to 19.93).
export const POS = {
  onRoute: { latitude: 50.0647, longitude: 19.94, accuracy: 8 },
  rejoin: { latitude: 50.0657, longitude: 19.94, accuracy: 8 },
  arrived: { latitude: 50.0647, longitude: 19.93005, accuracy: 6 },
};

/** `ready` is a selector that appears once the island has mounted. */
export const core = [
  { name: "home-start", path: "/", storage: {}, ready: "text=Zaczynamy" },
  { name: "home-basics", path: "/", storage: { "wrw.plan": plan({ shelter: { label: "Moja szkoła", coords: SHELTER } }) }, ready: "text=Podstawy" },
  {
    name: "home-ready-to-go",
    path: "/",
    storage: {
      "wrw.plan": plan({ shelter: { label: "Moja szkoła", coords: SHELTER }, members, contacts, packedItems: packAll(members, isKeyItem) }),
    },
    ready: "text=Gotowi do wyjścia",
  },
  {
    name: "home-ready-72h",
    path: "/",
    standalone: true,
    storage: { "wrw.plan": full, "wrw.navigation": navigation(), "wrw.map": mapReady, "wrw.sensors": sensors },
    ready: "text=Plan przygotowany",
  },
  { name: "home-alarm-hold", path: "/", storage: {}, ready: "text=Uruchom alarm", action: "hold-alarm" },

  { name: "alarm-no-target", path: "/alarm", storage: {}, ready: "text=Nie ma przygotowanego celu" },
  { name: "alarm-backpack", path: "/alarm", storage: { "wrw.plan": full }, ready: "text=Zrobione" },
  { name: "alarm-gps-search", path: "/alarm", storage: { "wrw.plan": { ...full, lastKnownPosition: null }, "wrw.navigation": navigation(), "wrw.run": run("shelter") }, ready: "text=Szukam", noPos: true, resume: true },
  { name: "alarm-nav-route", path: "/alarm", storage: { "wrw.plan": full, "wrw.navigation": navigation(), "wrw.run": run("shelter") }, pos: POS.onRoute, resume: true },
  { name: "alarm-nav-direct", path: "/alarm", storage: { "wrw.plan": full, "wrw.run": run("shelter") }, pos: POS.onRoute, resume: true },
  { name: "alarm-nav-rejoin", path: "/alarm", storage: { "wrw.plan": full, "wrw.navigation": navigation(), "wrw.run": run("shelter") }, pos: POS.rejoin, resume: true },
  { name: "alarm-arrived", path: "/alarm", storage: { "wrw.plan": full, "wrw.navigation": navigation(), "wrw.run": run("shelter") }, pos: POS.arrived, resume: true },
  { name: "alarm-resume-prompt", path: "/alarm", storage: { "wrw.plan": full, "wrw.navigation": navigation(), "wrw.run": run("shelter") }, ready: "text=Przerwana", pos: POS.onRoute },

  { name: "miejsca", path: "/miejsca", storage: { "wrw.plan": full, "wrw.navigation": navigation() }, ready: "text=Miejsca" },
  { name: "domownicy", path: "/domownicy", storage: { "wrw.plan": full }, ready: "text=Ola" },
  { name: "plecak", path: "/plecak", storage: { "wrw.plan": partial }, ready: "text=Do spakowania" },
  { name: "offline", path: "/offline", standalone: true, storage: { "wrw.plan": full, "wrw.navigation": navigation(), "wrw.map": mapReady }, ready: "text=Mapa" },
  { name: "czujniki", path: "/czujniki", storage: { "wrw.plan": full, "wrw.sensors": sensors }, ready: "text=Lokalizacja", pos: POS.onRoute },
];
