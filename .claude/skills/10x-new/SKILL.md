---
name: 10x-new
description: Initialize a new change folder under context/changes/<change-id> with a change.md identity file
argument-hint: "<change-id-or-path> [freeform intent]"
allowed-tools:
  - Read
  - Glob
  - Write
  - Bash
  - AskUserQuestion
---

# /10x-new — Start a New Change

Bootstrap a new change folder under `context/changes/<change-id>/`. Creates a tiny identity file (`change.md`) and points the user at the next skill.

A "change" is a single unit of work end-to-end — research, planning, implementation, and review all live inside one folder keyed by `<change-id>`.

## Initial Response

When this command is invoked:

1. **Check if any argument was provided**:
   - If an argument was provided, parse it (see "Argument Parsing" below) and proceed to "Validation"
   - If NO argument was provided, respond with the following message and **STOP**:

```
I'll create a new change folder. Please provide a change-id (kebab-case slug):

Examples:
  /10x-new context-dir-restructure
  /10x-new oauth-login add Google sign-in so users skip the email-password step
  /10x-new @context/changes/oauth-login/

The first token becomes the change-id. Anything after it is freeform intent — used to write a richer title and to pick the next-step suggestion. Path-style references (with or without a leading `@`) are accepted; the last path segment is used as the change-id.

The change-id must be:
- kebab-case (lowercase letters, digits, hyphens; no leading/trailing hyphen, no double hyphens)
- unique across `context/changes/` and `context/archive/`
```

   Then **wait** for the user to provide an argument.

## Argument Parsing

Split the raw argument string on the first run of whitespace:

- **First token** = the change-id reference. Normalize it:
  1. Strip a leading `@` if present (`@context/changes/feature-x/` → `context/changes/feature-x/`).
  2. Strip a trailing `/` if present.
  3. If the result contains `/`, take the last non-empty path segment (`context/changes/feature-x` → `feature-x`).
  4. The result is `<change-id>`.
- **Everything after the first token** = freeform intent. May be empty. May be a sentence or a paragraph. **Do not** treat it as a literal title to insert verbatim.

Examples:

| Raw input | `<change-id>` | Intent |
|-----------|---------------|--------|
| `feature-x` | `feature-x` | (empty) |
| `oauth-login add Google sign-in for faster onboarding` | `oauth-login` | `add Google sign-in for faster onboarding` |
| `@context/changes/oauth-login/` | `oauth-login` | (empty) |
| `@context/changes/oauth-login/ revisit the token-refresh edge case` | `oauth-login` | `revisit the token-refresh edge case` |
| `My Feature add OAuth` | `My Feature` (will fail kebab-case check) | `add OAuth` |

## Validation

Before creating anything:

1. **kebab-case check**: `<change-id>` must match `^[a-z][a-z0-9]*(-[a-z0-9]+)*$` (starts with a letter, segments of lowercase + digits separated by single hyphens, no leading/trailing hyphen, no double hyphens).
   - On failure, print: `error: change-id "<id>" is not kebab-case. Use lowercase letters, digits, and single hyphens only (e.g., "oauth-login", not "OAuth Login").` and STOP.

2. **Uniqueness check**: neither `context/changes/<change-id>/` nor `context/archive/<change-id>/` may already exist.
   - On collision, print: `error: change "<id>" already exists at <path>. Pick a different change-id or work inside the existing folder.` and STOP.

3. **`context/changes/` parent exists**: if missing, print `error: context/changes/ not found — is this repo set up for the 10x context structure?` and STOP. (Do NOT auto-create the parent; that's a sign the repo isn't ready.)

## Git Branch Check

Before creating anything, make sure the active branch is identifiable with this change. Its name must contain the literal `<change-id>`. Branch naming conventions may otherwise vary: `change/<change-id>`, `feature/<change-id>-api`, and `team-<change-id>` are all valid. Being ahead of the default branch is not sufficient: that may be an unrelated or completed change.

1. Skip this whole section if not a git repo (`git rev-parse --is-inside-work-tree` fails) — proceed straight to Creation.
2. Get the active branch with `git branch --show-current`. A detached HEAD has no branch name and does not pass this check.
3. If the active branch name is empty or does not contain the literal `<change-id>`, STOP and ask with AskUserQuestion before writing any file:
   - Question: `Current branch "<branch-or-detached>" does not contain the change ID "<change-id>". Create or switch to a branch named for this change before continuing?`
   - **Create `change/<change-id>`** (recommended) — `git checkout -b change/<change-id>`, or `git checkout change/<change-id>` if that branch already exists (reuse it, don't fail).
   - **Stay here** — explicit opt-out; print a one-line reminder after creation that the change folder — and any later plan/implementation work — will land on the current ref unless the user branches later.
   - If the checkout itself fails, print the git error verbatim and STOP — do not fall back to writing silently.
4. If the active branch name contains `<change-id>`, proceed to Creation.

## Creation

1. Create directory `context/changes/<change-id>/`.
2. Derive the `<title>`:
   - If the intent string is empty, humanize the change-id: replace hyphens with spaces and capitalize the first letter (e.g., `multi-course-access` → `Multi course access`).
   - If the intent string is non-empty, write a concise human-readable title (≤ 80 chars, sentence case, no trailing period) that captures what the change is about. The intent is *guidance*, not a literal — feel free to rephrase. Don't dump a paragraph into the title.
3. Derive the `## Notes` body:
   - If the intent string is empty, emit the hint comment: `<!-- Free-form notes for this change: links, ad-hoc context, decisions that don't belong in research/frame/plan. -->`
   - If the intent string is non-empty, drop it verbatim as the Notes body — the user's words are the seed. Do not also emit the hint comment in that case (the user has shown they know what Notes are for).
4. Write `context/changes/<change-id>/change.md` with this exact shape (the `<notes-body>` slot is what step 3 produced):

```markdown
---
change_id: <change-id>
title: <title>
status: new
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
archived_at: null
---

## Notes

<notes-body>
```

`<YYYY-MM-DD>` is today's date (use `date +%Y-%m-%d`).

See `reference/change-md.md` for the full schema reference (allowed status values, transitions, what is intentionally NOT in `change.md`).

## Next-step suggestion

After successful creation, print a next-step prompt and copy the suggested command to clipboard.

The default next step is `/10x-plan <change-id>` — most changes go straight to planning. The other two skills are situational: `/10x-research` when the parsed intent (or the surrounding turn) suggests the change requires meaningful codebase exploration before a plan can be written, and `/10x-frame` when the intent signals that the framing is suspect — either bug-shape ("fix", "bug", "broken", "why is", "root cause", "regression", "self-diagnosed solution") or scope/design-shape ("should we even", "is this the right", "what's actually broken", "rethink", "challenge the assumption"). Pick the situational option only when the signal is clear; otherwise default to `/10x-plan`.

```bash
NEXT_CMD="/10x-plan <change-id>"   # default; see above for when to switch to /10x-research or /10x-frame
echo -n "$NEXT_CMD" | pbcopy 2>/dev/null || echo -n "$NEXT_CMD" | clip.exe 2>/dev/null || echo -n "$NEXT_CMD" | xclip -selection clipboard 2>/dev/null || true
```

```powershell
# PowerShell (Windows)
Set-Clipboard $NEXT_CMD
```

Then display:

```
✓ Created context/changes/<change-id>/change.md (status: new)

Next step:
  → <NEXT_CMD>  (✓ copied to clipboard)

Other options:
  /10x-research <change-id>   — explore the codebase first (when planning needs grounding)
  /10x-frame <change-id>      — challenge the framing first (when the symptom and proposed fix are stated as one, or when the right scope to plan is unclear)
```

If no clipboard tool is available (`pbcopy`, `clip.exe`, `xclip`, `Set-Clipboard`), drop the `(✓ copied to clipboard)` annotation but still print the suggestion.

## What this skill does NOT do

- Does not write `frame.md`, `research.md`, `plan.md`, or any other artifact — those come from their respective skills.
- Does not write to any state-file sidecar; the `## Progress` section in `plan.md` is the single source of truth for execution state.
- Does not enforce status transitions — `change.md` is record-only.
- Does not create the `context/changes/` parent directory; if it's missing, the repo isn't bootstrapped for this structure and the user should resolve that first.
