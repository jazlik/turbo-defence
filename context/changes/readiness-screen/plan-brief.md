# Ekran gotowości jako strona główna (S-08) — Plan Brief

> Full plan: `context/changes/readiness-screen/plan.md`

## What & Why

Strona główna przestaje być stosem siedmiu kart z własnymi przyciskami i staje się ekranem gotowości: poziom, jeden quick win jako „następny krok”, pasek obszarów i alarm przyklejony na dole. Dzięki temu użytkownik zawsze wie, co zrobić teraz, żeby spokojnie się przygotować, a w kryzysie ma alarm w stałym miejscu. Ekran zastępuje onboarding (S-07 usunięte z roadmapy): pierwsze uruchomienie to stan początkowy tego samego ekranu.

## Starting Point

Wszystkie dane do gotowości już istnieją w `wrw.plan`, `wrw.navigation` i `wrw.map`, a strona główna (`HomeScreen.astro`) wyświetla je jako osobne karty. Brakuje wspólnej logiki „co dalej”, stron `/miejsca` i `/offline` oraz śladu, że czujniki sprawdzono. Podstrony mają skopiowany link powrotu.

## Desired End State

Użytkownik widzi poziom (Zaczynamy → Podstawy → Gotowi do wyjścia → 72H Ready), jeden główny przycisk z kolejnym krokiem, pięć obszarów ze statusem (każdy wchodzi do konfiguratora) i alarm z przytrzymaniem 2 s zawsze na dole. Po zmianie planu poziom może spaść, a quick win wraca. Strona `/droga` pokazuje pełną ścieżkę w etapach.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Rola Preparation Mode | Preparation = ekran gotowości, alarm przyklejony na dole | Jeden stały punkt wejścia w kryzys i jeden w przygotowaniu | Plan (rozmowa) |
| Onboarding | Usunięty, zastąpiony stanem początkowym ekranu | Quick winy prowadzą tak samo od pierwszego uruchomienia i dalej | Plan (rozmowa) |
| Domownicy | Kontakt LUB domownik zamyka krok | Bez zmiany schematu planu i bez przycisku „pomiń” | Plan |
| Poziomy | 4 poziomy, stan bieżący (może spaść) | Odróżnia poziom od kamienia milowego (OQ 1 z PRD) | Plan |
| Kolejność | Cel → rodzina → plecak → offline | Alarm dostaje cel najwcześniej, a plecak nie dezaktualizuje się po dodaniu dziecka | Plan |
| Plecak | Dwa etapy: kluczowe (woda, jedzenie, dokumenty, apteczka, potrzeby, karma), potem komplet | Szybki poziom „Gotowi do wyjścia”, pełny dopiero na „72H Ready” | Plan |
| Poza regionem mapy | Status się cofa, quick win wraca, baner w aplikacji; bez regionu `unavailable` | Zgodne z oczekiwaniem użytkownika, uczciwe przy jednej paczce | Plan |
| Podstrony | `/miejsca`, `/offline`, istniejące zostają, wspólne „← Gotowość” | Nazwy zgodne z myśleniem użytkownika, bez „mapy” w tytule | Plan |
| Strona główna | Poziom + jeden quick win + pasek obszarów; pełna lista na `/droga` | Prostota (§3 pkt 7 JV) i pełny obraz osobno | Plan |
| Czujniki | Nowy klucz `wrw.sensors` | Jedyny stan, którego nie da się wyliczyć z istniejących danych | Plan |

## Scope

**In scope:** katalog quick winów i `computeReadiness`, pozycje kluczowe plecaka, reguły regionu i aktualności trasy, `wrw.sensors`, podstrony `/miejsca` i `/offline`, wspólny powrót, ekran gotowości z dokiem alarmu, `/droga`, aktualizacja dokumentów.

**Out of scope:** powiadomienia push, nowe regiony map, własny przycisk instalacji, ilustracje, punkty i streaki, zmiany w alarmie i prowadzeniu, testy komponentów, udostępnianie planu (S-09).

## Architecture / Approach

Jedno źródło prawdy: katalog quick winów w `src/lib/readiness.ts`. Z niego wynikają CTA, poziom, status obszarów i lista na `/droga`. Hook `useReadiness` czyta `localStorage` (plan, trasa, mapa, czujniki) i odświeża się po powrocie na stronę; wyspy pozostają cienkie. Alarm używa istniejącego `useHoldAction` w wariancie zwartym.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Logika gotowości | Katalog, poziomy, `computeReadiness`, klucze kluczowe plecaka, pokrycie regionu, `wrw.sensors` | Reguły poziomów i regionu muszą być jednoznaczne i przetestowane |
| 2. Podstrony i nawigacja | `/miejsca`, `/offline`, wspólne „← Gotowość”, smoke | Przeniesienie formularzy bez zmiany zachowania zapisu |
| 3. Ekran gotowości | Nowa strona główna, pasek obszarów, baner, dock alarmu | Dock nie może zasłaniać treści ani zmieniać czasu przytrzymania |
| 4. Ścieżka `/droga` i dokumenty | Pełna lista quick winów w etapach, PRD, roadmapa, CLAUDE.md | Dwa widoki tej samej treści muszą się zgadzać (jedno źródło) |

**Prerequisites:** S-06 (done); S-04 wchodzi do reguły mapy po dowiezieniu.
**Estimated effort:** ~4 sesje, po jednej na fazę.

## Open Risks & Assumptions

- Lista pozycji kluczowych plecaka to decyzja produktowa spoza PRD; do potwierdzenia w poradniku GOV.
- Dziś jest jedna paczka mapy (Małopolska), więc „poza regionem” to w praktyce `unavailable`, a nie prośba o pobranie.
- Brak serwera uniemożliwia prawdziwe powiadomienia: „alert” to baner na ekranie gotowości.
- Poziom 72H Ready bez Małopolski oznacza mniej niż w Małopolsce (krok mapy pominięty).

## Success Criteria (Summary)

- Użytkownik zawsze widzi jeden następny krok i poziom, a alarm jest na dole ekranu.
- Po zmianie planu (nowe dziecko, pozycja daleko od trasy lub mapy) poziom się cofa, a quick win wraca.
- Wszystko działa offline, a `npm test`, lint, typy, build i smoke przechodzą.
