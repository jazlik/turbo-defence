# 10x Workflow — jak pracować nad change'ami

Skille w `.claude/skills/` prowadzą jedną jednostkę pracy (change) od pomysłu do archiwum. Cała wiedza żyje w `context/`:
`foundation/` (PRD, roadmapa) → `changes/<change-id>/` (praca w toku) → `archive/` (domknięte).

## Pętla jednego change'a

Jeden change = jeden branch = jeden PR. Change ID bierzemy z kolumny „Change ID” w `context/foundation/roadmap.md`.

```
git switch main && git pull
git switch -c change/<change-id>
```

| Krok | Komenda | Co robi | Wynik |
| ---- | ------- | ------- | ----- |
| 1 | `/10x-new <change-id>` | zakłada folder zmiany | `context/changes/<id>/change.md` |
| 2 | `/10x-plan <change-id>` | research + plan z fazami i kryteriami sukcesu | `plan.md` |
| 3 | `/10x-plan-review <change-id>` | recenzja planu (treść, wykonalność, architektura) przed kodem | uwagi do planu |
| 4 | `/10x-implement <change-id>` | realizacja planu faza po fazie z weryfikacją | kod + zaktualizowany Progress w `plan.md` |
| 5 | `/10x-impl-review <change-id>` | review kodu względem planu (dryf, ryzyka, wzorce) | `reviews/impl-review.md` |
| 6 | `/10x-archive <change-id>` | przenosi folder do `context/archive/`, stempluje `change.md` | zamknięty change |

Zasady praktyczne:

- Po `/10x-plan-review` popraw plan **przed** `/10x-implement`; po `/10x-impl-review` popraw kod **przed** `/10x-archive`.
- Każdy skill uruchamiaj w świeżej sesji lub po `/clear` — stan jest w plikach w `context/changes/<id>/`, nie w rozmowie.
- Na koniec zaktualizuj status w roadmapie (`Status` → `done`, przeniesienie do sekcji `Done`) i zrób merge do `main`.
- Przykład na start: `/10x-new offline-app-shell`, potem `/10x-plan offline-app-shell`.

## Kolejność i niezależność change'ów (z `roadmap.md`)

```
F-01 offline-app-shell
  └─ S-01 guided-to-point-offline          ← gwiazda przewodnia
        ├─ S-02 step-flow-and-fallback      ┐
        ├─ S-03 voice-guidance              ├─ niezależne od siebie
        ├─ S-04 offline-map-and-route       │
        └─ S-05 household-members           ┘
              └─ S-06 personalized-backpack
S-04 + S-06 → S-07 first-run-onboarding → S-08 readiness-screen → S-09 share-plan
```

| Change ID | Zależy od | Można robić równolegle z |
| --------- | --------- | ------------------------ |
| `offline-app-shell` (F-01) | — | nic (idzie pierwszy; blokuje resztę) |
| `guided-to-point-offline` (S-01) | F-01 | nic (idzie drugi) |
| `step-flow-and-fallback` (S-02) | S-01 | S-03, S-04, S-05, S-06 |
| `voice-guidance` (S-03) | S-01 | S-02, S-04, S-05, S-06 |
| `offline-map-and-route` (S-04) | S-01 | S-02, S-03, S-05, S-06 |
| `household-members` (S-05) | S-01 | S-02, S-03, S-04 |
| `personalized-backpack` (S-06) | S-05 | S-02, S-03, S-04 |
| `first-run-onboarding` (S-07) | S-04, S-06 | — |
| `readiness-screen` (S-08) | S-07 | — |
| `share-plan` (S-09) | S-08 | — |

Wniosek: po zmergowaniu S-01 mamy do 4 niezależnych change'ów naraz (S-02, S-03, S-04, S-05; S-06 dołącza po S-05). Dwa strumienie:
**A** (prowadzenie: S-02/S-03/S-04) i **B** (plan: S-05 → S-06 → S-07 → S-08 → S-09; S-07 czeka też na S-04).

## Równoległa praca

- Każdy change na własnym branchu (`change/<change-id>`), najlepiej w osobnym worktree: `git worktree add ../turbo-defence-<id> change/<id>`.
- Zakładaj branche z aktualnego `main` po zmergowaniu zależności (np. S-02..S-05 dopiero po merge S-01).
- Change'e równoległe dotykają wspólnych plików (np. zapis planu z S-01) — mergujemy je po kolei i rebase'ujemy kolejne branche.
- Ten sam plik `roadmap.md` edytuje wielu — zmianę `Status` rób w osobnym, małym commicie, żeby uniknąć konfliktów.
