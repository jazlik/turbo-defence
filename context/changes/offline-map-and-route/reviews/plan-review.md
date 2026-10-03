<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Mapa i trasa offline jako drugi poziom prowadzenia (S-04)

- **Plan**: context/changes/offline-map-and-route/plan.md
- **Mode**: Deep (weryfikacja kodu w sesji głównej, bez subagenta)
- **Date**: 2026-10-03
- **Verdict**: REVISE → SOUND po triage (wszystkie ustalenia naniesione)
- **Findings**: 0 critical, 4 warnings, 4 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | WARNING → PASS |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | WARNING → PASS |
| Plan Completeness | WARNING → PASS |

## Grounding

13/13 paths ✓, 4/4 symbols ✓ (`parsePlan`, `globPatterns`, `saveLastKnownPosition`, `Flavor.regular`), brief↔plan ✓, progress↔phases ✓. Dwa odnośniki do linii poprawione (`GuidanceScreen.tsx:92-110`, `plan-storage.ts:43-53`). `evacuationPoint` czytają tylko `GuidanceScreen` i `EvacuationPointCard`.

## Findings

### F1 — Ostatni odcinek: trasa kończy się na drodze, a schron leży obok

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: End-State Alignment
- **Location**: Phase 2 §3–§4
- **Detail**: OSRM dociąga cel do najbliższej drogi; punkty PSP leżą często 20–60 m od niej. Odległość „trasą” spadała do 0 m bez spełnienia warunku dojścia (< 25 m do celu).
- **Fix**: Pozostała odległość = reszta trasy + odległość koniec trasy → cel; przy reszcie ≤ 40 m strzałka wskazuje cel. Test jednostkowy.
- **Decision**: FIXED — `endGapMeters` w `prepareRoute`, reguła ostatniego odcinka w `deriveGuidance`, testy.

### F2 — Brak kontraktu wyniku useGuidance

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Phase 2 §4, Phase 5 §2
- **Detail**: Mapa i GuidanceScreen potrzebują m.in. surowego heading, pozycji, `isStale`, odległości w linii prostej i `locationProblem`.
- **Fix**: Dopisać typ `UseGuidanceResult`.
- **Decision**: FIXED

### F3 — Diagnostyka na /czujniki obiecana bez fazy

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: Critical Implementation Details → Debug; Phase 3–4
- **Detail**: Kryteria 3.6 i 4.6 korzystają z /czujniki, ale `SensorCheck.tsx` nie był w żadnych zmianach.
- **Fix**: Dodać sekcje „Trasa” (Phase 3 §6) i „Mapa offline” (Phase 4 §4).
- **Decision**: FIXED

### F4 — Time-box spike'a i uprawnienia Cloudflare

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 1, plan-brief Prerequisites
- **Detail**: Zakres spike'a to realnie pół dnia; zmiana CORS, upload i deploy preview wymagają konta z uprawnieniami R2 i Workers.
- **Fix**: Phase 1 = 1A przy biurku (~2 h) + 1B telefony (~2 h); prerequisite `wrangler login`; CORS przez `wrangler r2 bucket cors set … --file scripts/map/r2-cors.json`.
- **Decision**: FIXED

### F5 — Spacje w nazwach katalogów fontów

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 1 §4, Phase 5 §1, §4
- **Detail**: Ryzyko rozjazdu kodowania `%20` między URL-em glifu z MapLibre a wpisem w precache.
- **Fix**: Nazwy fontów bez spacji przez `Flavor.regular/bold/italic`.
- **Decision**: FIXED

### F6 — Cel A przeskakuje między odświeżeniami

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 3 §2
- **Detail**: Przy dwóch podobnie odległych schronach wahania czasów z routingu zmieniają adres w planie.
- **Fix**: A zostaje, dopóki nowy nie jest szybszy o ≥ 10% i ≥ 60 s albo A nie wypadł z listy.
- **Decision**: FIXED — decyzja produktowa zespołu (odstępstwo od „tylko czas dojścia” zaakceptowane).

### F7 — Poligon dla jednego regionu

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Lean Execution
- **Location**: Phase 4 §1
- **Detail**: Poligon i `@turf/boolean-point-in-polygon` przy jednym regionie MVP.
- **Fix**: Sprawdzanie `bounds`; poligon przy drugim regionie.
- **Decision**: FIXED

### F8 — Odświeżanie bez Permissions API

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Blind Spots
- **Location**: Phase 3 §4
- **Detail**: Na iOS < 16 nie da się sprawdzić stanu zgody na lokalizację.
- **Fix**: Bez Permissions API decyduje `routingConsent`.
- **Decision**: FIXED
