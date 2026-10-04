# Ilustracje i ikona aplikacji

Zasady stylu są w [`JEZYK_WIZUALNY.md`](../../../JEZYK_WIZUALNY.md) §12 — tu tylko pliki, pochodzenie i sposób pracy.

## Poradnik onboardingu — 5 kart

Ścieżka po pierwszym wejściu, w kolejności przepływu z [roadmapy](../roadmap.md); poradnik kończy się obietnicą north star (S-01).

| #   | Plik                                            | Funkcja                                     | Scena                                                       | Obiekt w stali |
| --- | ----------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------- | -------------- |
| 1   | `public/ilustracje/poradnik/domownicy.webp`     | domownicy i kontakty (S-05)                 | rodzina z babcią w drzwiach domu                            | drzwi          |
| 2   | `public/ilustracje/poradnik/plecak.webp`        | plecak (S-06)                               | dorosły z dzieckiem pakują plecak                           | plecak         |
| 3   | `public/ilustracje/poradnik/miejsca.webp`       | miejsca: spotkania, zapasowe, schron (S-08) | rodzina przy ławce, w tle miejsce zapasowe na końcu ścieżki | ławka          |
| 4   | `public/ilustracje/poradnik/udostepnienie.webp` | udostępnienie planu (S-09)                  | dorosły pokazuje plan na telefonie babci                    | telefon        |
| 5   | `public/ilustracje/poradnik/prowadzenie.webp`   | prowadzenie offline (S-01, S-04)            | dorosły idzie ścieżką z telefonem w stronę schronienia      | —              |

Pliki: WebP, szerokość ≤ 960 px, przezroczyste tło, 100–150 KiB. Ilustracje nie są jeszcze użyte na żadnym ekranie — wejdą z onboardingiem (S-08). Rozszerzenie `webp` nie jest w globie precache (`scripts/generate-sw.mjs`); jeśli onboarding ma pokazywać ilustracje offline, trzeba je tam dodać razem z ekranem.

## Pochodzenie

- Ilustracje: wygenerowane przez AI (Codex z `image_gen`, 2026-10-03) w stylu wybranym przez zespół w eksploracji czterech kierunków; referencje stylu: Open Doodles (CC0) i własne zaakceptowane karty. W zgłoszeniu hackathonowym oznaczyć jako wygenerowane przez AI (§20).
- Ikona: narysowana ręcznie jako SVG (bez generatora), z pomysłu zespołu „dom i podwójne W”.
- Eksploracja (kandydaci, referencje, arkusze porównawcze, prototyp poradnika do przeklikania, alternatywna karta 5 ze strzałką na ziemi) zostaje na branchach `feat/illustration-directions` i `feat/app-icon` — nie trafia do `main`.

## Jak dodać lub podmienić ilustrację

1. Wygeneruj kandydatów w stylu z §12, dołączając jako referencję stylu 2–4 karty z `public/ilustracje/poradnik/`.
2. `npm run illustrations:export -- <źródło.png> public/ilustracje/<…>.webp` — wycina białe tło, przycina i zapisuje WebP.
3. Ikona: edytuj SVG w `public/icons/`, potem `npm run icon:export`.
