<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Domownicy i kontakty awaryjne (S-05)

- **Plan**: context/changes/household-members/plan.md
- **Scope**: Full plan (Phases 1–3)
- **Date**: 2026-10-03
- **Verdict**: APPROVED
- **Findings**: 0 critical, 2 warnings, 4 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

Automated checks re-run during the review: `npm test` (93 passed), `npm run lint`, `astro check` (0 errors), `npm run build`, `npm run smoke` on preview — all pass. Manual rows 2.8, 2.9, 3.7 (airplane mode, `tel:` link, Contact Picker) remain open by design: they need a phone and a deployed build.

## Findings

### F1 — vCard import renders every contact from a large export

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/components/EmergencyContactsCard.tsx (selection list, `mode === "select"`)
- **Detail**: A `.vcf` exported from "all contacts" can hold hundreds of cards. `offerCandidates` puts all valid ones in the list, but at most 20 minus the existing contacts can be selected, so the user scrolls through hundreds of rows to find 1–2 people, and disabled checkboxes pile up.
- **Fix**: Add a text filter above the list (name or digits) and render only the first 50 matches with a "refine the search" note.
  - Strength: Keeps the single selection path shared by Contact Picker and vCard; no new dependency.
  - Tradeoff: One more input and a little state in the card.
  - Confidence: MED — behavior with real exports is unverified (no large vCard tested).
  - Blind spot: Real Android/iOS exports were not tried.
- **Decision**: PENDING

### F2 — Plan blocks for Phases 1 and 2 describe the superseded model

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: context/changes/household-members/plan.md (Phase 1 §1/§3, Phase 2 §1)
- **Detail**: Phases 1 and 2 still specify `takesMedication`, the checkbox and the category/medication form. Phase 3 documents the replacement, but nothing in Phases 1–2 says so, so a later reader (or S-06) can take the old contract as current. Code is correct and matches Phase 3.
- **Fix**: Add one line under Phase 1 and Phase 2 "Overview": "Superseded in part by Phase 3 (needs list replaces `takesMedication`)."
- **Decision**: PENDING

### F3 — `toggleNeed` is dead code after the UI simplification

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/lib/household.ts:42
- **Detail**: The preset buttons were removed, so `toggleNeed` is only used by its own tests. `hasNeed` is still used by `addCustomNeed`.
- **Fix**: Remove `toggleNeed` and its two test cases; keep `hasNeed`.
- **Decision**: PENDING

### F4 — vCard 2.1 quoted-printable names come out garbled

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/vcard.ts (`parseVCard`)
- **Detail**: Old exports with `ENCODING=QUOTED-PRINTABLE` (e.g. `FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:=C5=81ukasz`) show raw `=C5=81ukasz`. Modern Android and iOS export 3.0/4.0 UTF-8, so impact is small.
- **Fix**: Decode quoted-printable UTF-8 when the property parameters contain `ENCODING=QUOTED-PRINTABLE`, with a test.
- **Decision**: PENDING

### F5 — Home card count can be stale after browser back navigation

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/components/HouseholdLinkCard.tsx
- **Detail**: The summary is read once on mount. If the browser restores `/` from the back-forward cache after edits on `/domownicy`, the old counts show until reload. Manual check 2.10 passed via normal navigation.
- **Fix**: Re-read the plan on the `pageshow` event when `event.persisted` is true.
- **Decision**: PENDING

### F6 — Three manual checks need a phone and a deployed build

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: plan.md Progress 2.8, 2.9, 3.7
- **Detail**: Airplane-mode load of `/domownicy`, the `tel:` link and Contact Picker on Chrome/Android cannot be checked locally. Archiving (`/10x-archive`) will warn about them.
- **Fix**: Merge, let CI deploy, then run the three checks on the phone against https://w-razie-w.jzogala.workers.dev and tick the rows.
- **Decision**: PENDING
