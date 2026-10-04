import { describe, expect, it } from "vitest";

import { buildBackpack, isKeyItem } from "./backpack";
import { MAP_REGIONS } from "./map-regions";
import { computeReadiness, type QuickWinId, type Readiness, type ReadinessInput } from "./readiness";
import { createEmptyNavigation } from "./services/navigation-storage";
import { createEmptyPlan } from "./services/plan-storage";
import type { MapPackageState } from "./services/map-storage";
import type { SensorCheckState } from "./services/sensor-storage";
import type { Coordinates, HouseholdMember, HouseholdPlan, NavigationState, Place, SavedRoute } from "@/types";

const krakow: Coordinates = { latitude: 50.0617, longitude: 19.9373 };
const warsaw: Coordinates = { latitude: 52.2297, longitude: 21.0122 };
const place = (label: string): Place => ({ label, coords: krakow });

const route: SavedRoute = {
  destination: { id: "OZO-1", label: "Schron", coords: { latitude: 50.07, longitude: 19.89 }, source: "psp" },
  origin: krakow,
  geometry: [
    [19.9373, 50.0617],
    [19.89, 50.07],
  ],
  distanceMeters: 4200,
  durationSeconds: 3300,
  createdAt: "2026-10-04T10:00:00.000Z",
  provider: "osrm-fossgis-foot",
};

const readyMap: MapPackageState = {
  schemaVersion: 1,
  regionId: MAP_REGIONS[0].id,
  version: MAP_REGIONS[0].version,
  fileName: "malopolska.pmtiles",
  bytes: 100,
  receivedBytes: 100,
  etag: null,
  status: "ready",
  completedAt: "2026-10-04T10:00:00.000Z",
};

const goodSensors: SensorCheckState = {
  schemaVersion: 1,
  checkedAt: "2026-10-04T10:00:00.000Z",
  location: "working",
  compass: "working",
};

const adult = (id: string): HouseholdMember => ({ id, name: id, category: "adult", needs: [] });
const child: HouseholdMember = { id: "c1", name: "Ola", category: "child", needs: [] };

const withPlan = (patch: Partial<HouseholdPlan>): HouseholdPlan => ({ ...createEmptyPlan(), ...patch });

const input = (overrides: Partial<ReadinessInput> = {}): ReadinessInput => ({
  plan: createEmptyPlan(),
  planSource: "stored",
  navigation: createEmptyNavigation(),
  map: null,
  mapFile: "present",
  sensors: null,
  install: "na",
  shell: "na",
  ...overrides,
});

const packedFor = (plan: HouseholdPlan, only: (id: string) => boolean = () => true) =>
  buildBackpack(plan.members)
    .filter((item) => only(item.id))
    .map((item) => ({ itemId: item.id, quantity: item.quantity?.amount ?? null }));

const keyIds = (members: HouseholdMember[]) =>
  new Set(
    buildBackpack(members)
      .filter(isKeyItem)
      .map((item) => item.id),
  );

/** Everything done, in Kraków, install not required. */
function readyInput(overrides: Partial<ReadinessInput> = {}): ReadinessInput {
  const base = withPlan({
    lastKnownPosition: { coords: krakow, recordedAt: "2026-10-04T10:00:00.000Z" },
    contacts: [{ id: "k1", name: "Mama", phone: "123456789", relation: "" }],
  });
  const plan = { ...base, packedItems: packedFor(base) };
  return input({
    plan,
    navigation: { ...createEmptyNavigation(), primary: route },
    map: readyMap,
    sensors: goodSensors,
    ...overrides,
  });
}

const win = (readiness: Readiness, id: QuickWinId) => {
  const found = readiness.quickWins.find((quickWin) => quickWin.id === id);
  if (!found) throw new Error(`no quick win ${id}`);
  return found;
};

describe("computeReadiness — levels", () => {
  it("starts with nothing done and points at the shelter", () => {
    const readiness = computeReadiness(input());
    expect(readiness.level.id).toBe("start");
    expect(readiness.next?.id).toBe("shelter");
    expect(readiness.next?.href).toBe("/miejsca");
  });

  it("reaches basics as soon as the alarm has a target", () => {
    const shelter = withPlan({ shelter: place("Hala") });
    expect(computeReadiness(input({ plan: shelter })).level.id).toBe("basics");
    const navigation = { ...createEmptyNavigation(), primary: route };
    expect(computeReadiness(input({ navigation })).level.id).toBe("basics");
  });

  it("needs the shelter, a contact and the key backpack for ready-to-go", () => {
    const base = withPlan({
      shelter: place("Hala"),
      contacts: [{ id: "k1", name: "Mama", phone: "123456789", relation: "" }],
    });
    expect(computeReadiness(input({ plan: base })).level.id).toBe("basics");
    const keys = keyIds([]);
    const plan = { ...base, packedItems: packedFor(base, (id) => keys.has(id)) };
    expect(computeReadiness(input({ plan })).level.id).toBe("ready-to-go");
  });

  it("accepts a member instead of a contact", () => {
    const base = withPlan({
      shelter: place("Hala"),
      members: [adult("a2")],
    });
    const keys = keyIds(base.members);
    const plan = { ...base, packedItems: packedFor(base, (id) => keys.has(id)) };
    expect(computeReadiness(input({ plan })).level.id).toBe("ready-to-go");
  });

  it("reaches the top level when everything is done and has no next step", () => {
    const readiness = computeReadiness(readyInput());
    expect(readiness.level.id).toBe("ready-72h");
    expect(readiness.next).toBeNull();
    expect(readiness.areas.every((area) => area.status === "done")).toBe(true);
  });

  it("falls back when a child joins the household and the backpack grows", () => {
    const ready = readyInput();
    const grown = { ...ready.plan, members: [child] };
    const readiness = computeReadiness({ ...ready, plan: grown });
    expect(readiness.level.id).toBe("basics");
    expect(readiness.next?.id).toBe("backpack-key");
  });

  it("does not let a key tick made for a smaller household count", () => {
    const ready = readyInput();
    const grown = { ...ready.plan, members: [adult("a2")] };
    const readiness = computeReadiness({ ...ready, plan: grown });
    expect(win(readiness, "backpack-key").status).toBe("todo");
  });
});

describe("computeReadiness — next step order", () => {
  it("follows target → family → backpack → offline → rest", () => {
    const order: QuickWinId[] = [];
    let current = input({ install: "todo" });
    for (let step = 0; step < 12; step += 1) {
      const next = computeReadiness(current).next;
      if (!next) break;
      order.push(next.id);
      current = advance(current, next.id);
    }
    expect(order).toEqual(["shelter", "household", "backpack-key", "install", "map", "sensors", "backpack-full"]);
  });

  it("carries backpack progress in the quick win", () => {
    const base = readyInput();
    const keys = keyIds(base.plan.members);
    const plan = { ...base.plan, packedItems: packedFor(base.plan, (id) => keys.has(id) && id !== "water") };
    const readiness = computeReadiness({ ...base, plan });
    expect(win(readiness, "backpack-key").progress).toEqual({ done: keys.size - 1, total: keys.size });
    const rest = win(readiness, "backpack-full").progress;
    expect(rest?.done).toBe(0);
    expect(rest?.total).toBe(buildBackpack([]).length - keys.size);
  });
});

/** Does what the quick win asks, with the smallest change to the input. */
function advance(current: ReadinessInput, id: QuickWinId): ReadinessInput {
  const { plan } = current;
  switch (id) {
    case "shelter":
      return { ...current, plan: { ...plan, shelter: place("Hala") } };
    case "household":
      return {
        ...current,
        plan: { ...plan, contacts: [{ id: "k1", name: "Mama", phone: "123456789", relation: "" }] },
      };
    case "backpack-key": {
      const keys = keyIds(plan.members);
      return { ...current, plan: { ...plan, packedItems: packedFor(plan, (itemId) => keys.has(itemId)) } };
    }
    case "offline-shell":
      return { ...current, shell: "ready" };
    case "install":
      return { ...current, install: "done" };
    case "map":
      return { ...current, map: readyMap };
    case "sensors":
      return { ...current, sensors: goodSensors };
    case "backpack-full":
      return { ...current, plan: { ...plan, packedItems: packedFor(plan) } };
  }
}

describe("computeReadiness — shelter and route", () => {
  const ready = readyInput();
  const withoutShelterPoint = { ...ready.plan, shelter: null };

  it("counts a fresh saved route as the shelter", () => {
    expect(win(computeReadiness(ready), "shelter").status).toBe("done");
  });

  it("counts an own shelter even without a route", () => {
    const plan = { ...ready.plan, shelter: place("Hala") };
    expect(win(computeReadiness({ ...ready, plan, navigation: createEmptyNavigation() }), "shelter").status).toBe(
      "done",
    );
  });

  it("treats a route computed far from the last known position as stale", () => {
    const moved = {
      ...withoutShelterPoint,
      lastKnownPosition: { coords: warsaw, recordedAt: "2026-10-04T12:00:00.000Z" },
    };
    const readiness = computeReadiness({ ...ready, plan: moved });
    const shelter = win(readiness, "shelter");
    expect(shelter.status).toBe("todo");
    expect(shelter.title).toBe("Odśwież trasę do schronu");
    expect(shelter.href).toBe("/miejsca");
    expect(readiness.notices.map((notice) => notice.id)).toContain("route-stale");
  });

  it("keeps the shelter done on a stale route when an own shelter exists", () => {
    const plan = {
      ...ready.plan,
      shelter: place("Hala"),
      lastKnownPosition: { coords: warsaw, recordedAt: "2026-10-04T12:00:00.000Z" },
    };
    const readiness = computeReadiness({ ...ready, plan });
    expect(win(readiness, "shelter").status).toBe("done");
    expect(readiness.notices.map((notice) => notice.id)).not.toContain("route-stale");
  });

  it("trusts a route when the position is unknown", () => {
    const plan = { ...withoutShelterPoint, lastKnownPosition: null };
    expect(win(computeReadiness({ ...ready, plan }), "shelter").status).toBe("done");
  });

  it("asks for an own shelter when no PSP shelter is in range", () => {
    const navigation: NavigationState = {
      ...createEmptyNavigation(),
      lastRefresh: { at: "2026-10-04T10:00:00.000Z", ok: false, reason: "no-candidates" },
    };
    const shelter = win(computeReadiness({ ...ready, plan: withoutShelterPoint, navigation }), "shelter");
    expect(shelter.title).toBe("Wskaż własny schron");
    expect(shelter.href).toBe("/miejsca");
    expect(shelter.area).toBe("places");
  });

  it("asks for the route when nothing was prepared yet", () => {
    const shelter = win(
      computeReadiness({ ...ready, plan: withoutShelterPoint, navigation: createEmptyNavigation() }),
      "shelter",
    );
    expect(shelter.title).toBe("Wybierz schron i przygotuj trasę");
    expect(shelter.href).toBe("/miejsca");
    expect(shelter.area).toBe("places");
  });

  it("is the only step of the places area, and the offline area does not count it", () => {
    const readiness = computeReadiness(input({ shell: "ready", install: "done" }));
    const byArea = (area: string) =>
      readiness.quickWins.filter((quickWin) => quickWin.area === area).map((quickWin) => quickWin.id);
    expect(byArea("places")).toEqual(["shelter"]);
    expect(byArea("offline")).toEqual(["offline-shell", "install", "map"]);
  });
});

describe("computeReadiness — offline map", () => {
  const ready = readyInput();

  it("is done for a ready package that covers the position", () => {
    expect(win(computeReadiness(ready), "map").status).toBe("done");
  });

  it("is todo, with its own copy, when the file behind a ready flag is gone", () => {
    const evicted = computeReadiness({ ...ready, mapFile: "missing" });
    expect(win(evicted, "map").status).toBe("todo");
    expect(win(evicted, "map").title).toBe("Pobierz mapę ponownie");
    expect(evicted.level.id).not.toBe("ready-72h");
    // Until the file check answers, the flag is trusted so the level does not flicker on every load.
    expect(win(computeReadiness({ ...ready, mapFile: "unknown" }), "map").status).toBe("done");
  });

  it("is todo while the package is not ready", () => {
    const downloading: MapPackageState = { ...readyMap, status: "downloading", receivedBytes: 10 };
    expect(win(computeReadiness({ ...ready, map: downloading }), "map").status).toBe("todo");
    expect(win(computeReadiness({ ...ready, map: null }), "map").status).toBe("todo");
  });

  it("is unavailable, and does not hold the level back, outside every region", () => {
    const plan = { ...ready.plan, lastKnownPosition: { coords: warsaw, recordedAt: "2026-10-04T12:00:00.000Z" } };
    const readiness = computeReadiness({ ...ready, plan, navigation: createEmptyNavigation(), install: "na" });
    expect(win(readiness, "map").status).toBe("unavailable");
    expect(readiness.notices.map((notice) => notice.id)).toContain("map-no-region");
    // The own shelter is the target here, so the level can still reach the top.
    const withShelter = { ...plan, shelter: place("Hala") };
    expect(computeReadiness({ ...ready, plan: withShelter, navigation: createEmptyNavigation() }).level.id).toBe(
      "ready-72h",
    );
  });

  it("is unavailable when no map was downloaded and none exists for the position", () => {
    const plan = { ...ready.plan, lastKnownPosition: { coords: warsaw, recordedAt: "2026-10-04T12:00:00.000Z" } };
    expect(win(computeReadiness({ ...ready, plan, map: null }), "map").status).toBe("unavailable");
  });

  it("is not claimed done when the position is unknown and nothing is downloaded", () => {
    const plan = { ...ready.plan, lastKnownPosition: null };
    const readiness = computeReadiness({ ...ready, plan, map: null });
    expect(win(readiness, "map").status).toBe("todo");
    expect(readiness.notices).toEqual([]);
  });

  it("trusts a ready package when the position is unknown", () => {
    const plan = { ...ready.plan, lastKnownPosition: null };
    expect(win(computeReadiness({ ...ready, plan }), "map").status).toBe("done");
  });
});

describe("computeReadiness — install and sensors", () => {
  it("leaves the install step out where it does not apply", () => {
    expect(computeReadiness(input({ install: "na" })).quickWins.map((quickWin) => quickWin.id)).not.toContain(
      "install",
    );
  });

  it("asks for install on a phone that needs it and counts it for the top level", () => {
    const readiness = computeReadiness(readyInput({ install: "todo" }));
    expect(win(readiness, "install").status).toBe("todo");
    expect(readiness.level.id).toBe("ready-to-go");
  });

  it("needs working location and a compass that was not refused", () => {
    const ready = readyInput();
    expect(win(computeReadiness({ ...ready, sensors: null }), "sensors").status).toBe("todo");
    expect(win(computeReadiness({ ...ready, sensors: { ...goodSensors, location: "denied" } }), "sensors").status).toBe(
      "todo",
    );
    expect(win(computeReadiness({ ...ready, sensors: { ...goodSensors, compass: "denied" } }), "sensors").status).toBe(
      "todo",
    );
    expect(
      win(computeReadiness({ ...ready, sensors: { ...goodSensors, compass: "unavailable" } }), "sensors").status,
    ).toBe("done");
  });
});

describe("computeReadiness — areas and unreadable plan", () => {
  it("marks an area partial while only some of its steps are done", () => {
    const offline = computeReadiness(input({ shell: "ready" })).areas.find((area) => area.id === "offline");
    expect(offline?.status).toBe("partial");
    const family = computeReadiness(input()).areas.find((area) => area.id === "family");
    expect(family?.status).toBe("todo");
  });

  it("makes no claims about a plan that could not be read", () => {
    const readiness = computeReadiness(input({ planSource: "unreadable" }));
    expect(readiness.level.id).toBe("start");
    expect(readiness.next).toBeNull();
    expect(readiness.quickWins).toEqual([]);
    expect(readiness.notices.map((notice) => notice.id)).toEqual(["plan-unreadable"]);
  });
});

describe("computeReadiness — offline shell", () => {
  it("is left out where no worker is registered", () => {
    const ids = computeReadiness(input({ shell: "na" })).quickWins.map((quickWin) => quickWin.id);
    expect(ids).not.toContain("offline-shell");
  });

  it("comes first in the offline stage and holds the top level back until it is ready", () => {
    const pending = computeReadiness(readyInput({ shell: "pending" }));
    expect(win(pending, "offline-shell").status).toBe("todo");
    expect(pending.level.id).toBe("ready-to-go");
    expect(pending.next?.id).toBe("offline-shell");
    expect(computeReadiness(readyInput({ shell: "ready" })).level.id).toBe("ready-72h");
  });

  it("explains an unsupported or failed worker and raises a notice", () => {
    for (const shell of ["unsupported", "failed"] as const) {
      const readiness = computeReadiness(readyInput({ shell }));
      expect(win(readiness, "offline-shell").reason).not.toBe("");
      expect(readiness.notices.map((notice) => notice.id)).toContain("offline-unavailable");
    }
    expect(computeReadiness(readyInput({ shell: "pending" })).notices).toEqual([]);
  });
});
