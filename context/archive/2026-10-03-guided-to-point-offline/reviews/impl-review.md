<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Prowadzenie do punktu offline (S-01)

- **Plan**: context/changes/guided-to-point-offline/plan.md
- **Scope**: Full plan (Phases 1–4; commits 958fe22, f2a799e, 766f23e, 629f098)
- **Date**: 2026-10-03
- **Verdict**: NEEDS ATTENTION (triaged 2026-10-03: all 10 findings fixed; field re-test pending)
- **Findings**: 0 critical, 6 warnings, 4 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | WARNING |

Automated evidence (run during review): `npm test` 17/17 pass, `npm run lint` 0 issues, `npx astro check` 0 errors, `npm run build` OK (`dist/{alarm,czujniki,design,index}.html`; `sw.js` precaches all four), `npm run smoke` against a local `astro preview` OK, `npm ls vite` shows a single vite@8.3.0. Live smoke (`EXPECT_HEADERS=1`) fails with `/alarm returned 404`, which is expected because the branch is not pushed or deployed (4.1 and 4.2 are open).

Scope extras (benign, no finding): `parseCoordinates`, `saveLastKnownPosition`, `requestCurrentPosition`, keyboard hold on AlarmButton, shortest-turn arrow rotation, Prettier reformatting of `prd.md`/`roadmap.md`.

## Findings

### F1 — Two crash paths blank `/alarm`

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/plan-storage.ts:15-19, src/components/hooks/useGeolocation.ts:64
- **Detail**: (a) `isPlan` checks only `schemaVersion === 1` and `updatedAt`. A v1 entry with `evacuationPoint: {label:"x"}`, or with non-numeric coords, passes. Then `GuidanceScreen.tsx:106` `distanceMeters(origin, point.coords)` throws a TypeError, and there is no error boundary, so the screen goes blank in a crisis. `EvacuationPointCard` crashes the same way on `/`. The plan's contract was that a damaged entry must not break `/alarm` (plan.md:111, :401). (b) `navigator.permissions.query(...)` is called without a guard. Where `navigator.permissions` is undefined (iOS Safari < 16, some WebViews) it throws synchronously inside the effect, `watchPosition` never starts, and the island unmounts.
- **Fix**: Validate the nested shapes in `isPlan`/`readPlan` (finite lat/lon in range, string label/`recordedAt`); null an invalid sub-object instead of rejecting the plan. Add a test case. Use `navigator.permissions?.query(...)`.
- **Decision**: FIXED — `parsePlan` validates nested shapes (bad sub-object → null), tests in `src/lib/services/plan-storage.test.ts`; Permissions API guarded with `"permissions" in navigator`.

### F2 — Live fix never goes stale on `/alarm`

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/components/GuidanceScreen.tsx:103-108, :14, :143
- **Detail**: After the first fix, `coords` is treated as live forever. `watchPosition` has no `timeout`, so when the signal is lost the callbacks simply stop. Distance then freezes while the user walks, `isStale` stays false, and "Jesteś na miejscu" can be confirmed from an old fix. Separately, `formatTime` shows only HH:MM, so a `lastKnownPosition` from weeks ago at home reads as "Dane z 14:32", as if it were today.
- **Fix**: Keep `position.timestamp` with the fix. After about 15–30 s without a fix, treat `coords` as stale: same dimmed arrow and "Dane z …" label as `lastKnownPosition`, and no arrival. When the date is not today, show it in the label ("Dane z 12.09, 14:32").
  - Strength: Reuses the stale state already in the plan (plan.md:76). No new UI concept.
  - Tradeoff: One timer and an extra field in the hook state. The threshold has to be chosen without field data.
  - Confidence: MED — the behaviour of `watchPosition` on signal loss varies by browser. Some fire `TIMEOUT`/`POSITION_UNAVAILABLE` errors, which are also ignored today.
  - Blind spot: Not observed on a real phone.
- **Decision**: FIXED — `useGeolocation` exposes `fixedAt`; `/alarm` treats a fix older than 20 s (`FIX_STALE_MS`, ticked by new `useNow`) as stale (dimmed arrow, "Dane z …", no arrival); `formatFixTime` adds the date when not today.

### F3 — Denied/unavailable location on `/alarm` shows the wrong instruction

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/GuidanceScreen.tsx:59, :153-158
- **Detail**: `status` from `useGeolocation` is ignored. With location permission denied or revoked, the screen says "Szukam sygnału GPS — Wyjdź pod otwarte niebo" forever, or waits on stale data indefinitely. Going outside will not help. `JEZYK_WIZUALNY.md` §13 requires states that tell the user what to do.
- **Fix**: Branch on `status === "denied" | "unavailable"` and show a message that points to the browser settings, matching the SensorCheck copy.
- **Decision**: FIXED — `/alarm` reads `status`; without a live fix, `denied`/`unavailable` replace "Szukam sygnału GPS" (and the stale "czekam na sygnał GPS" suffix) with `LOCATION_PROBLEMS` title + instruction, copy aligned with SensorCheck.

### F4 — Manual criteria checked without field evidence

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: context/changes/guided-to-point-offline/plan.md:462, :465, :466
- **Detail**: 3.7 (stopwatch under 2 s on a phone in airplane mode), 3.10 (distance drops while walking, arrival under 25 m) and 3.11 (compass denied, movement fallback while walking) are `[x]` with the code-commit sha 766f23e. Nothing in the diff or the commit message records a field test. Meanwhile the related phone items 2.6, 2.8, 3.9, 3.13 and 3.14 are still `[ ]`. These three gate the NFR and the core demo path.
- **Fix**: Confirm they were tested on a real phone, and if so note how and where. Otherwise uncheck them so they join the field checklist with 4.3 and 4.4.
  - Strength: Progress stays an honest gate for `/10x-archive` and for the demo.
  - Tradeoff: None in code; one edit to plan.md.
  - Confidence: HIGH that evidence is missing; LOW on whether the tests happened (they may have been done by hand and not recorded).
  - Blind spot: Desktop sensor emulation in DevTools might have been used. It does not cover the stopwatch or walking criteria.
- **Decision**: FIXED — 3.7, 3.10, 3.11 unchecked in plan.md Progress; to be re-verified on a phone together with 4.3/4.4 (code under them changed in F1–F3).

### F5 — S-01 marked `done` in roadmap while the change is still implementing

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: context/foundation/roadmap.md:31, :217
- **Detail**: The plan asked for S-01 → `done` (plan.md:333), but it was set while 9 Progress rows are open (field tests, CI on the branch, live smoke) and `change.md` says `implementing`. The Backlog Handoff "Ready for `/10x-plan`" column (yes/no) now holds `done`. Criterion 4.5 is self-satisfied by the same commit.
- **Fix**: Keep the status `in progress` (or the roadmap's equivalent) until 4.1–4.4 pass, then flip it in the archive commit. Put a valid value in the Ready column.
- **Decision**: FIXED — S-01 set to `in-progress` (At a glance + Slices status); Backlog Handoff Ready = `yes`, note "W realizacji — czeka na testy w terenie". Flip to `done` in the `/10x-archive` commit.

### F6 — Coordinate field unusable with the Polish iOS decimal keypad

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/EvacuationPointCard.tsx:140
- **Detail**: `inputMode="decimal"` opens a keypad with digits and the locale separator only, which is `,` in pl-PL. It has no `.`, no space and no `-`. `parseCoordinates` (geo.ts:46) needs `.` decimals and a separator, so the placeholder format "52.2297, 21.0122" cannot be typed. Pasting still works.
- **Fix**: Drop `inputMode` (or use `"text"`). Optionally also accept decimal commas when the pair is separated by `;` or whitespace.
- **Decision**: FIXED — `inputMode` removed (full keyboard); `parseCoordinates` also accepts Polish decimal commas ("52,2297; 21,0122", "52,2297 21,0122", "52,2297, 21,0122"), with a test.

### F7 — Arrival requires a live fix (undocumented deviation)

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/components/GuidanceScreen.tsx:107-108
- **Detail**: When `lastKnownPosition` is within 25 m of the point (e.g. straight after "Ustaw tutaj"), the screen shows "Szukam sygnału GPS" instead of the plan's "Prowadzenie" state (plan.md:272). The deviation is deliberate and commented in the code, and it is reasonable: a stale fix must not confirm arrival. It is not in the plan.
- **Fix**: Add a one-line addendum under the state table in plan.md.
- **Decision**: FIXED — addendum under the /alarm state table in plan.md (also documents the F2 stale-fix and F3 location-problem behaviour).

### F8 — Heading robustness gaps

- **Severity**: 💡 OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/components/hooks/useHeading.ts:39-73, :52, :88-93
- **Detail**: (a) Once `compassHeading` is set it never resets. If the sensor stalls, the last value is used forever, the movement fallback never takes over, and "Włącz kompas" stays hidden. (b) Portrait-only is planned, but the manifest has no `"orientation"` lock, so in landscape the arrow is off by ±90°. (c) The movement anchor is taken from the first (often least accurate) fix. When accuracy then improves, the jump can produce a bogus bearing. (d) The compass updates state at sensor rate, which re-renders the whole screen (battery cost).
- **Fix**: Add `"orientation": "portrait"` to the manifest now (one line, matches the plan's assumption). Reset the compass to `null` after ~2 s of silence. Leave (c) and (d) for field data.
  - Strength: (b) and (a) are cheap and close silent wrong-arrow cases.
  - Tradeoff: The orientation lock affects installed PWA only. A silence reset could flicker the source on slow sensors.
  - Confidence: MED — real device event rates vary.
  - Blind spot: No device testing of compass stalls.
- **Decision**: FIXED (a)+(b) — `useCompassHeading` drops the heading after 2 s without orientation events (`COMPASS_SILENCE_MS`), so movement fallback and "Włącz kompas" take over; manifest `"orientation": "portrait"`. (c) movement anchor and (d) sensor-rate re-renders deferred to field data.

### F9 — Alarm button cannot be activated by a screen-reader double-tap

- **Severity**: 💡 OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/components/AlarmButton.tsx:52-75
- **Detail**: The hold is wired to pointer and key events only, with no `onClick`. VoiceOver/TalkBack double-tap synthesizes a click, which does nothing. AT users must know the "double-tap and hold" passthrough gesture, and the hint does not mention it. Keyboard Space/Enter hold works.
- **Fix**: Extend the hint text now. Deciding on an accessible alternative (e.g. click → confirm step for AT) is a product decision for a later slice.
  - Strength: The hint costs nothing. It keeps FR-012's "no second confirmation screen" for the main path.
  - Tradeoff: A hint alone does not make it fully accessible.
  - Confidence: MED — not tested with a screen reader.
  - Blind spot: Behaviour of the passthrough gesture on Android TalkBack.
- **Decision**: FIXED — sr-only sentence in `#alarm-hint` ("Z czytnikiem ekranu: stuknij dwa razy i przytrzymaj."). An accessible non-hold alternative remains a product decision for a later slice.

### F10 — Hook inside component file; hand-rolled button classes

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/GuidanceScreen.tsx:16-45, :49-51, :93-95, :165-171; src/components/EvacuationPointCard.tsx:117, :149
- **Detail**: `useScreenWakeLock` is defined inside `GuidanceScreen.tsx`, but CLAUDE.md says to extract hooks to `src/components/hooks/`. Links and buttons repeat long class strings that duplicate `buttonVariants`, while `Button` (supports `asChild`) is already used in the same files. SensorCheck also shows the movement heading unrounded (`237.8123°`, SensorCheck.tsx:195).
- **Fix**: Move the hook to `src/components/hooks/useScreenWakeLock.ts`, use `Button asChild` / `buttonVariants` for the hand-rolled controls, and round the heading on display.
- **Decision**: FIXED — hook moved to `src/components/hooks/useScreenWakeLock.ts`; GuidanceScreen controls use `Button` (`asChild` for links); SensorCheck rounds the heading. Inputs in EvacuationPointCard left as-is (no shadcn `Input` installed; adding one is out of scope).
