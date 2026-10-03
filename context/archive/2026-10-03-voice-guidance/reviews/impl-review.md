<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Głos prowadzący po polsku (S-03)

- **Plan**: context/changes/voice-guidance/plan.md
- **Scope**: Phases 1–4 of 4 (code complete; automated checks for 1–3 done; manual phone checks 2.6–2.9, 3.6–3.12, 4.3 and CI 4.1–4.2 pending)
- **Date**: 2026-10-03
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 3 warnings, 5 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | WARNING |

Automated checks run during review: `npm test` (62 passed), `npm run lint` (clean), `npx astro check` (0 errors), `npm run build` (OK, 26 precached files), `npm run smoke` (OK against `astro preview` on :4321).

## Findings

### F1 — „Sprawdź głos” calls speak() after an await, not synchronously in the click

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: src/components/VoiceCheck.tsx:60
- **Detail**: Plan (Phase 2 §2, Critical Implementation Details) requires `speak("Głos prowadzenia działa.")` to be called directly in the click handler — "`await` przed `speak()` w handlerze gubi gest na iOS". `checkVoice` runs an async IIFE that does `await loadPolishVoice()` and only then `speak()`. On Chromium `loadPolishVoice` can wait up to 2 s for `voiceschanged`. The in-code comments contradict each other ("we must call speak() synchronously" vs. the actual await). Risk: on iOS the check reports „Nie zadziałało” for a working voice — exactly the test meant to decide go/no-go for the demo phones.
- **Fix**: Preload the voice in a mount `useEffect` (`loadPolishVoice()` into state) and call `speak()` synchronously in `checkVoice` with the preloaded voice; if loading has not finished yet, speak with `voice: null` (`lang: "pl-PL"`) and resolve the result once the load completes.
  - Strength: Matches the plan contract and the `requestHeadingPermission()` pattern from S-01; `useVoiceGuidance` already preloads the same way.
  - Tradeoff: Small state addition in VoiceCheck; the „local” flag must be read from the preloaded result.
  - Confidence: HIGH — the gesture rule is documented in the plan's Key Discoveries.
  - Blind spot: Not verified on a real iOS device whether a single resolved-promise microtask actually loses the gesture.
- **Decision**: FIXED — voice preloaded on mount; `speak()` now called synchronously in `checkVoice`

### F2 — A slow TTS start leaves voice stuck in "blocked" and silences guidance

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/speech.ts:59
- **Detail**: `speak()` resolves `"blocked"` if `start` does not arrive in 1500 ms; a later `start` is ignored (`settled` is already true). The hook then sets `blocked=true`, which makes `active` false (src/components/hooks/useVoiceGuidance.ts:99) and suppresses every subsequent announcement until the user taps „Włącz głos” — even though the phone was actually speaking. Cold start of Google TTS offline (first utterance after app launch) can plausibly exceed 1.5 s.
- **Fix A ⭐ Recommended**: Let a late `start` clear the block — e.g. `speak()` accepts an optional `onLateStart` callback (or the hook listens via a returned handle) and `say` calls `setBlocked(false)` when it fires.
  - Strength: Keeps the plan's 1500 ms iOS detection while removing the false positive; no UX change when truly blocked.
  - Tradeoff: Slightly wider `speak()` contract.
  - Confidence: MED — logic is clear; real TTS latency unmeasured.
  - Blind spot: Actual start latency on demo phones (manual check 3.6).
- **Fix B**: Raise the timeout to ~3000 ms.
  - Strength: One-line change.
  - Tradeoff: „Włącz głos” appears later on iOS when truly blocked; still not robust to slower engines.
  - Confidence: MED — threshold is a guess either way.
  - Blind spot: Same as A.
- **Decision**: FIXED via Fix A — `speak()` takes `onLateStart`; `say()` clears `blocked` when a late `start` arrives

### F3 — S-03 marked `done` while the Phase 2 go/no-go gate is untested

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: context/foundation/roadmap.md:33
- **Detail**: Roadmap row, slice section (line 119) and plan item 4.4 mark S-03 `done`, but all phone checks (2.6–2.9, 3.6–3.12, 4.3) and CI items 4.1–4.2 are unchecked. Phase 2's Implementation Note is a decision gate: if no demo phone speaks Polish offline, revisit recorded messages. Phases 3–4 proceeded without it, and 2.9 (cancel() swallowing speech) was to be recorded in `change.md` Notes — it is not. The roadmap text does disclose the deferral, so this is visible, not hidden.
- **Fix A ⭐ Recommended**: Keep the code, but set S-03 status back to an in-progress value (e.g. `in-progress`) in both roadmap places until 4.3 passes, and add the pending field checks to `change.md` Notes.
  - Strength: Roadmap reflects reality; the gate cannot be forgotten before the demo.
  - Tradeoff: Archive/merge is either delayed or happens with a non-done slice.
  - Confidence: HIGH — evidence is the unchecked Progress list.
  - Blind spot: Roadmap status vocabulary beyond `proposed`/`done` not confirmed.
- **Fix B**: Accept `done` with the existing "testy odłożone" note.
  - Strength: No churn; the deferral is already written down.
  - Tradeoff: A slice reported done may need a design reversal (recorded audio).
  - Confidence: MED — depends on the team reading the note.
  - Blind spot: None significant.
- **Decision**: FIXED via Fix A — S-03 set to `in-progress` in roadmap (table + slice section); pending phone checks listed in change.md Notes

### F4 — VoiceCheck renders its own result badge instead of extending ResultBadge

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/components/VoiceCheck.tsx:76
- **Detail**: Plan said "rozszerzając `ResultBadge` o nowe warianty zamiast budować drugi komponent"; VoiceCheck uses its own `RESULT_COPY` + inline markup (SensorCheck.tsx:34 has `ResultBadge`). Visual roles (safe/attention/destructive, text + icon) match, so this is consistency, not a UX defect.
- **Fix**: Record as an accepted deviation in the plan (voice results carry instructions that ResultBadge does not), or export ResultBadge and add the voice variants.
- **Decision**: FIXED — recorded as an accepted deviation in plan.md "Addendum (impl-review 2026-10-03)"

### F5 — Unplanned behaviour: arrival jitter guard, pagehide stop, local/network line

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/components/hooks/useVoiceGuidance.ts:16
- **Detail**: Not in plan: `ARRIVAL_JITTER_METERS` silence after arrived→guiding (<50 m), `pagehide` → `stopSpeaking()` (needed: leaving `/alarm` is a full navigation, so unmount cleanup never runs), and the extra „Głos lokalny / sieciowy” line in VoiceCheck. All benign and justified.
- **Fix**: Add a short addendum to the plan listing these three additions.
- **Decision**: FIXED — three additions documented in plan.md "Addendum (impl-review 2026-10-03)"

### F6 — "searching" transition always says "Utracono sygnał GPS"

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/voice.ts:78
- **Detail**: Any non-entry transition into `searching` speaks "Utracono sygnał GPS. Czekam na połączenie." — also from `locationProblem` (user just granted permission; there was never a signal). Misleading phrase in a stress context.
- **Fix**: Branch on `previous.kind`: from `locationProblem` say "Szukam sygnału GPS. Wyjdź pod otwarte niebo."; add a test case.
- **Decision**: FIXED — `phraseFor` speaks „Szukam sygnału GPS…” after `locationProblem`; two tests added

### F7 — loadPolishVoice leaves a voiceschanged listener when the timeout wins

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/speech.ts:17
- **Detail**: The 2 s timeout resolves without removing `handler`; each call that times out leaves a listener attached. Harmless in practice (handler only resolves an already-settled promise), but repeated „Sprawdź ponownie” accumulates listeners.
- **Fix**: Use one `finish()` that clears the timer and removes the listener, called from both paths.
- **Decision**: FIXED — single `finish()` clears the timer and removes the listener on both paths

### F8 — No voice controls on the "no point" screen while it speaks

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/components/GuidanceScreen.tsx:96
- **Detail**: The hook speaks „Nie wskazano punktu ewakuacji.” on the `noPoint` view, but that early-return view has neither the voice toggle nor „Włącz głos”/„Głos niedostępny” text. Plan item 5 implies the toggle is always on `/alarm`.
- **Fix**: Render the same voice footer controls in the `noPoint` branch (extract a small `VoiceControls` component), or skip speaking `noPoint`.
- **Decision**: FIXED — `VoiceToggle` extracted and rendered on the noPoint screen too; „Włącz głos” deliberately left out there (would compete with the primary „Ustaw punkt ewakuacji” and only unlock „Nie wskazano punktu”)

## Triage summary

- Fixed: F1, F2 (Fix A), F3 (Fix A), F4, F5, F6, F7, F8 (8)
- Re-run after fixes: `npm test` 64 passed, lint clean, `astro check` 0 errors, build OK, smoke OK.
- Still open: phone/field checks listed in `change.md` Notes; S-03 stays `in-progress` until 4.3 passes.
