# Spersonalizowana checklista plecaka (S-06) — Plan Brief

> Full plan: `context/changes/personalized-backpack/plan.md`

## What & Why

Organizator odhacza pozycje plecaka ewakuacyjnego na 72 h dobranego do składu rodziny (FR-003, must-have). To wyróżnik wobec mObywatela: ta sama oficjalna treść, ale z ilościami i pozycjami dla tej konkretnej rodziny (dzieci, zwierzęta, leki, potrzeby własne). Odblokowuje krok „plecak” w onboardingu (S-07) i lukę „niespakowany plecak” na ekranie gotowości (S-08).

## Starting Point

S-05 zapisuje w planie (`schemaVersion: 3`) domowników z kategorią (dorosły / dziecko / zwierzę) i potrzebami o stałych `kind` przygotowanych pod reguły plecaka. Treści plecaka w repo nie ma; krok „Zabierz plecak” w alarmie jest statyczny. Wzorzec podstrony + karty-linku istnieje (`/domownicy`, `HouseholdLinkCard`).

## Desired End State

Strona `/plecak` z checklistą w grupach (Dla wszystkich, Dzieci, Zwierzęta, Potrzeby zdrowotne), ilościami liczonymi dla rodziny („Woda pitna — 36 l · 4 os. × 3 l × 3 doby”) i imionami przy pozycjach z potrzeb. Odhaczenia przeżywają zamknięcie aplikacji i tryb samolotowy; gdy rodzina rośnie, pozycja wraca jako „Ilość wzrosła”. Strona główna pokazuje „Spakowane: X z Y”.

## Key Decisions Made

| Decision                      | Choice                                                        | Why (1 sentence)                                                                 |
| ----------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Źródło treści                 | Skrót Poradnika bezpieczeństwa / KW PSP (~18 pozycji bazowych) | Autorytet źródła, zgodne z PRD „personalizujemy, nie duplikujemy”.               |
| Reguły dopasowania            | Kategorie (dzieci, zwierzęta) + 5 potrzeb z listy             | Wykorzystuje stałe `kind` z S-05; leki z FR-003 wpływają na listę.               |
| Ilości                        | Dla kluczowych pozycji, 72 h, woda 3 l/os./dobę               | Konkret dla rodziny zamiast ogólnej listy.                                       |
| Liczba osób                   | 1 (organizator) + dorośli + dzieci                            | `/domownicy` zbiera osoby ewakuujące się „razem z Tobą”, bez organizatora.       |
| Potrzeby wpisane ręcznie      | Pozycja „Zabierz: …” per osoba i potrzeba                     | Nic, co organizator wpisał, nie ginie z plecaka.                                 |
| Zapis odhaczeń                | W planie, `schemaVersion` 3 → 4, pole `packedItems`           | Dane przygotowań w jednym obiekcie dla S-08 i S-09.                              |
| Zmiana ilości                 | Odhaczenie pamięta ilość; gdy wymagana rośnie → „Ilość wzrosła” | Lista nie kłamie o gotowości; ten sam mechanizm dla osób z potrzebą.           |
| Znikające pozycje             | Odhaczenia czyszczone przy zapisie                            | Brak „duchów” w danych i w udostępnianym planie.                                 |
| Miejsce w aplikacji           | `/plecak` + karta-link na stronie głównej                     | Wzór `/domownicy`; komponent gotowy do osadzenia w onboardingu.                  |
| Krok alarmu                   | Bez zmian                                                     | Plecak to przygotowanie; w kryzysie minimum decyzji.                             |
| Pozycje dopisywane ręcznie    | Nie w S-06                                                    | Mniejszy zakres; potrzeby własne już pokrywają najczęstszy przypadek.            |

## Scope

**In scope:** typ `PackedItem` i schemat v4 z migracją v1–v3, `src/lib/backpack.ts` (treść, reguły, ilości, stan, podsumowanie) z testami, wyspa `BackpackChecklist`, strona `/plecak`, karta `BackpackLinkCard`, smoke.

**Out of scope:** zmiana kroku i głosu w alarmie, własne pozycje, plecak per domownik, daty ważności i przypomnienia, eksport PDF, poziom gotowości i quick winy (S-08), onboarding (S-07), rozróżnianie wieku dzieci.

## Architecture / Approach

Lista jest wyliczana z `members` przez czystą funkcję `buildBackpack` (jak `buildSteps`), nigdy zapisywana. Plan przechowuje tylko odhaczenia `{ itemId, quantity }`. `itemState` porównuje zapamiętaną ilość z wymaganą (packed / unpacked / outdated), `togglePacked` zapisuje bieżącą ilość i czyści rekordy spoza listy. Wyspa `client:only="react"` zapisuje przez `readPlan()` → `writePlan`, a błąd zapisu pokazuje `STORAGE_ERROR`.

## Phases at a Glance

| Phase                                        | What it delivers                                                | Key risk                                                      |
| -------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------- |
| 1. Model danych, migracja i reguły plecaka   | Schemat v4, treść i reguły, stan odhaczeń, testy Vitest         | Utrata danych przy migracji v3 → v4; jakość treści            |
| 2. Ekran `/plecak` i karta na stronie głównej | Checklista w grupach, stan „Ilość wzrosła”, karta z postępem, smoke | Brak wzorca checklisty w `JEZYK_WIZUALNY.md`; dostępność wiersza |

**Prerequisites:** S-05 na `main` (jest, `9d1d93d`).
**Estimated effort:** ~1–2 sesje, 2 fazy.

## Open Risks & Assumptions

- Oficjalne źródła zalecają osobny plecak dla każdego domownika; MVP trzyma jedną listę gospodarstwa z ilościami — 36 l wody dla czterech osób nie mieści się w jednym plecaku, co może wymagać korekty kopii („podzielcie między plecaki”).
- Treść i normy (3 l/os./dobę, 7 dni leków, 1 l/dobę dla zwierzęcia) są pisane w kodzie na podstawie gov.pl / RCB; do ręcznej weryfikacji w fazie 1.
- Pozycje dziecięce są warunkowe („jeśli potrzebne”), bo S-05 nie zbiera wieku dzieci.
- Wzorzec wiersza checklisty powstaje w tej zmianie; jeśli się sprawdzi, warto dopisać go do `JEZYK_WIZUALNY.md` osobną decyzją.

## Success Criteria (Summary)

- Organizator widzi listę dopasowaną do swojej rodziny, z ilościami i imionami, i odhacza ją także offline.
- Gdy rodzina rośnie, lista sama pokazuje, czego teraz brakuje.
- Istniejący plan otwiera się bez straty danych; lint, `astro check`, testy, build i smoke przechodzą w CI.
