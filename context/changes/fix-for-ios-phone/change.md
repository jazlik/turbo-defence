---
change_id: fix-for-ios-phone
title: Przytrzymanie przycisku nie działa na iPhonie
status: implementing
created: 2026-10-04
updated: 2026-10-04
archived_at: null
---

## Notes

Plan i diagnoza (`plan-brief.md` w tym folderze) pochodzą z osobnej sesji planistycznej z
kontrolą A/B/C/D na realnym iPhonie (Safari, Web Inspector) — pewność WYSOKA, przyczyna
odtworzona i wyłączona na urządzeniu. Ta sesja wdrożyła naprawę opisaną w planie na bieżącym
stanie `main` (po zmergowaniu S-04 `offline-map-and-route`, który dodał kolejne wyspy
`client:only="react"` niewymienione w oryginalnym planie — `MapPackageCard`, `RouteCard`).

### Zrobione

- Reguła w `src/styles/global.css`: `html astro-island { display: block }`, niewarstwowa,
  specyficzność 0-0-2, z komentarzem wskazującym przyczynę i wymóg (specyficzność + brak `@layer`).
- Opakowanie **wszystkich** nieopakowanych punktów montażu wysp w `HomeScreen.astro` w jawne
  `<div>` (`MapPackageCard`, `RouteCard`, 3× `PlaceCard`, `HouseholdLinkCard`, `BackpackLinkCard`)
  — zakres szerszy niż w oryginalnym planie, bo S-04 dodał dwa nowe mounty od czasu jego napisania.
  `AlarmButton` był już opakowany; `domownicy.astro`, `plecak.astro`, `alarm.astro`, `czujniki.astro`
  już stosowały ten wzorzec.
- Asercje regresji w `scripts/smoke.mjs`: sprawdzają obie strony zależności — regułę Astro
  (`astro-island,astro-slot,astro-static-slot{display:contents}`) i nasze nadpisanie
  (`html astro-island{display:block}`) w arkuszu podlinkowanym z `/`.
- `CLAUDE.md`: iOS Safari + Android Chrome zapisane jako wspierane targety, z ostrzeżeniem o klasie
  defektu (wyspy `client:only`, `onClick` maskuje brak zdarzeń wskaźnika); konwencja „każda wyspa
  w jawnym kontenerze" dopisana do konwencji kodu.
- `useHoldAction.ts`: komentarz doprecyzowany — „sprawdzony w terenie" było prawdziwe, ale
  niejawnie androidowe; dodana zależność od reguły w `global.css`.
- Zweryfikowane automatycznie: `npm run lint` (pliki zmienione w tej zmianie — reszta repo ma
  niezwiązany, przedtem istniejący problem z końcówkami linii CRLF po `core.autocrlf=true` na
  Windows, nie naprawiany w tej zmianie), `npx astro check` (0/0/0), `npm test` (207/207),
  `npm run build`, `npm run preview` + `npm run smoke` (zielony), `EXPECT_HEADERS=1 npm run smoke`
  (zielony). Guard faktycznie łapie regresję: po tymczasowym zwężeniu selektora do `astro-island`
  (bez `html`, specyficzność 0-0-1 — to co regresja wyglądałaby jak „uproszczenie") `npm run smoke`
  **padł** z komunikatem nazywającym przyczynę; po przywróceniu reguły smoke znów zielony.

### Niezrobione — wymaga realnego urządzenia

- **Potwierdzenie na iPhonie** (Safari): przytrzymanie „Uruchom alarm" i obu `HoldButton` na
  `/alarm` odlicza i kończy akcję dotykiem. Ten agent nie ma dostępu do iPhone'a — weryfikacja
  manualna z planu (fazy 1–2) nie została wykonana.
- **Potwierdzenie braku regresji na Androidzie.**
- Zapis w tym pliku z nazwami urządzeń/przeglądarek po testach w terenie, potem `status: implemented`.
- Wpis o wymogu nazywania platformy w zapisie testu w terenie (`PROJECT.md` albo `prd.md`, faza 4
  planu, punkt 2) — odłożony do czasu faktycznego testu na iPhonie, żeby nie dopisywać reguły bez
  pierwszego przykładu jej zastosowania.
