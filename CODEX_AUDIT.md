# Curation audit

Source: C:\Users\deluc\Documents\Scout.

## Included

- Root pnpm workspace manifests, lockfile, TypeScript configuration, and prompt/design brief.
- apps/math-service: FastAPI/SymPy service, schemas, parsing, structural diff, visualization adapters, routes, and endpoint tests.
- apps/web: Next.js/React/TypeScript/MathLive notebook UI, math blocks, derivation state, drawing canvas, layout, and client validation.
- packages/shared: shared TypeScript domain types and Zod schemas.
- infra/sql/0001_init.sql.
- The original README is retained as LOCAL_README.md.

## Validation

- Math-service pytest suite passed 5/5 when run from apps/math-service.
- Python service compilation passed.
- @axiom/shared typecheck passed.
- @axiom/web production build passed with Next.js.

## Deliberate exclusions

- node_modules/, .next/, .pytest_cache/, __pycache__/, build metadata, coverage, caches, and generated output.
- docker-compose.yml and .env.example, which contain local development database credentials/configuration.
- Local database data directory.
- No personal credentials or private keys were included.

This is a private, source-first monorepo archive preserving the working math-native notebook implementation without publishing dependencies, build products, or local database configuration.
