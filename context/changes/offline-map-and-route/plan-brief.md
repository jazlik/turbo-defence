# Mapa i trasa offline jako drugi poziom prowadzenia (S-04) — brief planu

> Full plan: `context/changes/offline-map-and-route/plan.md`
> Zamrożone decyzje zespołu: `context/changes/offline-map-and-route/change.md` (Notes)

## What & Why

S-01 prowadzi strzałką w linii prostej do ręcznie wskazanego punktu. S-04 dodaje to, czego wymaga US-01 i FR-007/FR-014:
- system sam wybiera najbliższy pieszo punkt schronienia PSP (A) i zapasowy (B),
- gdy jest sieć, przygotowuje do nich trasy piesze,
- w trybie samolotowym prowadzi po ostatniej zapisanej trasie,
- mapa regionu pobrana na telefon jest drugim poziomem pod strzałką.

## Starting Point

- Działający navigation core z S-01, ale inline w `GuidanceScreen.tsx:92-115`.
- Jeden ręczny `evacuationPoint` w `wrw.plan`.
- Service worker precache'uje `dist/`. Nie ma mapy, tras, OPFS ani danych o schronach.

## Desired End State

**Przygotowanie (online).** Karty „Mapa offline” (Małopolska, około 111 MB, zgoda, pobranie ze wznowieniem) oraz „Schron i trasa” (A i B z adresem, czasem dojścia i wiekiem trasy). Trasy odświeżają się, gdy aplikacja jest otwarta.

**Kryzys (tryb samolotowy).**
- `/alarm` startuje tak samo szybko jak w S-01.
- Strzałka wskazuje punkt kontrolny na trasie, odległość to pozostała długość trasy.
- Po zejściu z trasy pojawia się „Wróć na trasę”, przy dużym oddaleniu aplikacja przechodzi na kierunek wprost z S-01.
- „Mapa” otwiera mapę heading-up z trasą, celem i pozycją, bez sieci.

## Key Decisions Made

| Decyzja | Wybór | Dlaczego | Source |
| --- | --- | --- | --- |
| Basemap | Protomaps (OSM) w PMTiles, renderowany przez MapLibre GL JS | Gotowy pipeline OSM, odczyt z pliku lokalnego bez serwera | Frame + Plan (zweryfikowane) |
| Paczka | Lekka warstwowa Małopolska: drogi, ścieżki, woda i etykiety do z14; w z15 tylko budynki i adresy; landuse do z12 — **111 MB** (standard: 245 MB) | Rozmiar napędza landuse (40%) i budynki, nie POI (5%); nic z listy priorytetów nie znika | Plan (pomiar) + zespół |
| Budowa paczki | `pmtiles extract` + skrypt filtrujący kafle (`scripts/map/`) | Minuta pracy, zostaje schemat Protomaps i gotowy styl; Planetiler jest nieproporcjonalnie droższy | Plan |
| Dalsze cięcia | Spike mierzy `name:*`, atrybuty budynków, strumienie; cięcie zostaje przy oszczędności ≥ 5 MB bez utraty priorytetów | Polecenie zespołu: nie zamrażać 111 MB | Zespół |
| Hosting | R2 `turbo-defence-maps` → przeglądarka → OPFS, bez proxy | Limit Workers 25 MiB na plik; R2 gotowe | Zespół |
| CORS R2 | Dodać `http://localhost:4321` (bez `/`) i `ETag` do Expose; Range jest już dozwolony | Sprawdzone preflightem: localhost zwraca 403, brak `ETag` | Plan (pomiar) |
| Zapis mapy | OPFS przez Web Worker z `createSyncAccessHandle`; odczyt `pmtiles.FileSource` | Działa na iOS przed 26 (brak `createWritable`); bez SW i Range w Cache API | Plan |
| Routing | OSRM foot FOSSGIS (`/table` + `/route`), adapter `WalkingRouter`; Valhalla jako zapasowy w P1 | Bez klucza, CORS `*`, GET bez preflightu | Plan (zweryfikowane) |
| Dane schronów | Snapshot CSV PSP (dane.gov.pl, CC BY 4.0) w `public/data/`, precache | Źródło nie ma CORS; 6 097 punktów w Małopolsce, 157 KB gz | Plan |
| Wybór celu | Shortlist 5 najbliższych (≤ 15 km) → macierz pieszo; A = najkrótszy czas, wszystkie kategorie dostępności; A zostaje, dopóki nowy nie jest szybszy o ≥ 10% i ≥ 60 s | Decyzja zespołu: czas dojścia; lepkość, żeby adres w planie nie przeskakiwał (review F6) | Zespół |
| Trasa B | Drugi najlepszy pieszo, co najmniej 150 m od A | Realna alternatywa bez dodatkowych zapytań | Zespół |
| Ręczny punkt S-01 | Fallback, gdy nie ma punktu PSP w zasięgu | Bez regresu S-01, zgodne z „system wybiera” | Zespół |
| Zapis tras | Osobny klucz `wrw.navigation` (A, B, `active`, zgoda); geometria GeoJSON | Trasa to stan urządzenia, nie plan rodziny (S-09); bez migracji `wrw.plan` | Plan |
| Prowadzenie | `deriveGuidance` + `useGuidance`: punkt kontrolny 40 m dalej, zejście z trasy > max(35 m, 1,5 × dokładność), tryb wprost > 300 m; ostatni odcinek od końca trasy do schronu wliczony w odległość | Jeden navigation core dla strzałki i mapy; Turf zamiast własnej geometrii; OSRM dociąga cel do drogi (review F1) | Frame + Plan |
| Mapa na `/alarm` | Przycisk „Mapa” → pełny ekran, prefetch w idle | Nie opóźnia startu, nie konkuruje ze strzałką | Zespół |
| Odświeżanie | Otwarcie, powrót, `online`, co 30 min przy otwartej aplikacji, przesunięcie > 300 m | Przeglądarki nie dają tła dla zamkniętej PWA | Frame + Plan |
| Prywatność | Do routingu trafiają tylko współrzędne, za zgodą; wyjątek dopisany w NFR | PRD Open Question 3 | Frame |

## Scope

**In scope (P0):** spike gate z pomiarami; navigation core z trasą i zejściem z trasy offline; snapshot PSP, wybór A/B i trasy A/B; odświeżanie i wiek trasy; pobranie paczki do OPFS; mapa heading-up offline na `/alarm`; aktualizacja PRD, roadmapy i `CLAUDE.md`; matryca testów na Androidzie i iPhonie.

**P1:** reroute online na `/alarm`, north-up, podgląd mapy w przygotowaniu, aktualizacja paczki, router Valhalla.

**Out of scope:** przeliczanie trasy offline, routing w tle przy zamkniętej PWA (→ S-10), inne regiony, Planetiler, przycisk „niedostępne” (S-02), głos (S-03), onboarding (S-07), tryb demo z symulowaną pozycją.

## Architecture / Approach

```
PSP snapshot ─► shortlist (lokalnie) ─► OSRM table/route ─► SavedRoute A/B ─► "wrw.navigation" ─┐
R2 .pmtiles ─► worker (Range) ─► OPFS ─► "wrw.map" ─────────────────────────────────────────────┤ sync read
                                                                                               ▼
/alarm: useGuidance (hooki S-01 + deriveGuidance/Turf) ─► DirectionArrow + odległość (primary)
                                                       └► ExecutionMap (lazy MapLibre, 3 źródła z 1 pliku) (secondary)
```

## Phases at a Glance

| Faza | Co dowozi | Główne ryzyko |
| --- | --- | --- |
| 1. Spike gate | Pipeline paczki, dodatkowe cięcia, CORS i upload R2, OPFS i mapa offline na obu telefonach, ocena OSRM | Trzy źródła z jednego pliku albo zapis ~110 MB na iOS zawodzą (są fallbacki) |
| 2. Navigation core z trasą | `deriveGuidance`, `wrw.navigation`, postęp na trasie; S-01 bez regresu | Subtelna zmiana zachowania S-01 przy wydzielaniu |
| 3. Schrony i routing | Snapshot PSP, OSRM, A/B, odświeżanie, karta „Schron i trasa” | Jakość tras pieszych OSRM, dostępność FOSSGIS |
| 4. Paczka mapy | Manifest, worker do OPFS ze wznowieniem, karta „Mapa offline” | Limity magazynu i oddzielne dane PWA na iOS |
| 5. Mapa w Execution Mode | Lazy MapLibre, styl z tokenów, heading-up, overlay | Płynność i bateria przy obrocie z kompasu |
| 6. Teren i dokumenty | Matryca testów, PRD, roadmapa, `CLAUDE.md`, sprzątanie | Pogoda i czas na test w terenie |
| 7. P1 (opcjonalne) | Reroute online, north-up, Valhalla | — |

**Prerequisites:** S-01 done; R2 bucket i CORS (do uzupełnienia w Phase 1); `wrangler login` z uprawnieniami R2 Edit i Workers; Android i iPhone z możliwością zdalnego debugowania; preview HTTPS (`wrangler versions upload --preview-alias spike`) albo tunel.
**Estimated effort:** około 2–3 sesje; Phase 1 time-box około pół dnia (1A przy biurku ~2 h, 1B na telefonach ~2 h); fazy 1, 3, 4 i 6 wymagają telefonów, w tym wyjścia na zewnątrz.

## Open Risks & Assumptions

- **Trzy źródła z jednego pliku PMTiles** to założenie lekkiej paczki 111 MB. Fallback: 91 MB (z14 + Kraków z15) bez budynków poza Krakowem.
- **iOS i ~110 MB w OPFS:** quota, `persist()` i stabilność workera na prawdziwym iPhonie są niezmierzone. Fallback: paczka z samym Krakowem na iOS.
- **FOSSGIS to serwis społecznościowy:** brak SLA, polityka niskiego wolumenu. Mitygacja: adapter, Valhalla w P1, zapisana trasa działa bez serwisu.
- **Dane PSP:** połowa punktów jest „na żądanie” i w kryzysie może być zamknięta (decyzja zespołu: tylko czas dojścia; UI pokazuje dostępność).
- **Przycisk preview i CORS:** origin preview musi trafić do CORS R2, a po spike'u z niego zniknąć.

## Success Criteria (Summary)

- Telefon w trybie samolotowym: alarm, pierwszy krok w < 2 s, strzałka i odległość prowadzą po zapisanej trasie do automatycznie wybranego schronu PSP.
- Mapa offline pokazuje użytkownika, trasę i cel, obraca się z telefonem i nie wysyła żadnego żądania do sieci.
- Bez mapy albo bez trasy prowadzenie działa dokładnie jak w S-01.
