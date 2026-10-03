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

    // Wobble back above the 400 mark — one step up keeps lastMark
    const r2 = nextDistanceAnnouncement(r1.mark, 405);
    expect(r2).toEqual({ announce: false, mark: 300 });

    const r3 = nextDistanceAnnouncement(r2.mark, 395);
    expect(r3).toEqual({ announce: false, mark: 300 });
  });

  it("resets lastMark upward silently when distance grows by more than one step", () => {
    expect(nextDistanceAnnouncement(400, 550)).toEqual({ announce: false, mark: 400 });
    const result = nextDistanceAnnouncement(400, 650);
    expect(result).toEqual({ announce: false, mark: 600 });
    expect(nextDistanceAnnouncement(result.mark, 590)).toEqual({ announce: true, mark: 500 });
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
  const title = "Idź do punktu ewakuacji";
  const guidingAt = (
    meters: number,
    live: boolean,
    over: Partial<{ title: string; label: string; fallback: boolean }> = {},
  ) => ({ kind: "guiding", title, label, meters, live, fallback: false, ...over }) satisfies GuidanceVoiceState;

  it("returns non-empty text on entry into every variant", () => {
    const states: GuidanceVoiceState[] = [
      { kind: "noSteps" },
      { kind: "resume", title: "Idź do miejsca spotkania" },
      { kind: "action", title: "Zabierz plecak ewakuacyjny", instruction: "Weź przygotowany plecak i wyjdź z domu." },
      { kind: "searching", label },
      { kind: "locationProblem", label, problem: "denied" },
      guidingAt(480, true),
      guidingAt(480, false),
      { kind: "arrived", label, next: "Idź do punktu ewakuacji" },
      { kind: "arrived", label, next: null },
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
    expect(phraseFor(guidingAt(300, false), guidingAt(300, true))).toContain("Utracono sygnał GPS");
  });

  it("signals GPS recovery when guiding stale → live", () => {
    expect(phraseFor(guidingAt(300, true), guidingAt(300, false))).toContain("Odzyskano sygnał GPS");
  });

  it("does not report a lost signal when locationProblem → searching", () => {
    const prev: GuidanceVoiceState = { kind: "locationProblem", label, problem: "denied" };
    const next: GuidanceVoiceState = { kind: "searching", label };
    expect(phraseFor(next, prev)).toContain("Szukam sygnału GPS");
  });

  it("signals loss of GPS when guiding → searching", () => {
    const next: GuidanceVoiceState = { kind: "searching", label };
    expect(phraseFor(next, guidingAt(300, true))).toContain("Utracono sygnał GPS");
  });

  it("announces the switch to the backup place when the fallback turns on", () => {
    const prev = guidingAt(300, true, { title: "Idź do miejsca spotkania", label: "Boisko" });
    const next = guidingAt(900, true, { title: "Idź do miejsca zapasowego", label: "Kościół", fallback: true });
    const text = phraseFor(next, prev);
    expect(text).toContain("Punkt niedostępny");
    expect(text).toContain("Kościół");
  });

  it("announces the new target when the step changes without a fallback", () => {
    const prev = guidingAt(300, true, { title: "Idź do miejsca spotkania", label: "Boisko" });
    const next = guidingAt(1200, true, { title: "Idź do punktu ewakuacji", label: "Szkoła" });
    const text = phraseFor(next, prev);
    expect(text).toContain("Idź do punktu ewakuacji");
    expect(text).toContain("Szkoła");
    expect(text).not.toContain("Punkt niedostępny");
  });

  it("names the next step on an intermediate arrival and closes the run on the last one", () => {
    const intermediate = phraseFor({ kind: "arrived", label: "Boisko", next: "Idź do punktu ewakuacji" }, null);
    expect(intermediate).toContain("Idź do punktu ewakuacji");
    const last = phraseFor({ kind: "arrived", label: "Szkoła", next: null }, null);
    expect(last).toContain("koniec zaplanowanej drogi");
  });

  it("reads the action step title and its instruction", () => {
    const text = phraseFor(
      { kind: "action", title: "Zabierz plecak ewakuacyjny", instruction: "Weź przygotowany plecak." },
      null,
    );
    expect(text).toContain("Zabierz plecak ewakuacyjny");
    expect(text).toContain("Weź przygotowany plecak.");
  });
});
