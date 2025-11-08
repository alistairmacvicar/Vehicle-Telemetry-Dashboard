# AI Coding Agent Instructions

Concise guide for Nuxt 4 + Vue 3 telemetry dashboard. Favor existing patterns; reuse helpers; no redundant comments.

## Architecture & Data Flow

Frontend: `app/pages`, global shell `app/app.vue`, feature components in `app/components/**` (Charts, Sidebar, Tracker). Shared logic in `app/composables`, `app/lib`.
Backend (Nitro): API in `server/api/**`; simulation loop `server/utils/vehicle-simulation.ts` launched by `server/plugins/vehicle-simulation.ts`.
Shared types: `shared/types/*` (`Vehicle`, `TelemetryData`, `DataRecord`). Import instead of redefining.
Lifecycle: `startSimulation()` seeds & ticks `vehicles[]`; client polls `/api/vehicles?id=all` (remaining route geoJSON only).
Routing services: Only via internal endpoints (`/api/route/directions`, `/api/route/snap-coordinates`).

## Conventions & Patterns

Aliases: `~/` (app), `~~/` (root). Use shared types from `~~/shared/*`.
Env: early validation (`app/lib/env.ts`, `try-parse-env.ts`). Extend `EnvSchema` for new required keys.
Polling: mirror `useVehicles()` (fetch key + `refreshNuxtData`). Store state with `useState`; avoid server timers.
Charts: reuse `timeAxis`, `valueAxis`, `baseTooltip`, `dataZoom` from `app/lib/util/echarts.ts`.
Series transforms: extend `data-to-series.ts` for new metrics.
Movement & route mutation: server-only.
Validation: Zod for all queries (`getValidatedQuery(event, Schema.safeParse)` then check `.success`).
Vehicle payload: include truncated `route.geoJSON` plus tracking indexes.

## Styling & UI

Scoped CSS + Nuxt UI utilities; keep gradients, compact grids, tabular numbers.
Dark mode: derive `isDark` via `useColorMode()`; no hardcoded light colors.

## Performance & Safety

Tick loop logging minimal; guard with `NODE_ENV !== 'production'`.
Clamp telemetry values (follow `pushTelemetry()` patterns).
No per-request recomputation of history arrays.

## Extending Functionality

Telemetry metric: extend `TelemetryData`, update `pushTelemetry()`, add transform in `data-to-series.ts`, chart consumes utilities.
API route: add `server/api/<name>.get.ts`; define schema; validate; return minimal typed payload.
Live resource: new composable mirroring `useVehicles()` with start/stop + ID lookup.

## Build & Tooling

Scripts: `dev`, `build`, `generate`, `preview`, `lint`, `lint:fix`; postinstall `nuxt prepare`.
Run `npm run lint:fix` before commits.
Generated TS configs: don’t modify.

## DO / DO NOT

DO: reuse helpers/types; validate queries; keep movement logic server-only.
DO NOT: duplicate movement logic client-side; call external routing APIs directly; poll faster than 500ms.

## Secrets & Env

`ORS_API_KEY` required; add new secrets to `EnvSchema`; use only server-side.

## Review Checklist

1. Types updated if new data appears.
2. Input validated; payload trimmed.
3. Components use transformed series.
4. Dark mode preserved.
5. Lint passes.

Feedback welcome for further compression or clarity.
