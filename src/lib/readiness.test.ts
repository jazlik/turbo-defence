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
  sensors: null,
  install: "na",
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
    places: { meeting: place("Plac"), backup: place("Park"), shelter: null },
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
  it("starts with nothing done and points at the meeting place", () => {
    const readiness = computeReadiness(input());
    expect(readiness.level.id).toBe("start");
    expect(readiness.next?.id).toBe("meeting");
    expect(readiness.next?.href).toBe("/miejsca");
  });

  it("reaches basics as soon as the alarm has a target", () => {
    const meeting = withPlan({ places: { meeting: place("Plac"), backup: null, shelter: null } });
    expect(computeReadiness(input({ plan: meeting })).level.id).toBe("basics");
    const shelter = withPlan({ places: { meeting: null, backup: null, shelter: place("Hala") } });
    expect(computeReadiness(input({ plan: shelter })).level.id).toBe("basics");
  });

  it("needs meeting, shelter, a contact and the key backpack for ready-to-go", () => {
    const base = withPlan({
      places: { meeting: place("Plac"), backup: null, shelter: place("Hala") },
      contacts: [{ id: "k1", name: "Mama", phone: "123456789", relation: "" }],
    });
    expect(computeReadiness(input({ plan: base })).level.id).toBe("basics");
    const keys = keyIds([]);
    const plan = { ...base, packedItems: packedFor(base, (id) => keys.has(id)) };
    expect(computeReadiness(input({ plan })).level.id).toBe("ready-to-go");
  });

  it("accepts a member instead of a contact", () => {
    const base = withPlan({
      places: { meeting: place("Plac"), backup: null, shelter: place("Hala") },
      members: [adult("a2")],
    });
    const keys = keyIds(base.members);
    const plan = { ...base, packedItems: packedFor(base, (id) => keys.has(id)) };
    expect(computeReadiness(input({ plan })).level.id).toBe("ready-to-go");
  });

  it("reaches 72H Ready when everything is done and has no next step", () => {
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
  it("follows target → family → backpack → backup → offline → rest", () => {
    const order: QuickWinId[] = [];
    let current = input({ install: "todo" });
    for (let step = 0; step < 12; step += 1) {
      const next = computeReadiness(current).next;
      if (!next) break;
      order.push(next.id);
      current = advance(current, next.id);
    }
    expect(order).toEqual([
      "meeting",
      "shelter",
      "household",
      "backpack-key",
      "backup",
      "install",
      "map",
      "sensors",
      "backpack-full",
    ]);
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
    case "meeting":
      return { ...current, plan: { ...plan, places: { ...plan.places, meeting: place("Plac") } } };
    case "shelter":
      return { ...current, plan: { ...plan, places: { ...plan.places, shelter: place("Hala") } } };
    case "household":
      return {
        ...current,
        plan: { ...plan, contacts: [{ id: "k1", name: "Mama", phone: "123456789", relation: "" }] },
      };
    case "backpack-key": {
      const keys = keyIds(plan.members);
      return { ...current, plan: { ...plan, packedItems: packedFor(plan, (itemId) => keys.has(itemId)) } };
    }
    case "backup":
      return { ...current, plan: { ...plan, places: { ...plan.places, backup: place("Park") } } };
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
  const withoutShelterPoint = { ...ready.plan, places: { ...ready.plan.places, shelter: null } };

  it("counts a fresh saved route as the shelter", () => {
    expect(win(computeReadiness(ready), "shelter").status).toBe("done");
  });

  it("counts a manual point even without a route", () => {
    const plan = { ...ready.plan, places: { ...ready.plan.places, shelter: place("Hala") } };
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
    expect(readiness.notices.map((notice) => notice.id)).toContain("route-stale");
  });

  it("keeps the shelter done on a stale route when a manual point exists", () => {
    const plan = {
      ...ready.plan,
      places: { ...ready.plan.places, shelter: place("Hala") },
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

  it("asks for a manual point when no PSP shelter is in range", () => {
    const navigation: NavigationState = {
      ...createEmptyNavigation(),
      lastRefresh: { at: "2026-10-04T10:00:00.000Z", ok: false, reason: "no-candidates" },
    };
    const shelter = win(computeReadiness({ ...ready, plan: withoutShelterPoint, navigation }), "shelter");
    expect(shelter.title).toBe("Wskaż punkt ewakuacji");
    expect(shelter.href).toBe("/miejsca");
  });

  it("asks for the route when nothing was prepared yet", () => {
    const shelter = win(
      computeReadiness({ ...ready, plan: withoutShelterPoint, navigation: createEmptyNavigation() }),
      "shelter",
    );
    expect(shelter.title).toBe("Wybierz schron i przygotuj trasę");
    expect(shelter.href).toBe("/offline");
  });
});

describe("computeReadiness — offline map", () => {
  const ready = readyInput();

  it("is done for a ready package that covers the position", () => {
    expect(win(computeReadiness(ready), "map").status).toBe("done");
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
    // The shelter point is the manual one here, so the level can still reach the top.
    const withShelter = { ...plan, places: { ...plan.places, shelter: place("Hala") } };
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
    const meeting = withPlan({ places: { meeting: place("Plac"), backup: null, shelter: null } });
    const places = computeReadiness(input({ plan: meeting })).areas.find((area) => area.id === "places");
    expect(places?.status).toBe("partial");
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
