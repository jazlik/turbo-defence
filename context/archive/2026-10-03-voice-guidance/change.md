---
change_id: voice-guidance
title: Głos prowadzący po polsku (S-03)
status: archived
created: 2026-10-03
updated: 2026-10-03
archived_at: 2026-10-03T20:39:51Z
---

## Notes

<!-- Free-form notes for this change: links, ad-hoc context, decisions that don't belong in research/frame/plan. -->

### Otwarte testy na telefonie (z impl-review 2026-10-03)

Wszystkie zaliczone 2026-10-03 na wdrożonym buildzie 422be3f (Android online i offline). Wynik 2.8: brak polskiego głosu daje wynik z instrukcją; samego wyciszenia nie da się wykryć — syntezator startuje przy głośności 0 i `/czujniki` pokazuje „Działa offline” (ograniczenie Web Speech API).

- [x] 2.6–2.8 `/czujniki` → „Sprawdź głos” na Androidzie i iOS, także w trybie samolotowym. To bramka go/no-go: jeśli żaden telefon demo nie mówi po polsku offline, wróć do decyzji o nagranych komunikatach.
- [x] 2.9 Czy `cancel()` tuż przed `speak()` połyka wypowiedź — wpisz wynik tutaj.
- [x] 3.6–3.12 Głos na `/alarm` w terenie.
- [x] 4.1–4.2 CI na branchu i smoke na wdrożonym adresie.
- [x] 4.3 Cała ścieżka z głosem w trybie samolotowym.
