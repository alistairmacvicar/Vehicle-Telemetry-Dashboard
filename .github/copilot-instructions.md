# Vehicle Telemetry Dashboard - Development Guide

## Project Overview

Real-time vehicle telemetry visualization dashboard built with Nuxt 3, TypeScript, Vue 3, and Apache ECharts. Features live vehicle tracking with OpenStreetMap integration and real-time chart updates.

## Technology Stack

- **Framework**: Nuxt 3, Vue 3 Composition API
- **Language**: TypeScript 5.x targeting ES2022
- **Charts**: Apache ECharts, vue-echarts
- **Mapping**: Leaflet
- **Styling**: Nuxt UI
- **Validation**: Zod
- **Testing**: Playwright

**IMPORTANT**: Check `package.json` for installed versions before suggesting library-specific code.

## Project Structure

```
app/
  ├── components/     # Vue components (Charts, Tracker, Sidebar)
  ├── composables/    # Shared composables (useVehicles)
  ├── pages/          # Nuxt pages and routes
  └── lib/            # Utilities and helpers
server/
  ├── api/            # API routes
  ├── plugins/        # Server plugins (vehicle simulation)
  └── utils/          # Server utilities
shared/
  └── types/          # Shared TypeScript types (vehicle, geo, data)
```

## Key Patterns & Conventions

### State Management

- Use **composables pattern** for shared state (see `composables/useVehicles.ts`)
- Follow Vue 3 Composition API with `<script setup>` syntax
- Keep reactive state minimal and focused

### Type Definitions

- All vehicle types: `shared/types/vehicle.ts`
- Geographic types: `shared/types/geo.ts`
- Data series types: `shared/types/data.ts`
- **Shared types** are used by both client and server

### ECharts Integration

- Use utilities in `lib/util/echarts.ts` for consistent chart configuration
- Import chart types from `echarts/charts` (not full bundle)
- Use client-side plugin: `plugins/echarts.client.ts`

### Real-time Data

- Vehicle simulation: `server/plugins/vehicle-simulation.ts`
- Data transformation: `lib/util/data-to-series.ts`
- All data updates flow through composables

## Development Standards

Comprehensive guidelines are automatically applied based on file type:

- **[TypeScript Standards](./.github/instructions/typescript-5-es2022.instructions.md)** - Language conventions, type system, ES2022 features
- **[Security Practices](./.github/instructions/security-and-owasp.instructions.md)** - OWASP Top 10, input validation, secure coding
- **[Performance Optimization](./.github/instructions/performance-optimization.instructions.md)** - Frontend/backend performance, profiling
- **[Testing with Playwright](./.github/instructions/playwright-typescript.instructions.md)** - E2E test generation and best practices
- **[Code Commenting](./.github/instructions/self-explanatory-code-commenting.instructions.md)** - When and how to comment
- **[Copilot Behavior](./.github/instructions/taming-copilot.instructions.md)** - Response style and interaction patterns
- **[Task Implementation](./.github/instructions/task-implementation.instructions.md)** - Task planning and tracking workflow

## Available Development Tools

### Prompts (use `/command`)

- `/playwright-generate-test` - Generate Playwright E2E tests
- `/documentation-writer` - Generate or update documentation
- `/github-copilot-starter` - Set up Copilot config for new projects

### Chat Modes (use `#file:path`)

- `#file:.github/chatmodes/debug.chatmode.md` - Systematic debugging workflow
- `#file:.github/chatmodes/task-planner.chatmode.md` - Research-driven feature planning
- `#file:.github/chatmodes/task-researcher.chatmode.md` - Comprehensive research collection

## Critical Requirements

### Version Consistency

- **Always verify** library versions before suggesting code
- **Use `#fetch` tool** to get current documentation for libraries
- **Never assume** API syntax - check actual version being used
- Current versions in this project: Check `package.json` first

### Factual Verification Workflow

**MANDATORY** when working with libraries or frameworks:

1. **Identify the library** being used
2. **Check `package.json`** for the installed version
3. **Use `#fetch`** to retrieve current documentation for that version
4. **Verify API syntax** matches the installed version
5. **Only then** suggest code or solutions

**Never rely on training data** for version-specific APIs. Always verify.

### Code Generation Philosophy

- **Minimal and surgical**: Make smallest necessary changes
- **Preserve existing code**: Respect current architecture and patterns
- **Explicit instructions only**: Don't refactor unsolicited code
- **Direct implementation**: Edit files directly when asked, don't provide copy-paste snippets

---

**Note**: This file provides project context and navigation. Detailed coding standards are in specialized instruction files that apply automatically based on file type.
