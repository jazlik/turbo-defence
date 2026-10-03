# Prowadzenie do punktu offline (S-01) — brief planu

> Pełny plan: `context/changes/guided-to-point-offline/plan.md`

## What & Why

Organizator zapisuje punkt ewakuacji na urządzeniu, a w kryzysie — bez sieci — przytrzymuje przycisk alarmu i idzie za dużą bursztynową strzałką z odległością do punktu. To gwiazda przewodnia roadmapy (`S-01`): najmniejszy przepływ, którego działanie dowodzi, że produkt ma sens, i jedyna rzecz, którą główne kryterium sukcesu wymaga pokazać na scenie w trybie samolotowym. Idzie pierwsza, bo niesie najwyższe ryzyko techniczne całego demo.

## Starting Point

Po `F-01` aplikacja jest statyczną PWA, która otwiera się offline i wdraża się z `main` — i na tym się kończy. Strona domowa to wciąż marketingowa strona ze startera z gradientem `bg-cosmic`, `global.css` ma nietkniętą paletę shadcn, nie istnieje żadna warstwa zapisu danych ani jeden island React, nie ma frameworka testów. Cała logika, oba realne ekrany produktu i obsługa czujników powstają tutaj od zera.

## Desired End State

Na telefonie, po jednym otwarciu online: organizator zapisuje punkt („Ustaw tutaj" z GPS albo wpisane współrzędne), na osobnym ekranie sprawdza, że GPS i kompas działają, włącza tryb samolotowy i przytrzymuje alarm przez 2 s. Na `/alarm` natychmiast widzi cel i instrukcję, strzałkę z odległością w linii prostej, a poniżej 25 m — ekran „Jesteś na miejscu". Plan przeżywa zamknięcie aplikacji i brak sieci.

## Key Decisions Made

| Decyzja | Wybór | Dlaczego |
| --- | --- | --- |
| Wskazanie punktu | Ręcznie: „Ustaw tutaj" z GPS + wpis współrzędnych | FR-004 mówi wprost o ręcznym wyborze, a mapa do klikania przychodzi dopiero w S-04 |
| Automatyczny wybór schronu | Odłożone do nowego slice'u `S-10` po S-04 | Non-Goal w PRD, brak potwierdzonego API danych PSP, konflikt z twardym NFR prywatności |
| Zapis planu | localStorage, jeden klucz JSON z `schemaVersion` | Odczyt synchroniczny to mechanizm spełnienia NFR „pierwszy krok < 2 s"; zero zależności; łatwo wyeksportować w S-09 |
| Źródło kierunku | Kompas urządzenia, fallback na azymut z kolejnych pozycji GPS | Działa i gdy użytkownik stoi (kompas), i gdy idzie (ruch) — pokrywa oba warunki scenowe |
| Przycisk alarmu | Przytrzymanie 2 s z pierścieniem postępu | Spełnia FR-012 jednym gestem, bez drugiego ekranu i bez zjadania budżetu 2 s |
| Miejsce Execution Mode | Osobna strona `/alarm` | Rozdział trybów wymagany przez `JEZYK_WIZUALNY.md` §5, własny mały bundle, miejsce do rozbudowy w S-02/S-03 |
| Odległość i dojście | Linia prosta (haversine), próg dojścia 25 m | Trasa to S-04; 25 m mieści typowy błąd GPS (5–20 m) i daje scenariuszowi zakończenie |
| Zgody na czujniki | Osobny ekran „Sprawdź czujniki" w przygotowaniach | iOS wymaga żądania zgody na kompas z gestu; przyznana zanim zacznie się liczyć czas |
| Okno bez fixu GPS | Strzałka z ostatniej znanej pozycji, podpis „dane z HH:MM", podmiana po fixie | Zimny fix to 10–30 s; pozycję zapisujemy wcześniej, gdy jest sieć i jest fix |
| Warstwa tokenów | Bez globalnych tokenów; wartości §6 lokalnie w dwóch nowych ekranach | Decyzja zespołu: pełna warstwa tokenów to osobne zadanie po demie |
| Testy | Vitest wyłącznie dla funkcji geo (2–3 testy) | Pomyłka stopnie/radiany lub znak nie widać na ekranie, tylko w terenie; ~20 min pracy |
| Plan B na scenę | Brak trybu demo z symulowaną pozycją | Decyzja zespołu: demo na zewnątrz na realnych czujnikach, ryzyko przyjęte świadomie |

## Scope

**In scope:**

- Typy planu, zapis w localStorage z wersjonowaniem schematu, funkcje haversine i azymutu + vitest i krok w CI
- Przebudowa strony domowej (Preparation Mode, bez startera), karta punktu ewakuacji, ekran `/czujniki`
- Przycisk alarmu z przytrzymaniem, strona `/alarm` ze strzałką, odległością i czterema stanami
- Rozszerzenie `scripts/smoke.mjs` o nowe strony i ich obecność w precache
- Wpis `S-10` do roadmapy, odnotowanie decyzji w PRD, aktualizacja `CLAUDE.md`

**Out of scope:** automatyczny wybór schronu i trasa odświeżana w tle (`S-10`), mapa i routing offline (S-04), sekwencja kroków i wyjście „niedostępne" (S-02), voice guidance (S-03), domownicy i plecak (S-05/S-06), onboarding (S-07), ekran gotowości (S-08), udostępnianie planu (S-09), globalna warstwa tokenów, tryb demo z symulowaną pozycją, wibracje, testy komponentów.

## Architecture / Approach

Od środka na zewnątrz: czysta logika z testami (`src/types.ts`, `src/lib/services/plan-storage.ts`, `src/lib/geo.ts`), potem ekrany przygotowań, które ją zapełniają danymi, na końcu ekran prowadzenia, który ją konsumuje. Trzy statyczne strony Astro z wyspami React tylko tam, gdzie jest interakcja: `/` (karta punktu + przycisk alarmu), `/czujniki` (sprawdzenie czujników), `/alarm` (prowadzenie). Każda wyspa czytająca localStorage montowana jako `client:only="react"`, żeby statyczny HTML z builda nie powodował rozjazdu hydratacji. Czujniki za dwoma hookami (`useGeolocation`, `useHeading`), service worker z `F-01` precache'uje nowe strony bez zmian w konfiguracji.

## Phases at a Glance

| Faza | Co dowozi | Główne ryzyko |
| --- | --- | --- |
| 1. Fundament: dane i geo | Typy, zapis planu, haversine i azymut, vitest w CI | Reguły ESLint z type-checkiem mogą wymagać objęcia pliku testowego `tsconfig` |
| 2. Przygotowanie: punkt i czujniki | Strona domowa bez startera, zapis punktu, ekran `/czujniki` | Przebudowa `/` może zepsuć kontrakt `data-offline-status` w smoke teście |
| 3. Prowadzenie: alarm i `/alarm` | Przytrzymanie 2 s, strzałka, odległość, cztery stany | Różnice API kompasu iOS vs Android; próg 2 s trzeba zmierzyć, nie założyć |
| 4. Weryfikacja i dokumenty | Test w trybie samolotowym, wdrożenie, wpis `S-10` i PRD | Brak — faza porządkowa (~30 min) |

**Prerequisites:** `F-01` (done, wdrożone pod `https://w-razie-w.jzogala.workers.dev`); telefon z Androidem lub iOS do testów w terenie; sekrety Cloudflare już w repozytorium.
**Estimated effort:** ~1 sesja, 4 fazy; fazy 2 i 3 wymagają wyjścia na zewnątrz z telefonem.

## Open Risks & Assumptions

- **Kompas może zawieść w budynku** (rozkalibrowanie przy metalu i głośnikach) — to ryzyko nr 1 wpisane w roadmapę dla `S-01`. Zespół odrzucił tryb demo z symulowaną pozycją, więc jedyną mitygacją jest fallback na azymut z ruchu i prezentacja na zewnątrz.
- **Pierwsza strzałka może wskazać w złą stronę**, jeśli użytkownik przemieścił się od ostatniego zapisu pozycji. Mitygacja: podpis „dane z HH:MM", przygaszona strzałka i natychmiastowa podmiana po pierwszym fixie.
- **Próg NFR 2 s jest założeniem do zmierzenia**, nie faktem. Jeśli pełne przeładowanie dokumentu przy przejściu na `/alarm` go nie zmieści, alternatywą jest przełączenie stanu w tej samej stronie — wtedy wraca decyzja „miejsce Execution Mode".
- **Linia prosta zaniża realne dojście w mieście.** W UI podpisana jako „w linii prostej"; prawdziwa trasa przychodzi w S-04.
- **Odstępstwo od Non-Goals wymaga wpisu w PRD** (faza 4). Dopóki go nie ma, dokumenty i plan mówią różne rzeczy o automatycznym wyborze schronu.

## Success Criteria (Summary)

- Telefon w trybie samolotowym: przytrzymanie alarmu prowadzi do punktu dużą strzałką z odległością, a pierwszy krok jest na ekranie w mniej niż 2 s.
- Zapisany punkt przeżywa zamknięcie aplikacji i brak sieci; nic nie wychodzi z urządzenia.
- Dojście poniżej 25 m domyka scenariusz ekranem „Jesteś na miejscu".
