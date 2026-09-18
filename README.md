# Axiom Notebook

A math-native interactive notebook for derivations. The project stores raw LaTeX alongside canonical MathJSON and server-side SymPy structure, tracks derivation steps and structural changes, and routes canonical expressions to synchronized visualization adapters.

## Architecture

- `apps/web/`: Next.js/React/TypeScript notebook UI with MathLive input, block rendering, drawing, sidebar, Zustand document state, and visualization client.
- `apps/math-service/`: FastAPI/SymPy service for LaTeX parsing/canonicalization, structural diffs, operation classification, and graph/structure visualization payloads.
- `packages/shared/`: shared TypeScript types and Zod contracts mirrored by the Pydantic service models.
- `infra/sql/`: initial PostgreSQL schema for documents, math blocks, derivations, and visualization state.
- `PROMPT.md`: the project’s architecture/implementation brief.

The archive excludes `node_modules`, `.next`, TypeScript build metadata, Python caches, and local database/docker environment material. The original README is retained as `LOCAL_README.md`; see `CODEX_AUDIT.md` for the exact curation boundary and validation record.

## Local validation

The math-service test suite passed 5/5. Python service compilation passed, the shared package typechecked, and the Next.js production build completed successfully.