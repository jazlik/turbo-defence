import { describe, expect, it } from "vitest";

import {
  distanceMark,
  nextDistanceAnnouncement,
  phraseFor,
  pickPolishVoice,
  polishUnit,
  spokenDistance,
} from "./voice";
import type { GuidanceVoiceState } from "./voice";

describe("polishUnit", () => {
  const m: [string, string, string] = ["metr", "metry", "metrów"];
  it.each([
    [1, "metr"],
    [2, "metry"],
    [4, "metry"],
    [5, "metrów"],
    [12, "metrów"],
    [14, "metrów"],
    [21, "metrów"],
    [22, "metry"],
    [25, "metrów"],
    [112, "metrów"],
    [122, "metry"],
  ])("%i → %s", (n, expected) => {
    expect(polishUnit(n, m)).toBe(expected);
  });
});

describe("spokenDistance", () => {
  it.each([
    [10, "10 metrów"],
    [480, "480 metrów"],
    [494, "490 metrów"],
    [1000, "1 kilometr"],
    [1500, "1,5 kilometra"],
    [2000, "2 kilometry"],
    [5000, "5 kilometrów"],
    [12000, "12 kilometrów"],
    [22000, "22 kilometry"],
  ])("%i m → %s", (meters, expected) => {
    expect(spokenDistance(meters)).toBe(expected);
  });
});

describe("distanceMark", () => {
  it.each([
    [2600, 2500],
    [1000, 1000],
    [999, 900],
    [250, 200],
    [199, 150],
    [30, 0],
  ])("%i → %i", (meters, expected) => {
    expect(distanceMark(meters)).toBe(expected);
  });
});

describe("nextDistanceAnnouncement", () => {
  it("announces when crossing a threshold downward", () => {
    expect(nextDistanceAnnouncement(500, 495)).toEqual({ announce: true, mark: 400 });
  });

  it("does not announce when oscillating around a threshold (announce only once)", () => {
    const r1 = nextDistanceAnnouncement(500, 395); // crosses 400, distanceMark(395)=300
    expect(r1.announce).toBe(true);
    expect(r1.mark).toBe(300);

    // Wobble back above the 400 mark — lastMark resets upward silently
    const r2 = nextDistanceAnnouncement(r1.mark, 405); // distance grew → reset upward silently
    expect(r2.announce).toBe(false);
    expect(r2.mark).toBe(400);

    const r3 = nextDistanceAnnouncement(r2.mark, 395); // crosses 400 again
    expect(r3.announce).toBe(true);
    expect(r3.mark).toBe(300);
  });

  it("resets lastMark upward silently when distance increases past a mark", () => {
    const result = nextDistanceAnnouncement(400, 550); // distance grew above 400
    expect(result.announce).toBe(false);
    expect(result.mark).toBe(500);
  });

  it("never announces mark 0", () => {
    expect(nextDistanceAnnouncement(50, 20)).toEqual({ announce: false, mark: 0 });
    expect(nextDistanceAnnouncement(null, 20)).toEqual({ announce: false, mark: 0 });
  });

  it("announces on first call with lastMark null (if mark > 0)", () => {
    const r = nextDistanceAnnouncement(null, 480);
    expect(r.announce).toBe(true);
    expect(r.mark).toBe(400);
  });
});

describe("pickPolishVoice", () => {
  const make = (lang: string, localService: boolean) => ({ lang, localService });

  it("prefers local over network voice", () => {
    const voices = [make("pl-PL", false), make("pl-PL", true)];
    const result = pickPolishVoice(voices);
    expect(result?.local).toBe(true);
    expect(result?.voice.localService).toBe(true);
  });

  it("recognises pl_PL (Android underscore variant)", () => {
    const voices = [make("pl_PL", true)];
    const result = pickPolishVoice(voices);
    expect(result).not.toBeNull();
  });

  it("returns null when no Polish voice exists", () => {
    expect(pickPolishVoice([make("en-US", true), make("de-DE", false)])).toBeNull();
  });
});

describe("phraseFor", () => {
  const label = "Szkoła";

  it("returns non-empty text on entry into every variant", () => {
    const states: GuidanceVoiceState[] = [
      { kind: "noPoint" },
      { kind: "searching", label },
      { kind: "locationProblem", label, problem: "denied" },
      { kind: "guiding", label, meters: 480, live: true },
      { kind: "guiding", label, meters: 480, live: false },
      { kind: "arrived", label },
    ];
    for (const state of states) {
      const text = phraseFor(state, null);
      expect(text.length).toBeGreaterThan(0);
      // guiding always includes the label; other variants may not
      if (state.kind === "guiding") {
        expect(text).toContain(label);
      }
    }
  });

  it("signals loss of GPS when guiding live → stale", () => {
    const prev: GuidanceVoiceState = { kind: "guiding", label, meters: 300, live: true };
    const next: GuidanceVoiceState = { kind: "guiding", label, meters: 300, live: false };
    expect(phraseFor(next, prev)).toContain("Utracono sygnał GPS");
  });

  it("signals GPS recovery when guiding stale → live", () => {
    const prev: GuidanceVoiceState = { kind: "guiding", label, meters: 300, live: false };
    const next: GuidanceVoiceState = { kind: "guiding", label, meters: 300, live: true };
    expect(phraseFor(next, prev)).toContain("Odzyskano sygnał GPS");
  });
});
