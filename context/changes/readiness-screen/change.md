---
change_id: readiness-screen
title: Ekran gotowości jako strona główna z quick winami i nawigacją
status: implementing
created: 2026-10-04
updated: 2026-10-04
archived_at: null
---

## Notes

Preparation Mode = ekran gotowości (`/`): jakościowy poziom gotowości, jeden primary CTA „następny krok" (quick win), milestone'y jako statusy, alarm przyklejony na dole i zawsze dostępny. Konfiguratory (domownicy, plecak, miejsca, czujniki, mapa) są głębiej, ze spójnym powrotem „← Gotowość". Zastępuje S-07 (usunięte z roadmapy): pierwsze uruchomienie to stan początkowy tego ekranu. Dodatkowo „mapa gotowości” (widok całości): wszystkie czynności z katalogu quick winów pogrupowane w etapy, ze stanem; ten sam katalog zasila CTA „następny krok” i poziom. Nazwa UI bez słowa „mapa”, żeby nie mylić z mapą offline (S-04). Czysta funkcja `computeReadiness` w `src/lib/` jako podstawa quick winów. Bez punktów i streaków (FR-016). Do rozstrzygnięcia w planie: liczba poziomów i progi, które milestone'y są wymagane do „Ready", alarm sticky tylko na `/`.
