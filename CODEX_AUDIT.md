# Release audit

Audit date: 2026-09-17

## Included

- root pnpm workspace manifests, lockfile, TypeScript configuration, and architecture brief
- `apps/math-service`: FastAPI/SymPy service, schemas, parsing, structural diff, visualization adapters, routes, and endpoint tests
- `apps/web`: Next.js/React/TypeScript/MathLive notebook UI, derivation state, drawing, block editing, and client validation
- `packages/shared`: shared TypeScript domain types and Zod schemas
- `infra/sql/0001_init.sql`
- the original project README retained as `LOCAL_README.md` for provenance

## Observed validation

- math-service pytest suite: 5/5 passing
- Python service compilation: passing
- `@axiom/shared` typecheck: passing
- `@axiom/web` production build: passing

These checks establish software behavior for the exercised paths. They do not establish formal correctness of arbitrary mathematics entered into the notebook.

## Deliberate exclusions

- `node_modules/`, `.next/`, Python caches, coverage, and build metadata
- local database state
- local environment files and development credentials
- generated output

No personal credentials or private keys are part of the curated repository surface.

## Known boundaries

- SymPy's LaTeX parser is an external parser with its own accepted grammar and limitations.
- the server-side serializer is MathJSON-like, not a complete MathJSON implementation.
- operation classification is heuristic.
- visualization routing currently favors graph and structural fallback modes.
- the database schema is present, but this release should be judged primarily on the notebook and math-service implementation rather than deployment hardening.


## Post-curation hardening

After the initial validation snapshot above, the public source received additional changes that are intentionally **not** back-labelled as part of the original 5/5 run:

- endpoint coverage was expanded around parse failure, assumptions, diff ambiguity, visualization fallback, and response isolation;
- client-supplied canonical `srepr` reconstruction was moved from string sympification to a bounded AST whitelist;
- hostile import/attribute/call payloads are retained as regression cases and are expected to fail closed;
- list-valued response defaults use explicit factories.

The historical validation numbers above remain historical facts. Re-run the current suite from a clean checkout to establish the state of the current commit.
