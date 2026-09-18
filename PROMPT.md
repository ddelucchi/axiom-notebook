# Repo-Initialization Prompt — Axiom Notebook

> Paste this into Copilot / Cursor at the root of an empty repository to
> regenerate the Phase 0 + Phase 1 scaffold. It is intentionally narrow:
> it produces a math-native vertical slice and **stops there**. Phase 2+
> work is described as future scope so the agent does not over-build.

---

## Mission

Generate a production-grade monorepo for **Axiom Notebook** — a math-native
interactive notebook for derivations. The seed product is the cleanest
possible derivation notebook: typed math, canonical symbolic storage, and a
synchronized visualization panel. Everything else (handwriting ingest,
collaborative lectures, GR/QM modules, theorem proving, AI tutoring) is
deferred and must remain *possible* without rewrites.

## Non-negotiable architecture

**Frontend** — Next.js 15 App Router, React 19, TypeScript, Tailwind CSS,
MathLive `<math-field>` for math input, Zustand for UI state only (never for
document truth). Tiptap/ProseMirror and Yjs are reserved for Phase 4 — leave
clean seams for them but do not wire them yet.

**Backend** — Python 3.12+, FastAPI, SymPy for parsing / canonicalization /
structural diff / rule-based classification, asyncpg for Postgres access,
Pydantic v2 for request/response models.

**Storage** — PostgreSQL 16 with JSONB columns for canonical math payloads,
visualization state, and document trees. Always store raw LaTeX, canonical
MathJSON, and the server-side SymPy `srepr` separately. Never store math as
rendered HTML alone.

**Shared contracts** — A `@axiom/shared` workspace package that exports
TypeScript types and zod schemas mirrored 1:1 by Pydantic models in the math
service. The web client validates every response at the boundary.

## Deliverables for this prompt

Generate exactly these artifacts:

1. **Monorepo root**
   - `package.json` with pnpm workspaces over `apps/*` and `packages/*`
   - `pnpm-workspace.yaml`
   - `tsconfig.base.json` with strict, `noUncheckedIndexedAccess`,
     `exactOptionalPropertyTypes`
   - `.gitignore`, `.env.example`, `docker-compose.yml` (Postgres 16-alpine)

2. **`packages/shared`**
   - TypeScript types for `Document`, `MathBlock`, `DerivationGroup`,
     `DerivationStep`, `ChangeSet`, `OperationCandidate`,
     `VisualizationState`, plus the three API request/response pairs
     (`MathParse*`, `MathDiff*`, `MathVisualize*`).
   - zod schemas for the same shapes, used by the web client at the
     network boundary.

3. **`apps/math-service`** (FastAPI)
   - `pyproject.toml` (Python 3.12, fastapi, sympy, antlr4-python3-runtime
     pinned to 4.11 for SymPy's LaTeX parser, asyncpg, pydantic v2).
   - `app/main.py` registering CORS for `http://localhost:3000` and a
     `GET /health` endpoint.
   - `app/schemas.py` Pydantic models that mirror `@axiom/shared`.
   - `app/core/parsing.py` — `parse_and_canonicalize(rawLatex, assumptions)`
     using `sympy.parsing.latex.parse_latex`, returning a `ServerCanonicalForm`
     with `srepr`, `head`, `freeSymbols`, `isRelational`, `graphable`. Tolerant
     of parse failures: returns `parseStatus: "error"` with the raw LaTeX
     preserved.
   - `app/core/diff.py` — `diff_canonical(prev_srepr, next_srepr)` walking
     both trees in lockstep along `args` indices, producing `addedSubtrees`,
     `removedSubtrees`, `transformedSubtrees`, `unchangedContext`. Includes
     a rule-based classifier that proposes
     `{simplify, expand, factor, substitute, differentiate, integrate, rearrange}`
     candidates with confidence scores.
   - `app/core/visualization.py` — routes graphable canonical forms to a
     Desmos-compatible payload (`adapterType: "graph"`); falls back to
     `adapterType: "structure"` with `fallbackMode: true`. Never fabricates.
   - `app/routes/parse.py`, `diff.py`, `visualize.py`.
   - `tests/test_math_endpoints.py` covering health, simple polynomial parse,
     equation parse, expand-detection diff, graphable visualize.

4. **`apps/web`** (Next.js)
   - App Router project under `src/app` with `globals.css` (Tailwind),
     `layout.tsx`, `page.tsx`.
   - `next.config.mjs` with a `/api/math/*` rewrite to
     `${MATH_SERVICE_URL}/math/*`.
   - `src/lib/mathClient.ts` — typed client using zod schemas from
     `@axiom/shared` to validate every response.
   - `src/features/math/MathField.tsx` — thin client-only wrapper over
     MathLive's `<math-field>` custom element, committing on blur / Enter.
   - `src/features/math/MathBlock.tsx` — single math block UI: MathField +
     status pill + canonical-form metadata grid (`domain`, `head`,
     `free symbols`, `graphable`, `srepr`).
   - `src/features/visualization/VisualizationPanel.tsx` — routes between a
     Desmos placeholder (when `graphable`) and a structure view (`srepr`
     pre-block) when not.
   - `src/features/editor/NotebookShell.tsx` — two-pane layout, holds the
     selected math block's parsed state and feeds it into the visualization
     panel.
   - Tailwind config with a serif/sans/mono triple and an `ink` greyscale.

5. **`infra/sql/0001_init.sql`** — schema for `documents`, `math_blocks`,
   `derivation_groups`, `derivation_steps`, with JSONB columns for
   `canonical_math_json`, `server_canonical_form`, `change_set`,
   `operation_candidates`, `visualization_state`. Includes an
   `updated_at` trigger and GIN indexes on canonical JSONB.

6. **`README.md`** documenting the stack, layout, local setup
   (Postgres via docker compose, math service venv, `pnpm dev:web`,
   `pnpm dev:math`), the API contract, the engineering rules
   (source of truth = structured document; never drop math metadata; LLMs
   never gate correctness logic), and the four-phase roadmap.

## Hard constraints

- **TypeScript end-to-end on the product shell, Python only inside the math
  service.** Do not introduce a Node-side symbolic engine.
- **Adapters are isolated.** Visualization adapters implement
  `canHandle / buildState / updateState / renderHints`. Editor code never
  imports a specific adapter directly.
- **No vendor lock-in in the document model.** MathJSON, `srepr`, and raw
  LaTeX all coexist. A future export must be able to reconstruct any one
  from the others.
- **No LLM calls in the correctness path.** SymPy decides truth.
- **No fake visualizations.** If an adapter cannot handle an expression,
  the UI shows the structure view and says so.
- **Performance budget:** `/math/parse` round-trip under 150 ms for common
  classroom expressions; the editor must remain responsive at 1 000+ blocks
  (this constrains how derivation diffing is scheduled in Phase 2).

## What NOT to build in this pass

- No Tiptap/Yjs wiring yet (leave seams).
- No handwriting ingest.
- No GR / QM / tensor / quantum adapters.
- No theorem prover.
- No AI chat surface.
- No mobile app.
- No marketplace, plugins, or third-party integrations.

## Acceptance criteria

- `pnpm install` succeeds at the root.
- `pnpm dev:math` boots FastAPI on `:8000` and `GET /health` returns
  `{"status":"ok"}`.
- `pnpm dev:web` boots Next.js on `:3000`, renders the two-pane shell, and
  a typed expression like `x^2 + 2x + 1` round-trips through `/math/parse`,
  populating the canonical-form grid and switching the visualization panel
  to the graph adapter mount point.
- `pytest -q` inside `apps/math-service` passes.
- `psql $DATABASE_URL -f infra/sql/0001_init.sql` applies cleanly.
- `pnpm typecheck` passes across all workspaces.

