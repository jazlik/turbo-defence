---
bootstrapped_at: 2026-10-03T15:53:00Z
starter_id: 10x-astro-starter
starter_name: "Astro + React + Tailwind + Cloudflare starter"
project_name: w-razie-w
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: "npm audit --json"
---

## Hand-off

```yaml
starter_id: 10x-astro-starter
package_manager: npm
project_name: w-razie-w
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: false
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
```

### Why this stack

Household Resilience App is a small-scale web app delivered as a PWA within a 24-hour hackathon, with the language family resolved to JS/TS. The team took the registry's recommended default for web in JS: Astro, React, TypeScript, Tailwind, Supabase and Cloudflare. It clears all four agent-friendly gates and deploys to Cloudflare Pages with GitHub Actions auto-deploy on merge. Bootstrapper confidence is first-class, so expect mostly smooth scaffolding with occasional manual steps. A mismatch was flagged and accepted. The PRD is offline-first and local-only, with no accounts and no server, so Supabase and server rendering are unused. The PWA service worker, offline map tiles and routing, Polish text-to-speech, and geolocation and compass must be added manually as client-side React islands. None of the five technology-forcing feature flags apply.

## Pre-scaffold verification

| Signal      | Value                                                     | Severity | Notes                                             |
| ----------- | --------------------------------------------------------- | -------- | ------------------------------------------------- |
| npm package | not run                                                   | —        | cmd_template starts with `git clone`; no npm CLI   |
| GitHub repo | starter repo last pushed 2026-09-12 | fresh    | from card.docs_url                                |

## Scaffold log

**Resolved invocation**: `git clone <starter-repo> .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`
**Strategy**: git-clone
**Exit code**: 0 (npm 11.13.0, node v24.16.0; 658 packages added)
**Files moved**: 20 top-level entries — AGENTS.md, CLAUDE.md, astro.config.mjs, components.json, eslint.config.js, node_modules/, package-lock.json, package.json, public/, scripts/, src/, supabase/, tsconfig.json, wrangler.jsonc, .env.example, .github/, .husky/, .nvmrc, .prettierrc.json, .vscode/
**Conflicts (.scaffold siblings)**: README.md.scaffold
**.gitignore handling**: append-merged (separator comment; `.DS_Store` de-duped)
**.bootstrap-scaffold cleanup**: deleted (emptied via move-up, then `rmdir`)
**Cloned `.git/`**: moved out of the project into the session scratchpad instead of being deleted in place (in-place `rm -rf` was denied by the permission policy); upstream history did not leak into the repo.
**context/ in scaffold**: absent — nothing dropped.

## Post-scaffold audit

**Tool**: npm audit --json (exit 1 — informational)
**Summary**: 0 CRITICAL, 6 HIGH, 4 MODERATE, 0 LOW
**Direct vs transitive**: 0/2/1/0 direct of total 0/6/4/0

#### CRITICAL findings

None.

#### HIGH findings

- **astro** (direct) — via `http-cache-semantics`. npm's suggested fix is a downgrade to astro 2.10.9 (semver-major), which is not a real remedy; wait for an upstream astro release.
- **@astrojs/cloudflare** (direct) — via `astro`. Suggested fix is a downgrade to 6.8.0 (semver-major); same caveat.
- **http-cache-semantics** (transitive, range `*`) — GHSA-ch52-4w7c-c8xp: max-stale handling can disclose cross-user cached responses. No patched version yet.
- **undici** 7.0.0–7.29.0 (transitive) — 10 advisories incl. GHSA-3wwx-pv8p-q78v, GHSA-w293-vg96-wgc3 (TLS validation bypass in BalancedPool), GHSA-2jfj-6hjv-fm6j (Set-Cookie caching). Fix available via `npm audit fix`.
- **devalue** ≤5.9.2 (transitive) — GHSA-j22f-vq7h-c4qm, GHSA-hx4r-w6wj-j8fg, GHSA-mcm9-63f2-9j32, GHSA-wf3x-273g-mvxv, GHSA-x5rw-q4pp-hg5g, GHSA-4q55-j62x-fr9h. Fix available.
- **brace-expansion** (transitive) — GHSA-q2hr-2g5m-vwhr, GHSA-qhr7-859c-m2p7, GHSA-6j4f-fj2g-mc7p (DoS). Fix available.

#### MODERATE findings

- **wrangler** 4.102.0–4.143.0 (direct) — via `miniflare`. Fix available.
- **@cloudflare/vite-plugin** (transitive) — via `miniflare`, `wrangler`. Fix available.
- **miniflare** (transitive) — via `undici`. Fix available.
- **fast-uri** 3.0.0–3.1.7 (transitive) — GHSA-hrr3-gc8f-f4qj. Fix available.

#### LOW / INFO findings

None.

## Hints recorded but not acted on

| Hint                    | Value                |
| ----------------------- | -------------------- |
| bootstrapper_confidence | first-class          |
| quality_override        | false                |
| path_taken              | standard             |
| self_check_answers      | null                 |
| team_size               | solo                 |
| deployment_target       | cloudflare-pages     |
| ci_provider             | github-actions       |
| ci_default_flow         | auto-deploy-on-merge |
| has_auth                | false                |
| has_payments            | false                |
| has_realtime            | false                |
| has_ai                  | false                |
| has_background_jobs     | false                |

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- `git init` (if you have not already) to start your own repo history.
- Review any `.scaffold` siblings the conflict policy created and decide which version of each file to keep.
- Address audit findings per your project's risk tolerance — the full breakdown is in this log.
