<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Prowadzenie do punktu offline (S-01)

- **Plan**: context/changes/guided-to-point-offline/plan.md
- **Mode**: Deep
- **Date**: 2026-10-03
- **Verdict**: REVISE → SOUND (after triage: 9/9 fixed)
- **Findings**: 1 critical, 4 warnings, 4 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | FAIL |
| Lean Execution | PASS |
| Architectural Fitness | WARNING |
| Blind Spots | WARNING |
| Plan Completeness | WARNING |

## Grounding

6/6 existing paths ✓ (new files absent as expected), symbols ✓ (`data-offline-status`, precache glob, smoke contract; line refs stale: now `Welcome.astro:67`, `Layout.astro:39`), geo reference values 5/5 ✓ (251 977 m / 197.6°, 483.3 m / 297.4°, 111 195 m), Progress↔Phase ✓, brief↔plan ✗ minor (F7).

## Findings

### F1 — `/alarm` without trailing slash is served the home page by the service worker

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: End-State Alignment
- **Location**: Phase 3 §1 (`window.location.assign("/alarm")`), Phase 2 link to `/czujniki`, Key Discoveries ("Nowe strony wchodzą do precache bez zmian w konfiguracji")
- **Detail**: Astro builds with the default `build.format: "directory"`, so `dist/alarm/index.html` is precached as `alarm/index.html`. Workbox `generateURLVariations` (`node_modules/workbox-precaching/utils/generateURLVariations.js:26-31`) appends `index.html` only when the path ends with `/`; for `/alarm` it tries `/alarm` and `/alarm.html`, and both miss. The navigation then hits `NavigationRoute(createHandlerBoundToURL("/index.html"))` (`dist/sw.js`, from `navigateFallback` in `scripts/generate-sw.mjs`). Pressing the alarm shows the home page, online or offline, once the SW controls the page. The existing `/design` page has the same problem. Smoke cannot catch this because plain `fetch` does not go through the SW. The plan claims that precache works without config changes, and that claim is false for clean URLs.
- **Fix A ⭐ Recommended**: Set `build: { format: "file" }` in `astro.config.mjs` (`dist/alarm.html`, `dist/czujniki.html`); Workbox `cleanURLs` then matches `/alarm` → `/alarm.html`, and Cloudflare assets serve `/alarm` for `alarm.html`. Change the smoke assertion to `alarm.html` / `czujniki.html`, and add a manual check that `/czujniki` opens offline in Phase 2.
  - Strength: Fixes the whole class at once (`/design` too), and URLs stay clean in links and `location.assign`.
  - Tradeoff: Changes the output layout of an already deployed app; `/design/` with a trailing slash may start redirecting.
  - Confidence: HIGH — variation logic read directly from the installed Workbox.
  - Blind spot: Cloudflare `html_handling` for `.html` files not verified live.
- **Fix B**: Keep `directory` and use trailing slashes everywhere (`/alarm/`, `/czujniki/`, `trailingSlash: "always"` in Astro).
  - Strength: No change to build output.
  - Tradeoff: One link without the slash, typed or shared, silently brings the bug back.
  - Confidence: MEDIUM — depends on discipline at every call site.
  - Blind spot: Links typed by users or saved PWA shortcuts.
- **Decision**: FIXED (Fix A) — Phase 2 §6 `build.format: "file"`, Key Discoveries, smoke assertions, Progress 2.5, 2.10, 3.6, brief

### F2 — Plan ignores the tokens and `mode="execution"` delivered by PR #16

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Architectural Fitness
- **Location**: Current State Analysis, What We're NOT Doing (tokens), Phase 3 §2 (hex colours), Phase 4 §3 (CLAUDE.md convention), brief Key Decisions
- **Detail**: PR #16 (merged 4 minutes before the plan commit) added the Commissioner font, §6 tokens in `src/styles/global.css` (`[data-mode="execution"]` with `--background: #0b1117`, `--guidance: #f2c15c`, `--safe: #6bc49b`, `--muted-foreground: #a8b5c0`), the `execution` custom variant, and `Layout` prop `mode: "preparation" | "execution"`, which also sets `theme-color`. The plan still says that `global.css` has the untouched shadcn palette and that `Welcome.astro` has `bg-cosmic`, which is no longer true. It also tells the implementer to hardcode hex values locally and to record that as a CLAUDE.md convention, which would create a second, parallel colour system.
- **Fix**: Update Current State; `/alarm` uses `<Layout mode="execution">` and token classes (`bg-background`, `text-guidance`, `text-safe`…); remove the "colours locally" decision from the brief, NOT Doing and Phase 4 §3.
  - Strength: Reuses what already exists; theme-color and font come for free.
  - Tradeoff: Implementer must check which utility names the tokens expose.
  - Confidence: HIGH — tokens and prop verified in `global.css:101-134`, `Layout.astro:4-14`.
  - Blind spot: Whether every §6 value needed (e.g. dimmed arrow) has a token.
- **Decision**: FIXED — Current State, NOT Doing, Phase 2 §4, Phase 3 §2, Phase 4 §3, brief (tokens + `<Layout mode="execution">`)

### F3 — No screen wake lock on `/alarm`

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 3 §2 (GuidanceScreen)
- **Detail**: When walking 200–300 m, the screen auto-locks after 30–60 s. The arrow disappears, `watchPosition`/orientation listeners pause in the background, and the user has to unlock the phone mid-crisis. The plan never mentions it.
- **Fix**: In GuidanceScreen, `navigator.wakeLock?.request("screen")` in an effect, release on cleanup, re-acquire on `visibilitychange`; silently skip when unsupported.
- **Decision**: FIXED — wake lock in Phase 3 §2 contract, manual check 3.13

### F4 — iOS compass permission may not survive navigation or relaunch to `/alarm`

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Critical Implementation Details (permissions), Phase 3 §2
- **Detail**: The plan grants `DeviceOrientationEvent.requestPermission()` once on `/czujniki` and assumes `/alarm` (a new document, possibly after a standalone-PWA relaunch) receives events. On iOS the grant is not reliably kept across launches. Without it, the user gets only the movement fallback, and while standing there is no arrow. `/alarm` has no gesture to ask again.
- **Fix**: On `/alarm`, when `requestPermission` exists and no compass event arrived in ~1 s, show a secondary "Włącz kompas" button that calls `requestPermission()` in its click handler; add a manual check on iOS after relaunch.
- **Decision**: FIXED — "Włącz kompas" fallback button in Critical Implementation Details, manual check 3.14

### F5 — `useHeading` position-history contract has no owner and no jitter filter

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 2 §2
- **Detail**: `useHeading(positions: Coordinates[])` expects a history, but `useGeolocation` returns a single `coords`, and nobody keeps the array. The 5 m movement threshold is below typical GPS jitter (5–20 m, stated in the plan itself), so a standing user sees the fallback arrow spin randomly.
- **Fix**: `useHeading(coords, accuracyMeters)` keeps an internal anchor ref and updates the movement bearing only when the distance from the anchor is > max(10 m, accuracy).
- **Decision**: FIXED — Phase 2 §2 signature `useHeading(coords, accuracyMeters)`, internal anchor ref, threshold max(10 m, accuracy)

### F6 — Home page "nazwa i odległość" promise has no backing

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Desired End State pkt 1 vs Phase 2 §3
- **Detail**: The end state promises distance on the home page; the EvacuationPointCard contract shows a name with coordinates and runs no GPS watch.
- **Fix**: Change end state pkt 1 to "nazwę i współrzędne".
- **Decision**: FIXED — Desired End State pkt 1 now "nazwę i współrzędne"

### F7 — Brief still describes a Non-Goals deviation that the plan dropped

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: plan-brief.md Open Risks (last bullet)
- **Detail**: The brief says "Odstępstwo od Non-Goals wymaga wpisu w PRD", but the plan defers auto-shelter to S-10 and keeps the Non-Goal. The two documents say different things.
- **Fix**: Reword it as "decyzja o S-10 musi trafić do PRD i roadmapy (faza 4)".
- **Decision**: FIXED — brief Open Risks reworded (S-10 decision goes to PRD/roadmap, Non-Goal stays)

### F8 — Heading normalisation edge cases unspecified

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 2 §2 code snippet
- **Detail**: `e.alpha` can be `null`; `webkitCompassHeading` is not in `lib.dom` (type augmentation needed under `strictTypeChecked`); Firefox Android has no `deviceorientationabsolute`; landscape orientation is not compensated.
- **Fix**: Add to the contract: ignore events with `alpha === null`, a local `interface` for `webkitCompassHeading`, and either subtract `screen.orientation.angle` or treat portrait as the only supported orientation.
- **Decision**: FIXED — edge cases added to Phase 2 §2 contract (alpha null, CompassEvent type, no absolute event → movement fallback, portrait only)

### F9 — Vitest version must match Vite 8

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1 §5
- **Detail**: Astro 7 brings Vite 8.3.0; a pinned vitest with an older `vite` peer range will either fail `npm ci` on a peer conflict or install a second copy of Vite.
- **Fix**: Pin a vitest release whose peer range includes Vite 8 and confirm `npm ls vite` shows a single copy.
- **Decision**: FIXED — Phase 1 §5 pins vitest 5.0.3, `npm ls vite` single-copy check
