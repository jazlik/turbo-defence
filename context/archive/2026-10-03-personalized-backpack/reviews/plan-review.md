<!-- PLAN-REVIEW-REPORT -->

# Plan Review: Spersonalizowana checklista plecaka (S-06)

- **Plan**: context/changes/personalized-backpack/plan.md
- **Mode**: Deep (run after implementation, against the implemented code)
- **Date**: 2026-10-04
- **Verdict**: REVISE → SOUND after fixes
- **Findings**: 0 critical, 3 warnings, 2 observations

## Verdicts

| Dimension             | Verdict |
| --------------------- | ------- |
| End-State Alignment   | WARNING |
| Lean Execution        | PASS    |
| Architectural Fitness | PASS    |
| Blind Spots           | WARNING |
| Plan Completeness     | WARNING |

## Grounding

6/6 paths ✓, 5/5 symbols ✓, brief↔plan ✓, Progress↔Phase ✓

## Findings

### F1 — A tick on an unreadable plan overwrites it with an empty one

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 2 §1 (save contract), Migration Notes
- **Detail**: `writePlan({ ...readPlan(), packedItems })` on a plan read as `unreadable` (future version, rollback) writes `createEmptyPlan()` over places, members and contacts. Migration Notes claimed the data survives; that holds only for automatic writes (`saveLastKnownPosition`). No component in `src/components` checks `unreadable`.
- **Fix A ⭐ Recommended**: guard in `BackpackChecklist` via `readPlanResult()` + correct Migration Notes
  - Strength: mirrors `saveLastKnownPosition`; small, local.
  - Tradeoff: other islands keep the gap.
  - Confidence: HIGH — `source` already exists in plan-storage.
  - Blind spot: copy for the refusal message.
- **Fix B**: guard inside `writePlan` for all islands (separate change + lesson)
  - Strength: closes the class of problem.
  - Tradeoff: beyond S-06 scope; changes an API contract with 4+ callers.
  - Confidence: MED.
  - Blind spot: interaction with save-error UX.
- **Decision**: FIXED (Fix A) — plan updated (Phase 2 §1, Migration Notes); code landed and verified (headless, build)

### F2 — Re-adding (or swapping) a child restores old ticks

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: End-State Alignment
- **Location**: Critical Implementation Details vs manual criterion 2.9
- **Detail**: Child, pet and `need-*` item ids are group-level and pruning ran only on a tick. Removing one child and adding another restored "Dokumenty dziecka ✓" for a child whose documents were never packed.
- **Fix A ⭐ Recommended**: prune ticks also when members are saved (`HouseholdMembersCard.persist`)
  - Strength: user-initiated write, fits the plan's rule; one line.
  - Tradeoff: `/domownicy` imports `lib/backpack`; an in-place edit of a child is still not detected.
  - Confidence: HIGH — pure, tested functions.
  - Blind spot: per-person identity of items.
- **Fix B**: reword 2.9 and accept the current behavior
  - Strength: zero code.
  - Tradeoff: overstates readiness; S-08 would count it.
  - Confidence: HIGH.
  - Blind spot: S-08 scoring.
- **Decision**: FIXED (Fix A) — plan updated (Critical Implementation Details, Phase 2 §5); code landed and verified (headless, build)

### F3 — MAX_PACKED_ITEMS "np. 100" is smaller than the possible list

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1 §2
- **Detail**: Up to 234 items (18 + 6 + 5 + 5 + 20 × 10); a limit of 100 would drop ticks. Code already derives 234.
- **Fix**: Contract states the derived limit.
- **Decision**: FIXED

### F4 — Quantity copy: declension and need rows

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 1 §3, Phase 2 §1
- **Detail**: A fixed `unit` yields "wcześniej 3 porcji"; need rows showed "1 os. · 1 os. z tą potrzebą". Code added `formatAmount()` and hides the quantity line for needs.
- **Fix**: Both added to the contracts.
- **Decision**: FIXED

### F5 — Water decision (home reserve) not recorded in the plan

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Key Discoveries
- **Detail**: 9 l/person stays as a home reserve with "take what you can carry" copy; KW PSP says ~4 l per backpack; no items added beyond the official list. Decision lived only in code and chat.
- **Fix**: One line in Key Discoveries.
- **Decision**: FIXED
