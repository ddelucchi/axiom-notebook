# Axiom Notebook

A math-native interactive notebook for derivations.

The thesis: derivation-state tracking plus synchronized visualization changes
how people think about math. Math should never live in a document only as
rendered text. Every math block stores **four synchronized forms**:

1. raw LaTeX (what the author typed),
2. canonical MathJSON (client-side, via MathLive Compute Engine),
3. server-side canonical symbolic form (SymPy `srepr`),
4. a derived visualization state (graph adapter, structure adapter, …).

This repository is the Phase-0 / Phase-1 scaffold of that idea: an end-to-end
vertical slice from `<math-field>` to `/math/parse` to a routed visualization
panel, with the document model and adapter interfaces already in place for
Phase 2+ derivation diffing and Phase 3+ domain adapters (linear algebra,
ODE, vector calc, GR, QM).

---

## Stack

| Layer            | Choice                                              |
| ---------------- | --------------------------------------------------- |
| Web shell        | Next.js 15 (App Router) + React 19 + TypeScript     |
| Block editor     | Custom block model: paragraph, heading, math, draw, divider |
| Math input       | MathLive `<math-field>` (Compute Engine + MathJSON) |
| Drawing          | `perfect-freehand` strokes on SVG, mouse / pen / touch |
| Local persistence| IndexedDB via `idb-keyval`                          |
| Styling          | Tailwind CSS, Source Serif 4 + Inter + JetBrains Mono |
| Math service     | FastAPI + SymPy (Python 3.12) — *optional*; UI works offline |
| Storage (server) | PostgreSQL with JSONB                               |
| Shared contracts | `@axiom/shared` (TypeScript types + zod schemas)    |
| Visualization v1 | Desmos GraphAdapter + StructureAdapter fallback     |

---

## Repository layout

```
apps/
  web/                  Next.js app — notebook UI, MathField, visualization panel
  math-service/         FastAPI app — /math/parse, /math/diff, /math/visualize
packages/
  shared/               TypeScript types + zod schemas (the API contract)
infra/
  sql/0001_init.sql     Postgres schema (documents, math_blocks, derivations)
docker-compose.yml      Postgres dev container
PROMPT.md               Repo-initialization prompt (the brief that produced this)
```

Adapter packages (`packages/adapter-graph`, `packages/adapter-structure`,
`packages/adapter-linear-algebra`, `packages/adapter-ode`) are reserved
namespaces in the workspace config; they will be filled out as adapters are
extracted from `apps/web/src/features/visualization`.

---

## Local setup

Prerequisites: Node 20+, pnpm 9+. The Python math service and Postgres are
**optional** — the notebook runs entirely offline against IndexedDB.

```powershell
# Minimum: just the notebook
pnpm install
pnpm dev:web                 # http://localhost:3000

# Full stack (adds canonical-form parsing + diff + visualize routing)
cd apps/math-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
cd ..\..
pnpm db:up; pnpm db:migrate  # optional, for server-side persistence
pnpm dev:math                # http://localhost:8000
```

## Using the notebook

- Click the title bar to rename the page; `+` in the sidebar adds a new page.
- Type freely. **Press `/` on a blank line** to open the slash menu and insert
  a Heading 1/2/3, Math block, Drawing canvas, or Divider.
- **Math blocks** open a MathLive field; press `Enter` to commit. Each commit
  round-trips through `/math/parse` if the SymPy service is reachable;
  otherwise the block stays in `offline` state and is canonicalized later.
- **Drawing blocks** support pen / highlighter / eraser, five colors, four
  sizes, undo (`Cmd/Ctrl + Z` while focused), clear, and a drag-to-resize
  handle on hover.
- `Cmd/Ctrl + ↑/↓` reorders the current text block.
- Backspace on an empty block deletes it and focuses the previous one.
- **Export JSON** dumps the active page; everything is also persisted to
  IndexedDB on every edit.

---

## API contract (Phase 1)

All three endpoints are validated against zod schemas in
`packages/shared/src/schemas` on the client and Pydantic models in
`apps/math-service/app/schemas.py` on the server. The two must stay in sync;
that is the whole point of `@axiom/shared` existing.

### `POST /math/parse`

```json
{ "rawLatex": "x^2 + 2x + 1" }
```
returns
```json
{
  "canonicalMathJson": { "fn": ["Add", ...] },
  "normalizedLatex": "x^{2} + 2 x + 1",
  "parseStatus": "ok",
  "parseError": null,
  "domainTag": "algebra",
  "graphability": true,
  "serverCanonicalForm": {
    "srepr": "Add(Pow(Symbol('x'), Integer(2)), Mul(Integer(2), Symbol('x')), Integer(1))",
    "head": "Add",
    "freeSymbols": ["x"],
    "isRelational": false,
    "graphable": true
  }
}
```

### `POST /math/diff`

Pairwise structural diff on `srepr` trees. Returns added / removed /
transformed subtrees with `args`-index paths the editor can use to highlight
the changed subexpression in both lines.

### `POST /math/visualize`

Routes a canonical form to `graph` (Desmos-compatible payload) or falls back
to `structure` (expression tree). Never hallucinates a visualization for
forms it cannot handle.

---

## Engineering rules (do not regress)

- The source of truth is the **structured document**, not rendered text.
- Math metadata is **never silently dropped** — partial parses keep the raw
  LaTeX and a `partial`/`error` parse status.
- Adapters are **isolated from the editor core** via a `VisualizationAdapter`
  interface; UI code does not own math semantics.
- LLM calls **never gate correctness logic**. They may rank operation
  candidates in later phases; SymPy decides truth.
- When the parser is uncertain or an adapter cannot handle an expression,
  the UI says so. No fake confidence.

---

## Roadmap

- **Phase 0 (done in this scaffold):** monorepo, shared types, FastAPI
  skeleton, Next.js app shell, Postgres schema.
- **Phase 1 (done):** MathLive math block → `/math/parse` round-trip,
  canonical-form rendering, visualization routing.
- **Phase 2:** derivation groups, pairwise structural diff via `/math/diff`,
  changed-subtree highlighting, timeline view.
- **Phase 3:** Desmos-backed `GraphAdapter`, synchronized step playback,
  structure-view fallback.
- **Phase 4:** Tiptap/ProseMirror rich-text host, Yjs collaborative state,
  autosave, presence, export to LaTeX/Markdown/JSON.

See `PROMPT.md` for the full product brief.

