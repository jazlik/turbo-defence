# Miejsca ewakuacji — jeden cel alarmu i strona bez szumu — Plan Brief

> Full plan: `context/changes/miejsca-page-cleanup/plan.md`
> Frame brief: `context/changes/miejsca-page-cleanup/frame.md`

## What & Why

Problem z frame brief: `/miejsca` pokazuje wewnętrzny model planu (trzy równorzędne rekordy, każdy z pełnym zestawem kontrolek) zamiast jednego zadania użytkownika. Do tego jedyna dominująca metoda wskazania zakłada obecność na miejscu, której przy pierwszym ustawianiu nie ma.

W planowaniu zapadła decyzja produktowa: miejsce spotkania i zapasowe znikają z całej aplikacji. Jedynym celem alarmu jest schron.

## Starting Point

- Na `/miejsca` są trzy `PlaceCard` (spotkanie, zapasowe, punkt ewakuacji), każda z nazwą, „Ustaw tutaj” (GPS) i współrzędnymi.
- Schron PSP z trasą A/B żyje osobno na `/offline`.
- Plan `wrw.plan` v4 trzyma `places.{meeting,backup,shelter}`.
- Alarm: plecak → spotkanie (z wyjściem na zapasowe) → schron (z wyjściem na trasę B).

## Desired End State

Strona „Miejsca ewakuacji” (`/miejsca`) ma jedną dominującą akcję: „Schron i trasa” (auto PSP). Pod nią jest zwinięty „Własny schron”: podsumowanie z „Zmień”. Edytor to mapa z pinezką, którą da się ustawić z domu, z „Moja pozycja” jako skrótem i współrzędnymi jako wyjściem awaryjnym.

Alarm prowadzi plecak → schron, a „niedostępne” przełącza na trasę B. Gotowość i głos nie znają już spotkania ani zapasowego.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Problem do rozwiązania | Strona pokazuje model danych zamiast zadania; GPS wymaga obecności | Użytkownik ustawia z domu i myli pojęcia | Frame |
| Miejsce spotkania i zapasowe | Usunięte w całej aplikacji, w jednej zmianie | Decyzja właściciela produktu; koszt zapisany w PRD | Plan |
| Podstawa strony | Auto PSP + własny schron awaryjnie | Zgodne z S-04, trasa A/B bez zmian | Plan |
| Metoda wskazania | Mapa z pinezką (R2 przez Range online, OPFS offline) | Działa z domu, ponownie używa MapLibre/PMTiles, bez nowej usługi | Plan |
| GPS i współrzędne | „Moja pozycja” centruje mapę; współrzędne zwinięte, same się rozwijają, gdy mapy brak | Jedna ścieżka, wyjście awaryjne zawsze jest | Plan |
| Stan po ustawieniu | Podsumowanie + „Zmień” | Krótka strona, jasne „zrobione” | Plan |
| Nazwa | Zapisywana razem z punktem; edycja samej nazwy w podsumowaniu | Usuwa dług F9 | Plan |
| Migracja | v5 z `shelter`; samo spotkanie/zapasowe → własny schron | Alarm nie traci celu po aktualizacji | Plan |
| Adres | `/miejsca` zostaje, tytuł „Miejsca ewakuacji” | Zero 404, nazwa zgodna z treścią | Plan |

## Scope

**In scope:**
- schemat v5 i migracja;
- `buildSteps`, `resolveStepTarget`, GuidanceScreen i teksty głosu;
- gotowość (quick winy, poziomy, obszar);
- nowa strona i `OwnShelterCard`;
- przeniesienie `RouteCard`;
- mapa z pinezką ze wspólnym modułem PMTiles;
- smoke, testy jednostkowe;
- PRD, roadmapa, PROJECT.md, CLAUDE.md.

**Out of scope:**
- trasa do własnego schronu;
- geokoder;
- ręczny wybór schronu PSP;
- nowe regiony;
- migracja `wrw.run`;
- zmiana adresu.

## Architecture / Approach

Logika czysta w `src/lib/`: `plan-storage` v5, `evacuation-steps`, `step-target`, `readiness` oraz nowy `map-source` (`local` | `remote` | `none`). UI: `miejsca.astro` składa `RouteCard` i `OwnShelterCard`. Ta druga leniwie ładuje `PlacePickerMap`. `src/components/map/pmtiles.ts` rejestruje protokół raz dla mapy wyboru i mapy wykonawczej.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Model i logika | Plan v5, alarm plecak → schron, gotowość bez spotkania | Regresja alarmu; migracja gubi cel |
| 2. Strona | „Miejsca ewakuacji” z jedną akcją główną, zwinięty własny schron | Pasek obszarów za ciasny na 360 px |
| 3. Mapa z pinezką | Wskazanie z domu, online z R2, offline z OPFS | Range/CORS z R2 na iOS; podwójna rejestracja protokołu |
| 4. Dokumenty | PRD, roadmapa, PROJECT.md, CLAUDE.md spójne z nowym modelem | Niespójny PRD |

**Prerequisites:** `main` z S-08 (`bd9c642`); bucket R2 z CORS z `scripts/map/r2-cors.json`.
**Estimated effort:** ~3 sesje w 4 fazach.

## Open Risks & Assumptions

- **Utrata punktu zbiórki.** Rodzina rozdzielona w chwili alarmu nie ma już ustalonego punktu zbiórki. Świadomy koszt, zapisany w PRD; może wrócić w innej formie po MVP.
- **Własny schron bez trasy B.** Prowadzi w linii prostej i nie ma wyjścia „niedostępne”.
- **Mapa tylko dla Małopolski.** Poza regionem edytor spada na współrzędne.
- **Zdalne PMTiles tylko z originów w CORS.** Inne porty w dev nie pokażą mapy, tylko współrzędne.
- **Rollback.** Starsze wydanie widzi v5 jako `unreadable` i pokazuje pusty plan, bez nadpisania danych.

## Success Criteria (Summary)

- Przy pierwszym wejściu na `/miejsca` jest jedna oczywista akcja, a własny schron da się ustawić z domu na mapie.
- Alarm po aktualizacji nadal ma cel; nigdzie nie ma „miejsca spotkania”.
- Testy, lint, `astro check`, build i smoke są zielone; przebieg na iOS Safari i Android Chrome jest potwierdzony z nazwą urządzenia.
