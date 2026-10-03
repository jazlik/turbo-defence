---
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
---

## Why this stack

Household Resilience App is a small-scale web app delivered as a PWA within a 24-hour hackathon, with the language family resolved to JS/TS. The team took the registry's recommended default for web in JS: Astro, React, TypeScript, Tailwind, Supabase and Cloudflare. It clears all four agent-friendly gates and deploys to Cloudflare Pages with GitHub Actions auto-deploy on merge. Bootstrapper confidence is first-class, so expect mostly smooth scaffolding with occasional manual steps. A mismatch was flagged and accepted. The PRD is offline-first and local-only, with no accounts and no server, so Supabase and server rendering are unused. The PWA service worker, offline map tiles and routing, Polish text-to-speech, and geolocation and compass must be added manually as client-side React islands. None of the five technology-forcing feature flags apply.


## Update (offline-app-shell)

Deploy target is Cloudflare Workers static assets (assets-only Worker), not Cloudflare Pages. Supabase, server rendering and the Cloudflare adapter were removed in `offline-app-shell`; the app is a static PWA with no backend.
