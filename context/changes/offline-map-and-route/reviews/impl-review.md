<!-- IMPL-REVIEW-REPORT -->

# Implementation Review: Mapa i trasa offline (S-04) — branch fix/map-happy-path

- **Plan**: context/changes/offline-map-and-route/plan.md (+ team decisions from 2026-10-04: map-first happy path, PSP auto shelter with manual fallback, no dead-end alarm)
- **Scope**: branch `fix/map-happy-path` vs `origin/main` (361f9bc, 6a50138) + regression risk to S-02/S-03/S-04
- **Date**: 2026-10-04
- **Verdict**: NEEDS ATTENTION → all findings fixed in triage (2026-10-04)
- **Findings**: 0 critical, 8 warnings, 3 observations

Automated evidence: `npm ci`, `astro sync`, `eslint .` PASS; `vitest` 212/212 (19 files); `astro check` 0 errors / 0 warnings / 0 hints; `astro build` + `generate-sw` OK (77 precached files, no Workbox warnings); `smoke` OK; `/alarm` entry chunk has no MapLibre (lazy). Desktop browser checks earlier in the session: map-first happy path, amber route (casing + `--guidance`, walked part dimmed), find-target online (real OSRM) and offline (straight-line), map-file failure → arrow, readiness status both states. iPhone/Android not tested.

## Verdicts

| Dimension           | Verdict |
| ------------------- | ------- |
| Plan Adherence      | PASS    |
| Scope Discipline    | PASS    |
| Safety & Quality    | WARNING |
| Architecture        | PASS    |
| Pattern Consistency | WARNING |
| Success Criteria    | WARNING |

## Findings

### F1 — "Znajdź" can hang forever on an unexpected error

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/GuidanceScreen.tsx:361-407, src/lib/services/emergency-target.ts:51-57
- **Detail**: `findTarget` has no try/finally. `refreshRoutes` rethrows non-RoutingError exceptions and `readSession()` can throw; the promise is fired with `void`, so the finder stays "searching", the button stays disabled and nothing is shown. `clearTimeout` is skipped on rejection.
- **Fix**: Wrap the search in try/catch/finally; any exception falls back to the nearest PSP point (direct) and the finder always leaves "searching"; clear the timer in `finally`.
- **Decision**: FIXED — try/catch/finally in findTarget ("failed" state), emergency-target catches any routing exception and clears the timer; test for a non-RoutingError.

### F2 — Data-load and storage failures are misreported or silent

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/GuidanceScreen.tsx:375, :398-400
- **Detail**: (a) `loadShelters(...).catch(() => [])` and `fetchJson` without `res.ok` turn "snapshot not loaded" into "W pobliżu nie ma punktu schronienia". (b) If `writeNavigation` fails (storage blocked), `readSession()` re-reads the old state, steps stay empty and the user is back on the find screen with no message (CLAUDE.md: write failures must surface).
- **Fix**: Separate `no-data` state with its own copy and `res.ok` check; build the next session from `outcome.navigation` in memory and persist best-effort.
- **Decision**: FIXED — separate "no-data" state, fetchJson checks res.ok; next session built from the route in memory (readSession(navigationOverride)), storage write best-effort.

### F3 — Map view (now default) lacks "Potwierdź dojście" (S-02 regression)

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/components/GuidanceScreen.tsx:628-650
- **Detail**: Hold-to-confirm arrival (needed indoors / weak GPS), VoiceToggle and Exit are only on the big-arrow view. With the map as default, confirming arrival needs a detour through "Duża strzałka".
- **Fix**: Add the existing confirm-arrival HoldButton + confirm step to the map `controls`; keep VoiceToggle/Exit on the arrow view to save height.
  - Strength: restores the S-02 contract on the default view with existing components.
  - Tradeoff: one more row under the map.
  - Confidence: HIGH — same JSX already used on the arrow screen.
  - Blind spot: real phone height with all controls visible.
- **Decision**: FIXED — confirm-arrival hold + confirm step shared by the map and the arrow view (confirmArrivalControl).

### F4 — Voice still says "Wróć do planu" on the new find screen (S-03)

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/voice.ts:90, src/components/GuidanceScreen.tsx:471
- **Detail**: The `noSteps` phrase contradicts the screen that now offers "Znajdź najbliższy schron teraz".
- **Fix**: Change the `noSteps` phrase to point at the find action (update its voice test).
- **Decision**: FIXED — noSteps voice phrase points at "Znajdź najbliższy schron teraz".

### F5 — MapLibre start-up failure leaves a blank map instead of the arrow

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/map/ExecutionMap.tsx:104-131
- **Detail**: Pre-existing, but now on the default path: `new MapLibreMap()` throwing (no WebGL) inside `.then` is unhandled and never calls `onError`, so `/alarm` shows an empty map rather than falling back.
- **Fix**: try/catch around construction + `.catch` on `openMapFile(...)` calling `onErrorRef.current()`.
- **Decision**: FIXED — map start-up failures (missing file, constructor throw, webglcontextlost, rejected open) call onError → arrow view.

### F6 — One emergency tap turns into standing routing consent

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/emergency-target.ts:46, src/components/hooks/useRouteRefresh.ts:80
- **Detail**: The find-target route path persists `routingConsent: true`, which later enables background route refresh from Home (every 30 min / visibility / online) without the RouteCard consent copy. Only coordinates are sent, but the screen describes a one-time send.
- **Fix A ⭐ Recommended**: Persist the prepared route but keep the previous `routingConsent` value.
  - Strength: matches the one-time wording; the setup card still asks for standing consent.
  - Tradeoff: after an emergency, routes are not auto-refreshed until the user consents in setup.
  - Confidence: HIGH — refreshRoutes does not read the flag.
  - Blind spot: none significant.
- **Fix B**: Keep it and say on the find screen that consent is remembered.
  - Strength: routes stay fresh after a crisis.
  - Tradeoff: longer copy in a stressful moment.
  - Confidence: MED.
  - Blind spot: team's privacy expectations.
- **Decision**: FIXED via Fix A — find-target keeps the previous routingConsent; test updated.

### F7 — Worst-case wait on "Znajdź" is ~45 s

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/components/GuidanceScreen.tsx:363-366
- **Detail**: Without a fresh fix the one-shot position request waits up to 30 s (high accuracy) even if the watcher gets a fix sooner, then routing can take up to 15 s. The last-known fallback is the one from page load, not the newer stale fix.
- **Fix**: Cap the one-shot request (~10 s), fall back to the latest watched fix, then the saved position; keep the 15 s routing race.
  - Strength: bounded wait in a crisis.
  - Tradeoff: a less accurate first position in poor signal.
  - Confidence: MED — field behaviour of GPS warm-up unmeasured.
  - Blind spot: iOS cold-start fix times.
- **Decision**: FIXED — one-shot position capped at 10 s, then latest watched fix (ref), then saved position; 15 s routing race kept.

### F8 — Focus and headings when switching views

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/map/MapOverlay.tsx:96-101
- **Detail**: Map ↔ arrow switches unmount the focused button (focus drops to body); map view has no h1; `aria-live` on the distance block can chatter on every fix and talk over speech.
- **Fix**: Title as h1 (tabIndex -1) focused on view change; move aria-live off the distance.
- **Decision**: FIXED — map title is an h1 focused on mount, arrow h1 focused after leaving the map; distance out of live regions, notice region always mounted.

### F9 — Emergency/route start not persisted in the run

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/GuidanceScreen.tsx:387-404
- **Detail**: Direct emergency target lives only in React state; the route path jumps to the shelter step without `writeRun`. A reload returns to the find screen (direct) or the backpack step (route).
- **Fix**: Write the run at the shelter step after a route is found; accept re-search for the in-memory direct case.
- **Decision**: FIXED (route path) — run written at the shelter step; direct emergency target stays in-memory by design (re-search after reload).

### F10 — Docs and helper placement drift

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: context/changes/offline-map-and-route/change.md:17, plan.md; src/components/ReadinessStatus.tsx:6
- **Detail**: change.md still says the map is a secondary view; the 2026-10-04 team decisions (map-first happy path, PSP + manual fallback, no dead-end alarm) are not recorded. `needsHomeScreenInstall` (not a hook) is imported from a hooks module; ReadinessStatus reads state once per page load.
- **Fix**: Add a dated decisions note to change.md; move the helper to src/lib; leave read-once as is.
- **Decision**: FIXED — 2026-10-04 team decisions recorded in change.md; needsHomeScreenInstall moved to src/lib/platform.ts.

### F11 — Fallback router retried the dead service on every call (found during live re-check)

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/routing/fallback.ts
- **Detail**: During the review FOSSGIS OSRM stopped answering (75 s timeouts) while Valhalla answered in 0.1 s. `withFallback` tried OSRM first on the matrix and on both routes, paying a 10 s timeout each time, so the online emergency search exceeded its 15 s limit and degraded to straight-line guidance (live: 18 s, direct) although a working router was available.
- **Fix**: Sticky fallback — the router that answered after a failure is tried first on later calls; test added.
- **Decision**: FIXED — live re-check with OSRM down: route prepared in 12.4 s via Valhalla, including route B.
