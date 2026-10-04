<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Miejsca ewakuacji — jeden cel alarmu i strona bez szumu

- **Plan**: context/changes/miejsca-page-cleanup/plan.md
- **Scope**: Full plan (Phases 1–4 of 4)
- **Date**: 2026-10-04
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 5 warnings, 5 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

Automated checks were re-run on HEAD 91ffbd8 and all passed: `npm test` (22 files, 258 tests), `npm run lint`, `npx astro check` (0/0/0), `npm run build`, `npm run smoke` against `astro preview`, the Phase 1 old-model grep (only the intended `stepId: "meeting"` test matches), and the MapLibre lazy-chunk check (`dist/miejsca.html` loads only OwnShelterCard, RouteCard and client; maplibre is only in `pmtiles.*.js` and the worker). The Phase 4 doc grep matches only superseded entries and explicit "usunięto 2026-10-04" change notes.

Scope: the unplanned changes are benign. They are `useRouteRefresh` (the `NAVIGATION_CHANGED_EVENT` that OwnShelterCard needs), `MapErrorBoundary` (extracted from MapOverlay), the `openMapFile` signature, and a comment-only edit in `useHoldAction` (behaviour and 2000 ms untouched).

## Findings

### F1 — A failed write still updates the card state, so Cancel shows an unsaved shelter as saved

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/OwnShelterCard.tsx:137-143
- **Detail**: `commit` calls `setPlan(next)` even when `writePlan` returns `false`. `save` shows `STORAGE_ERROR` and stays in the editor, but "Anuluj" moves to `idle`, and the summary then shows the unsaved shelter with "Zmień/Usuń". Delete fails the same way: the card shows the empty state while the shelter is still stored. This breaks the CLAUDE.md rule "a `false` must surface to the user, never a silent success". The bug was carried over from the old PlaceCard.
- **Fix**: In `commit`, call `setPlan(next)` only when `saved` is true.
- **Decision**: FIXED — `commit` calls `setPlan` only after a successful `writePlan`

### F2 — Saving over an unreadable plan erases the household plan

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/OwnShelterCard.tsx:139
- **Detail**: `{ ...readPlan(), shelter }` ignores `source === "unreadable"`. That covers corrupt JSON and an unknown or newer `schemaVersion`, the realistic case when an old and a new tab run side by side during an SW update. Saving a shelter then writes an empty plan, which erases members, contacts and the backpack. `plan-storage.ts:122-124` and `saveLastKnownPosition` (:271) guard against exactly this. The gap was carried over from PlaceCard.
- **Fix**: Use `readPlanResult()` in `commit` and return `false` (surfacing an error) when the source is `unreadable`.
- **Decision**: FIXED — `commit` reads via `readPlanResult()` and refuses with `UNREADABLE_PLAN` when the source is unreadable (same pattern as BackpackChecklist)

### F3 — iOS and Android field checks are marked done without a device record

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: context/changes/miejsca-page-cleanup/plan.md:550-554 (Progress 3.7–3.11; also 1.6–1.7, 2.6–2.10)
- **Detail**: All 14 Manual rows are `[x]` and stamped with phase commit SHAs. The four phases landed between 02:34 and 02:52, about 5 minutes per phase. 3.7 (iOS Safari, R2 map), 3.8 (Android Chrome plus OPFS in airplane mode) and 3.9 (airplane mode without a package) need physical devices. No commit, plan note or review names a device or browser. CLAUDE.md says: "A field-test record that doesn't name the device and browser does not count as verified on that platform." The new map picker relies on touch pan, which is exactly the iOS pointer risk that rule exists for.
- **Fix A ⭐ Recommended**: Uncheck 3.7–3.11 (and any other row not actually run), run them on real devices, then re-check each with a note naming the device and browser.
  - Strength: Makes Progress truthful before merge. The map picker is new touch-driven UI on iOS.
  - Tradeoff: Merge waits for a phone session.
  - Confidence: HIGH — the timing and the missing records are on disk.
  - Blind spot: Some rows may really have been run without being written down.
- **Fix B**: Keep the rows checked and append the device and browser names now, if the tests were in fact done.
  - Strength: No rework if the checks happened.
  - Tradeoff: Only valid if the checks really ran; otherwise it rubber-stamps them.
  - Confidence: LOW — nothing in the repo shows they ran.
  - Blind spot: Which rows were actually exercised.
- **Decision**: SKIPPED

### F4 — The own-shelter editor reopens itself after Cancel

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/components/OwnShelterCard.tsx:90-106
- **Detail**: The `NAVIGATION_CHANGED_EVENT` handler sets `mode = "editing"` and resets `mapFailed` on every navigation commit while there is no shelter and the result is `no-candidates`. `useRouteRefresh` commits again on `online` events and RouteCard retries, so a user who tapped "Anuluj" sees the editor reopen. The plan only asked for the card to start expanded.
- **Fix**: Open automatically only on the transition into `no-candidates` (the previous navigation was not `no-candidates`), never while the user has dismissed it.
- **Decision**: FIXED — `wasNoCandidates` ref; auto-open only on the transition into `no-candidates`

### F5 — Focus is lost on every mode switch, and the delete confirmation is not announced

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/components/OwnShelterCard.tsx:233-279, 389-405
- **Detail**: "Wskaż własny schron", "Zmień", "Usuń", "Zapisz schron" and "Anuluj" each unmount the button that was pressed, so focus falls to `<body>`. The confirmation text (:259-263) is not in a live region. Keyboard and screen-reader users lose their place.
- **Fix**: Add a ref per mode target and move focus in an effect on `mode` change. On `editing`, focus the editor heading; on `confirm-delete`, focus "Na pewno usuń"; on `idle`, focus "Zmień" or the open button. Give the confirmation text `role="alert"` or an `aria-live` region.
  - Strength: Small, local change; it matches how a11y is handled in the rest of the Preparation UI.
  - Tradeoff: Focusing after a save must not swallow the "Zapisano" feedback; the order needs care.
  - Confidence: MED — the pattern is standard, but it isn't used elsewhere in the repo to copy from.
  - Blind spot: Not tested with VoiceOver/TalkBack.
- **Decision**: FIXED — focus moves to each mode's target (editor "Punkt", "Na pewno usuń", "Zmień"/open button) only when it fell to `<body>`; confirmation text has `role="alert"`. Not yet checked with VoiceOver/TalkBack.

### F6 — A downloaded package can open the picker on blank tiles

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/map-source.ts:30-32
- **Detail**: The `local` branch uses `center` without checking that it lies in the package region. The `remote` branch does check, via `regionCovering`. With the Małopolska package and a last known position in Warsaw, the editor opens on empty tiles. There is no test for this case.
- **Fix**: In the local branch, use `regionCenter(region)` when `center` is outside `region`, and add a test.
- **Decision**: FIXED — local branch falls back to `regionCenter` when `packageCovers` is false; test added

### F7 — The initial map centre is not a candidate: "Zapisz schron" without panning fails

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/components/OwnShelterCard.tsx:77, src/components/map/PlacePickerMap.tsx:88-91
- **Detail**: With no saved shelter, `candidate` starts as `null` and is only set on `moveend`, which MapLibre does not fire on creation. The pin sits on the last known position, yet saving without panning shows "Najpierw wskaż punkt…". The plan does not say whether the initial centre counts as a pick.
- **Fix**: Report the initial centre once on `load` (`onCenterChange(map.getCenter())`), or keep the current behaviour deliberately and note it in the plan.
- **Decision**: FIXED — PlacePickerMap reports the centre on `load` as well as on `moveend`

### F8 — A tile error before `load` switches the whole map to coordinates

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/components/map/PlacePickerMap.tsx:84-87
- **Detail**: Any `error` event before `load` calls `onError`, including a single failed tile Range request. The plan limits this to file or style failures. One flaky request on a weak connection replaces a working map with the coordinates form.
- **Fix**: Ignore errors that carry `sourceId`/`tile` (tile errors), and keep `onError` for style, source-header and file failures.
- **Decision**: FIXED — pre-load `error` events carrying `tile` are ignored; style, source-header and file errors still call `onError`

### F9 — Missing migration test cases from the Testing Strategy

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: src/lib/services/plan-storage.test.ts:86-131
- **Detail**: The plan asks for v3, v2 and v1 cases "analogicznie" (analogous to the v4 cases). v3 is tested only for meeting promotion, and v2 only for backup promotion and keeping the shelter. There are no v3 backup or empty-places cases and no v2 meeting case. "v5 round-trip" is a parse-only check, with no `writePlan` → `readPlan` round trip. The shared `parseLegacyShelter` makes a regression unlikely.
- **Fix**: Add the missing v2 and v3 cases and a write→read round trip.
- **Decision**: FIXED — added v3 backup / v3 no-places, v2 meeting, and a v5 JSON round-trip (pure; no localStorage in the node test env)

### F10 — Leftover polish: stale "Ustaw tutaj" comments; "Moja pozycja" is not disabled while locating

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/hooks/useGeolocation.ts:35, src/lib/services/sensor-storage.ts:11, src/lib/navigation.ts:37, src/components/OwnShelterCard.tsx:311-320
- **Detail**: Three comments still describe the removed "Ustaw tutaj". The "Moja pozycja" button sets only `aria-busy`, so repeated taps start parallel `requestCurrentPosition` calls.
- **Fix**: Reword the three comments to describe "Moja pozycja", and add `disabled={locating}`.
- **Decision**: FIXED — three comments reworded; "Moja pozycja" gets `disabled={locating}`

## Triage summary

- **Fixed**: F1, F2, F4, F5, F6, F7, F8, F9, F10 (9)
- **Skipped**: F3 (1) — the Manual rows stay `[x]` without device records

Re-verified after the fixes: `npm test` (262 tests), `npm run lint`, `npx astro check` (0 errors), `npm run build`, `npm run smoke`, and MapLibre is still only in lazy chunks. F5 (focus) and F7/F8 (map behaviour) are UI changes that the unit tests do not cover. They were not checked on a device.
