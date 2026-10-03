# Domownicy i kontakty awaryjne (S-05) — Plan Brief

> Full plan: `context/changes/household-members/plan.md`

## What & Why

Organizator dodaje do planu domowników (z potrzebami: dzieci, leki, zwierzęta) i kontakty awaryjne; dane zostają na urządzeniu. To FR-002 (must-have) i warunek dla S-06 (plecak dopasowany do składu rodziny), S-07 (onboarding) i S-09 (udostępnianie).

## Starting Point

`HouseholdPlan` (schemaVersion 1, `localStorage` pod `wrw.plan`) trzyma tylko punkt ewakuacji i ostatnią pozycję. Wzorzec wyspy z formularzem i zapisem istnieje w `EvacuationPointCard`, wzorzec podstrony w `/czujniki`.

## Desired End State

Strona `/domownicy` z dwiema listami (domownicy, kontakty): dodaj, edytuj, usuń, z walidacją po polsku. Strona główna ma kartę-link z podsumowaniem. Wszystko działa w trybie samolotowym, a istniejące plany v1 otwierają się bez utraty punktu ewakuacji.

## Key Decisions Made

| Decision           | Choice                                                   | Why (1 sentence)                                                             |
| ------------------ | -------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Model domownika    | imię + kategoria + lista potrzeb (propozycje + własne)   | Propozycje mają stałe kind dla reguł plecaka w S-06, własne wpisy (np. insulina) niosą tekst; zmiana po przeglądzie fazy 2. |
| Model kontaktu     | imię + telefon + relacja (opcjonalna); dodawanie: z kontaktów telefonu (gdzie działa), z pliku vCard lub ręcznie | Przepisywanie numerów jest uciążliwe; vCard działa także na iOS. |
| Miejsce w aplikacji | osobna strona `/domownicy` + karta-link na stronie głównej | Strona główna zostaje krótka, komponenty nadają się do kroku onboardingu.    |
| Operacje           | dodaj, edytuj, usuń (usuń bez okna potwierdzenia)        | Edycja potrzebna pod FR-011 w S-09; rekordy łatwo dodać ponownie.            |
| Schemat            | `schemaVersion` 1→2 z migracją w `parsePlan`             | Bez gałęzi dla v1 plan z S-01 zostałby skasowany.                            |
| Logika             | czyste funkcje w `src/lib/household.ts` + Vitest         | Zgodnie z regułą repo; wyspy zostają cienkie, S-06/S-07/S-09 mogą ją użyć.   |
| Limit              | 20 domowników i 20 kontaktów                             | Chroni UI i `localStorage` bez dodatkowej złożoności.                        |

## Scope

**In scope:** typy i migracja planu, import kontaktów (Contact Picker, vCard), walidacja, operacje na listach, strona `/domownicy`, karta na stronie głównej, rozszerzenie smoke.

**Out of scope:** checklista plecaka (S-06), role (FR-005), opisy potrzeb poza etykietami (dawki, nazwy leków), adresy, dzwonienie z `/alarm`, przekazywanie planu (S-09), onboarding (S-07).

## Architecture / Approach

Dwie wyspy React (`HouseholdMembersCard`, `EmergencyContactsCard`, `client:only="react"`) czytają i zapisują `members` / `contacts` w planie wzorcem „odczytaj świeże, zmień pole, zapisz”. Walidacja i operacje na listach to czyste funkcje w `src/lib/household.ts`; parsowanie i migracja w `plan-storage.ts`. Karta-link na stronie głównej czyta podsumowanie z planu.

## Phases at a Glance

| Phase                            | What it delivers                                          | Key risk                                           |
| -------------------------------- | --------------------------------------------------------- | -------------------------------------------------- |
| 1. Model danych i logika         | Typy, schema v2 z migracją z v1, walidacja, operacje, testy | Utrata punktu ewakuacji przy migracji              |
| 2. Ekran `/domownicy` i karta    | Strona z listami i formularzami, karta-link, smoke        | Dostępność formularza (fokus, błędy) na telefonie  |
| 3. Potrzeby i import kontaktów   | Lista potrzeb zamiast flagi leków; Contact Picker i vCard | Contact Picker tylko na Chrome/Android             |

**Prerequisites:** S-01 zamknięte (jest). **Estimated effort:** ~2 sesje, 2 fazy.

## Open Risks & Assumptions

- Walidacja telefonu (7–15 cyfr, dozwolone `+ - ( )` i spacje) jest świadomie luźna; numery międzynarodowe nie są sprawdzane.
- Usuwanie bez potwierdzenia może być uciążliwe przy przypadkowym dotknięciu; do oceny przy teście na telefonie.
- Zmiana kształtu planu dotyka `/alarm` tylko przez `readPlan`; regresja sprawdzana ręcznie (brak testów komponentów w repo).

## Success Criteria (Summary)

- Organizator dodaje, poprawia i usuwa domowników i kontakty, a dane przeżywają zamknięcie aplikacji, także w trybie samolotowym.
- Plan zapisany przed zmianą (punkt ewakuacji) działa po niej bez straty.
- Lint, `astro check`, testy, build i smoke przechodzą w CI.
