# Rules for AI

This file provides guidance to AI Agent when working with code in this repository.

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build (fully static output in `dist/`)
- `npm run preview` — preview production build
- `npm run lint` — ESLint with type-checked rules
- `npm run lint:fix` — auto-fix lint issues
- `npm run format` — Prettier (includes prettier-plugin-astro + prettier-plugin-tailwindcss)
- `npm run smoke` — dependency-free HTTP smoke test of the served build (`scripts/smoke.mjs`, added in the `offline-app-shell` change, Phase 2), `BASE_URL` env (default `http://localhost:4321`).

Pre-commit hooks: husky + lint-staged runs `eslint --fix` on `*.{ts,tsx,astro}` and `prettier --write` on `*.{json,css,md}`.

## Architecture

**Static Astro 7 PWA** with React 19 islands, Tailwind 4 and shadcn/ui components. No server, no accounts, no backend: all user data is local to the device (offline-first, per the PRD). Hosted on Cloudflare Workers as an assets-only Worker serving `dist/`.

### Rendering mode

`output: "static"` in astro.config.mjs, no adapter. Do not add SSR pages, API routes, middleware or server-side env secrets.

### Key conventions

- **Path alias**: `@/*` maps to `./src/*` (tsconfig paths).
- **Astro components** for static content/layout; **React components** only when interactivity is needed.
- **Tailwind class merging**: use the `cn()` helper from `@/lib/utils` (clsx + tailwind-merge) for conditional/merged class names. Do not concatenate class strings manually.
- **shadcn/ui**: components live in `src/components/ui/`, "new-york" style variant. Install new ones with `npx shadcn@latest add [name]`.
- **React**: no Next.js directives ("use client" etc.). Extract hooks to `src/components/hooks/`.
- **Services/helpers** go in `src/lib/` (or `src/lib/services/` for extracted business logic).
- **Shared types** (entities, DTOs) go in `src/types.ts`.
- **Language**: UI copy is Polish (`<html lang="pl">`).

### Environment

- Node.js v22.14.0 (see `.nvmrc`)
- No environment variables or secrets are needed to build.
- Deploy: assets-only Worker `w-razie-w` via `npx wrangler deploy` (CI deploys from `main`).

## CI

GitHub Actions workflow (`.github/workflows/ci.yml`) is being reworked in the `offline-app-shell` change (Phase 3) to run lint, type check, build and smoke, and to deploy from `main`.
