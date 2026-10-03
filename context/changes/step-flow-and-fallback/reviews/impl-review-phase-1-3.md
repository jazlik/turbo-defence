<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Kroki ewakuacji i przełączenie na miejsce zapasowe (S-02)

- **Plan**: `context/changes/step-flow-and-fallback/plan.md`
- **Scope**: Phases 1–3 of 4
- **Date**: 2026-10-03
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 6 warnings, 4 observations

## Scope note

The skill's default scope is "phases whose Progress checkboxes are fully `[x]`", which would be phases 1–2 only. Phase 3's code is committed (`481ee72`) with all five automated criteria green; only its field-test checkboxes (3.6–3.17) are unchecked, and those cannot be run from a desk. Reviewing 1–3 covers the committed code; phase 3's manual items stay pending and were **not** treated as complete. Phase 4 has not started.

## Automated verification (run during this review)

| Command | Result |
|---|---|
| `npm run lint` | pass (no output) |
| `npx astro check` | 33 files — 0 errors, 0 warnings, 0 hints |
| `npm test` | 4 files, 42 tests passed |
| `npm run build` | 4 pages, 27 files precached |
| `npm run smoke` | `smoke OK (http://localhost:4321)` |

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — A failed plan read is written back as an empty plan, destroying all three places

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Safety & Quality (data safety)
- **Location**: `src/lib/services/plan-storage.ts:77`, `src/lib/services/plan-storage.ts:105-112`, `src/components/GuidanceScreen.tsx:107-109`
- **Detail**: `parsePlan` degrades every failure — unparseable JSON, unknown `schemaVersion` — to `createEmptyPlan()` (`:54`, `:77`). That read-side behavior is correct and crisis-safe. The problem is the write side: `saveLastKnownPosition` (`:105-112`) uses `readPlan()` as its base and is called from a `useEffect` keyed on `coords`, i.e. on **every GPS fix** while `/alarm` is open. So an unreadable entry is silently overwritten with an empty plan within a second of entering alarm mode, with no user action.

  The plan's Migration Notes already state that a downgrade "reads as an empty plan". What it did not account for is that the empty plan then gets **persisted over** the real one — degradation becomes destruction. Today the only reachable trigger is a corrupt/truncated `wrw.plan` entry (rare, and that data was already unreadable). It becomes genuinely dangerous the moment a `schemaVersion: 3` ships and any device loads an older cached bundle: three valid places are destroyed mid-crisis. This change is what introduces versioning as a live concept, so it is the right moment to fix the direction of travel.
- **Fix A ⭐ Recommended**: Treat "read failed" as a distinct state and never auto-write over it — have `readPlan` signal the failure (e.g. return `{ plan, source: "stored" | "migrated" | "empty-after-failure" }`), and make `saveLastKnownPosition` a no-op when `source === "empty-after-failure"`. Additionally, treat `schemaVersion > CURRENT_SCHEMA_VERSION` as "do not touch" rather than "empty".
  - Strength: Fixes the actual mechanism (an automatic, non-user-initiated write) rather than the symptom, and leaves the user's data recoverable by hand. User-initiated saves from `PlaceCard` still work.
  - Tradeoff: Changes `readPlan`'s return shape, touching all four call sites (`GuidanceScreen`, `PlaceCard`, `saveLastKnownPosition`, tests). More than a one-liner.
  - Confidence: HIGH — the write path is confirmed at `GuidanceScreen.tsx:107-109` → `plan-storage.ts:107`.
  - Blind spot: Have not checked whether a future slice wants the "corrupt → start clean" behavior deliberately.
- **Fix B**: Before overwriting an entry that failed to parse, copy the raw string to a `wrw.plan.corrupt` key.
  - Strength: Few lines, confined to `plan-storage.ts`, makes the loss recoverable.
  - Tradeoff: Data is still destroyed in the live key; recovery needs a developer. Does not stop the automatic write.
  - Confidence: MEDIUM — simple, but it mitigates rather than prevents.
  - Blind spot: A second write after the first would overwrite the backup key too unless guarded.
- **Decision**: FIXED via Fix A — `PlanSource` added; `readPlanResult` reports `unreadable`, `saveLastKnownPosition` skips the automatic write in that case; unknown `schemaVersion` is now "do not touch". Regression test added (`parsePlanWithSource`, 2 cases).

### F2 — "Wyjdź z trybu alarmu" leaves the run behind, so a later real alarm can skip the backpack step

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Plan Adherence (the plan itself looks flawed here — the code matches it)
- **Location**: `src/components/GuidanceScreen.tsx:66-72` (`ExitLink`) vs `src/components/GuidanceScreen.tsx:158-161` (`finishRun`)
- **Detail**: The plan states this explicitly: "„Wyjdź z trybu alarmu" **nie** czyści przebiegu — dzięki temu powrót na `/alarm` wraca na ten sam krok" (plan.md:273). The code implements it faithfully — `ExitLink` is a plain `<a href="/">` and `clearRun()` is reachable only from `Zakończ tryb alarmu`, which renders only on the final step's arrival screen.

  The consequence the plan did not trace: a user triggers the alarm by accident, taps `Zrobione — dalej` past the backpack step, then taps `Wyjdź z trybu alarmu`. Two hours later, a real alarm opens `/alarm` directly on `Idź do miejsca spotkania`. The one step that must never be skipped — take the evacuation backpack — is skipped silently, with nothing on screen indicating a previous run is being resumed. The 6-hour freshness threshold bounds the window but does not close it; the resume is also invisible, which conflicts with "minimum decyzji w kryzysie" only in the sense that the user is given no decision at all.

  Note also that the run is never written on *entering* `/alarm`, so `startedAt` is really "time of the first step advance", not alarm start.
- **Fix A ⭐ Recommended**: Make the resume visible instead of silent — on mount, when `readRun()` returns a run that resumes past step 0, show a one-tap choice ("Wracasz do przerwanej ewakuacji" / "Zacznij od początku") before the step screen.
  - Strength: Keeps the plan's resume guarantee (the real reason it exists: surviving an app kill mid-march) while removing the silent-skip failure. One extra decision, only in the ambiguous case.
  - Tradeoff: Adds a screen state the plan did not specify, and one decision in a crisis path — exactly what the plan's principles push against. Needs a plan addendum.
  - Confidence: MEDIUM — resolves the conflict, but the UX belongs to the product owner, not the reviewer.
  - Blind spot: Have not checked how this interacts with the NFR stopwatch measurement in 3.6.
- **Fix B**: Make `Wyjdź z trybu alarmu` clear the run, and rely on the app-kill path alone for resume.
  - Strength: Matches what the label promises ("exit alarm mode" reads as ending the run). Smallest change; `ExitLink` becomes a button calling `clearRun()`.
  - Tradeoff: Loses deliberate resume — a user who exits to check something on the home page returns to step 1. Directly contradicts the plan's stated rationale.
  - Confidence: HIGH on the mechanics, LOW that it is the behavior wanted.
  - Blind spot: None significant.
- **Decision**: FIXED via Fix A — resume-confirmation screen added to `GuidanceScreen` (`resumePrompt`), with "Kontynuuj: <krok>" and "Zacznij od początku" (`restartRun` clears the run). A fresh alarm has no run, so the NFR 3.6 path is unchanged. Needs a plan addendum (F8 was skipped, so phase 4 should pick it up).

### F3 — A failed save is reported to the user as a success

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality (reliability)
- **Location**: `src/lib/services/plan-storage.ts:96-102`, `src/components/PlaceCard.tsx:53-54`, `src/components/PlaceCard.tsx:67-70`, `src/components/PlaceCard.tsx:87`
- **Detail**: `writePlan` swallows the exception and returns `void`, so `savePlace` cannot tell whether the write landed and unconditionally follows it with `setFeedback({ kind: "saved", … })`. On iOS Safari private browsing, or with site data blocked, `setItem` throws `QuotaExceededError`; the user taps `Ustaw tutaj`, reads the green `Zapisano bieżącą pozycję (dokładność ±8 m)`, and closes the app believing the family plan is stored. The next alarm shows `Nie wskazano żadnego miejsca`. For an app whose whole proposition is "the plan lives on this device", a false save confirmation is the worst available failure mode. `run-storage.ts:45-51` has the same `void` + silent-catch shape.
- **Fix**: Change `writePlan` (and `writeRun`) to return `boolean` — `false` from the `catch` — and drive `PlaceCard`'s feedback from it, e.g. `{ kind: "error", text: "Nie udało się zapisać na tym urządzeniu — odblokuj dane witryny w ustawieniach przeglądarki." }`. Widening `void` → `boolean` is non-breaking for every existing call site.
  - Strength: Turns a silent, invisible failure into an actionable Polish message; the catch block already exists, only the return value and one branch are new.
  - Tradeoff: Adds a feedback branch and its copy; `GuidanceScreen`'s `writeRun` calls would ignore the result unless also handled.
  - Confidence: HIGH — the unconditional `setFeedback` is confirmed at `PlaceCard.tsx:67` and `:87`.
  - Blind spot: Have not verified the exact exception type Safari throws in every blocked-storage mode; catching broadly already covers it.
- **Decision**: FIXED — `writePlan` and `writeRun` now return `boolean`; `savePlace` propagates it and both `PlaceCard` entry points show `STORAGE_ERROR` instead of a false "Zapisano".

### F4 — The hold → confirm hand-off drops focus and is never announced

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality (accessibility)
- **Location**: `src/components/GuidanceScreen.tsx:321-343`
- **Detail**: When `confirming` flips, a `HoldButton` is swapped for a `Button` in the same slot. They are different component types, so React unmounts and remounts rather than updating, and focus falls to `<body>`. The `aria-live="polite"` region at `:224` covers only the arrow/distance section, not the footer, so nothing is announced either.

  A keyboard or switch user holds Space on `Potwierdź dojście` for 2 s; the button vanishes, focus is lost, and `Potwierdź: jestem na miejscu` is reachable only by tabbing from the top of the document, with no signal that stage two appeared. This is the two-stage confirm's whole purpose failing for exactly the users the `sr-only` hint was added for.

  Secondary, same location: `confirming` has no cancel and is not reset when GPS arrival hides the button (`:321` gates on `!showArrival` only). If a fix later goes stale and `showArrival` flips back to false, the confirm button reappears already armed — the hold gate is silently gone and a single tap advances the step.
- **Fix**: Hold a `ref` on the confirm button and `focus()` it when `confirming` flips to true, and wrap the footer action slot in `role="status"` so the new stage is announced. Reset `confirming` to `false` whenever `showArrival` becomes true.
  - Strength: Restores the hold gate's guarantee for keyboard and screen-reader users and closes the re-arm edge in the same place; both are small, local edits.
  - Tradeoff: A programmatic `focus()` can be disruptive if the user had moved focus elsewhere during the 2 s hold — unlikely while physically holding the control.
  - Confidence: HIGH — the component-type swap at `:322-343` is confirmed, as is the live region's scope at `:224`.
  - Blind spot: Not tested with a real screen reader; the announcement wording may need tuning.
- **Decision**: FIXED — `confirmButtonRef` + focus effect on the `confirming` flip, footer action slot wrapped in `role="status"`, and `confirming` is reset during render when `showArrival` becomes true.

### F5 — The red "Punkt niedostępny" stays on screen after arrival

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: `src/components/GuidanceScreen.tsx:215`, `src/components/GuidanceScreen.tsx:310`
- **Detail**: `fallbackAvailable` is `step.fallback !== null && !(run?.fallbackActive ?? false)` — unlike the sibling `showCompassButton` at `:214`, it never checks `!showArrival`. The plan's state table specifies the intermediate arrival state as showing "jedna akcja guidance" (plan.md:262). In practice, after arriving at the meeting place the footer renders `Dalej: Idź do punktu ewakuacji` **and**, directly below it, the red `Punkt niedostępny — idź do zapasowego` — a red emergency control offered while the user is standing on the point it calls unavailable.

  Behaviorally it is coherent (switching recomputes the target and guidance resumes toward the backup), and JV §5's view pattern does allow one guidance action plus one emergency action, so this is a drift from the plan's state table rather than a hard §5 violation. Related and folded in here: the footer order is arrival-action → compass → fallback → confirm → exit, whereas the plan described fallback → confirm → exit with `Dalej` taking the confirm slot.
- **Fix**: `const fallbackAvailable = !showArrival && step.fallback !== null && !(run?.fallbackActive ?? false);`
- **Decision**: FIXED — `fallbackAvailable` now gated on `!showArrival`.

### F6 — The `sr-only` gesture hint sits inside the button, so it becomes part of the accessible name

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `src/components/HoldButton.tsx:75-76`
- **Detail**: The plan said to repeat the hint "wzorem `AlarmButton.tsx:112`", i.e. as a *description*. `AlarmButton` places it inside the external hint paragraph (`AlarmButton.tsx:56-60`), referenced via `aria-describedby="alarm-hint"`. `HoldButton` instead places the `sr-only` span inside the `<button>` (`:76`), while *also* wiring `aria-describedby={hintId}`. The hint therefore joins the accessible name: a screen reader announces "Punkt niedostępny — idź do zapasowego Z czytnikiem ekranu: stuknij dwa razy i przytrzymaj.", and during the hold the name mutates to "Trzymaj jeszcze 2 s Z czytnikiem ekranu…". A name that changes mid-interaction breaks name-based navigation and voice control.
- **Fix**: Delete the `sr-only` span from inside the button and append the gesture sentence to the shared `<p id="hold-hint">` at `GuidanceScreen.tsx:346`, which both hold buttons already reference via `aria-describedby`.
- **Decision**: SKIPPED

### F7 — `useHoldAction` never resets after a completed hold

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality (reliability, latent)
- **Location**: `src/components/hooks/useHoldAction.ts:62-66`
- **Detail**: The completion path calls `stopTimers()`, which nulls `frame` and `timer` but leaves `holdStart.current` set and `progress` at ~1. `start()`'s guard at `:59` then short-circuits forever and `holding` stays `true`, freezing the label at `Trzymaj jeszcze 0 s`. Not live today: all three call sites unmount or navigate on completion (`AlarmButton` assigns `location`; both `HoldButton`s in `GuidanceScreen` are conditioned out). But the hook was just promoted to a shared, generically-parameterised primitive documented as reusable, and the next hold button that stays mounted is a one-shot control with a dead label.
- **Fix**: Call `cancel()` instead of `stopTimers()` before `complete.current()` inside the timeout at `:62-65`.
- **Decision**: FIXED — `cancel()` instead of `stopTimers()` before `complete.current()` in the hold timeout.

### F8 — Undocumented additions beyond the plan's contracts

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: `src/lib/evacuation-steps.ts:16-29`, `src/lib/evacuation-steps.ts:79-83`, `src/components/GuidanceScreen.tsx:92`, `src/components/GuidanceScreen.tsx:100`, `src/components/GuidanceScreen.tsx:345-349`
- **Detail**: Each of these is justified by a plan requirement but absent from the stated contracts. No "What We're NOT Doing" guardrail was violated — speech, map, contacts, onboarding, readiness screen, editable steps, run summary, step-back, new tokens, new pages, SW changes and component tests are all correctly absent.
  1. `stepContent(step, run)` plus a `NAVIGATION_CONTENT.backup` entry — required by the phase-3 clause "tytuł kroku zmienia się na wariant dla miejsca zapasowego", but not in the `evacuation-steps.ts` contract.
  2. `confirmedArrival` state — manual confirmation on the **last** step produces the end state; the plan's table conditions that state on GPS arrival only. A reasonable completion of the two-stage confirm, but an added path.
  3. `useGeolocation({ watch: steps.length > 0 })`, previously `watch: point !== null` — the watcher now also runs during the backpack action step, which has no target. Plausibly deliberate (a warm fix before guidance starts, helping the < 2 s NFR), but it is a behavior change inside a sensor layer the plan froze as "bez zmian".
  4. The shared `<p id="hold-hint">` paragraph — implied by the `hintId` prop, not specified.
  5. Copy tweaks: `HomeScreen.astro:35` ("Wskaż punkt" → "Wskaż miejsca"), `PlaceCard.tsx:113` (empty state), `GuidanceScreen.tsx:232` (final-step arrival subtitle).
- **Fix**: Record items 1–3 as an addendum in `plan.md` during phase 4, which already opens the documentation files; items 4–5 need no action.
- **Decision**: SKIPPED — no addendum written; phase 4 already opens the documentation files.

### F9 — A saved place cannot be renamed without re-acquiring coordinates

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality (reliability/UX)
- **Location**: `src/components/PlaceCard.tsx:37`, `src/components/PlaceCard.tsx:50`, `src/components/PlaceCard.tsx:118-131`
- **Detail**: `label` reaches storage only through `savePlace`, which is reachable only from `Ustaw tutaj` or the coordinates form. The `Nazwa miejsca` input is pre-filled from the stored place and so reads as a persisted field, but editing it alone does nothing — renaming requires re-acquiring GPS or re-typing coordinates. This behavior is carried over 1:1 from `EvacuationPointCard` as the plan required, so it is pre-existing rather than introduced; the change triples the number of such inputs on the home screen, and manual check 2.6 exercises exactly this flow.
- **Fix**: Persist the label on blur when the place already has coords, or add an explicit `Zapisz nazwę` action.
- **Decision**: SKIPPED — pre-existing behavior carried over from `EvacuationPointCard`.

### F10 — Test file imports types by relative path instead of the `@/` alias

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: `src/lib/evacuation-steps.test.ts:4`
- **Detail**: Uses `from "../types"` while every other module in `src/` imports shared types as `@/types` (e.g. `plan-storage.ts:1`, `evacuation-steps.ts`). Harmless — it resolves and the suite passes — but it is the only place in the new code that sidesteps the path alias CLAUDE.md documents.
- **Fix**: Change to `import type { … } from "@/types";`.
- **Decision**: FIXED — now imports from `@/types`.

## What was checked and found clean

- **The v1 → v2 migration itself** (`plan-storage.ts:53-78`): non-lossy, `evacuationPoint` → `places.shelter` through the same `parsePlace` validator, `lastKnownPosition` and `updatedAt` preserved, per-place validation isolating one damaged place from the other two, and — importantly — the migrated plan is **not** eagerly written back, so the v1 entry survives until a real user save. Covered by `plan-storage.test.ts:70-92`. F1 concerns the *unknown-version* branch, not this one.
- **Cross-island write safety** (the plan's CRITICAL note): `savePlace` re-reads via `readPlan()` at `PlaceCard.tsx:47` immediately before merging and writing at `:53`, and both entry points (`setHere`, `saveTyped`) funnel through it. There is exactly one `writePlan` call in the file. Card A cannot clobber card B. `wrw.run` is a separate key, so the run and `saveLastKnownPosition` never collide.
- **The < 2 s NFR**: `GuidanceScreen.tsx:86` passes `readSession` as a *lazy* `useState` initializer, so plan, steps, run and resume index all resolve in the first render pass — no `useEffect`, no flash of step 1 before jumping to the resumed step. `run` and `stepIndex` seed from the same snapshot (`:88-89`) and cannot disagree.
- **Hold-machine fidelity**: all eight handlers moved 1:1 from the pre-change `AlarmButton`, including the pointer-capture release on `pointerdown` and `cancelAnimationFrame` + `clearTimeout` cleanup. `AlarmButton` keeps its DOM structure, classes, labels, 2000 ms duration and ring geometry.
- **Effect cleanup / leaks**: `useHoldAction` cancels rAF and timeout on unmount; `useGeolocation` clears its watch; `useScreenWakeLock` releases the sentinel and removes its listener; `useNow` clears its interval; the compass-silence timer clears. All hooks run before the first early return at `:163` — no conditional-hook violation.
- **Security**: no `innerHTML` / `set:html` / `dangerouslySetInnerHTML` anywhere in `src/`; the only `fetch` is `scripts/smoke.mjs` against `BASE_URL`; no secrets, nothing sent off-device, `public/_headers` untouched.
- **Tokens and conventions**: no hex literals in any changed component, all merging through `cn()`, no `"use client"`, Polish copy throughout, three localStorage-reading islands correctly mounted `client:only="react"`, `evacuation-steps.ts` correctly placed in `src/lib/` (pure) rather than `src/lib/services/`.
- **Guardrails**: none of the eleven "What We're NOT Doing" items were built.
- **Success criteria honesty**: phase 3's manual checkboxes are correctly left unchecked — no rubber-stamping. Phase 1's manual migration claim is backed by `plan-storage.test.ts:70-92`; phase 2's save-isolation claim is backed by the read-before-write path above.
