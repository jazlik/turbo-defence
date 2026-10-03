---
change_id: coordinates-problem
title: Coordinate entry lacks N/S and E/W hemisphere
status: proposed
created: 2026-10-03
updated: 2026-10-03
archived_at: null
---

## Problem

W polu „Albo wpisz współrzędne" (`PlaceCard.tsx`) użytkownik może podać tylko **dwie liczby dziesiętne ze znakiem** (np. `52.2297, 21.0122`). Nie ma żadnego sposobu, żeby jawnie wskazać **półkulę**:

- **szerokość geograficzna N/S** (północ/południe),
- **długość geograficzna E/W** (wschód/zachód).

Konsekwencje:

1. **Konwencja znaku jest ukryta.** Użytkownik musi wiedzieć, że szerokość ujemna = S, a długość ujemna = W. W UI nie ma o tym żadnej informacji ani podpowiedzi.
2. **Popularne formaty są odrzucane.** `parseCoordinates` (`src/lib/geo.ts`) akceptuje wyłącznie dwie liczby ze znakiem oddzielone `,` / `;` / spacją. Współrzędne zapisane jako `52°13′N 21°00′E`, `21°00′W` czy `52,2297 N; 21,0122 E` nie przejdą walidacji (błąd „format").
3. **Ryzyko błędu znaku.** Użytkownik kopiujący „21.0122 W" wpisze `21.0122` (dodatnie = E) zamiast `-21.0122` i po cichu umieści punkt po złej stronie południka. Dla ewakuacji to krytyczne — może poprowadzić rodzinę w złą lokalizację.
4. **Nieczytelny odczyt.** `formatCoordinates` wyświetla `-21.0122` zamiast `21.0122° W`, co utrudnia potwierdzenie poprawności zapisanej pozycji.

## Proposed direction (do rozważenia)

- Rozszerzyć `parseCoordinates` o obsługę kierunków `N`/`S`/`E`/`W` (sufiksy lub prefiksy), np. `52.2297 N, 21.0122 E` oraz `21.0122 W`.
- Ewentualnie osobne pola szerokość/długość z listą wyboru półkuli.
- Zmienić `formatCoordinates` tak, aby pokazywał kierunek zamiast samego znaku minus.

## Files

- `src/components/PlaceCard.tsx` — pole wejściowe + walidacja + komunikat błędu.
- `src/lib/geo.ts` — `parseCoordinates` (logika parsowania).
- `src/types.ts` — `Coordinates { latitude; longitude }` (model bez zmian, sama notacja wejściowa/wyjściowa).
