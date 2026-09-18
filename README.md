# Axiom Notebook

Axiom Notebook is a math-native derivation workspace that keeps editable notation, symbolic structure, derivation history, and visualization state connected without pretending that parsing or operation classification is a formal proof.

## Status

The current repository is a working research prototype with a verified web build and a tested symbolic-math service.

Implemented today:

- Next.js/React notebook interface with typed block state
- MathLive-based mathematical input
- raw LaTeX preservation alongside structured mathematical representations
- FastAPI/SymPy parsing and canonicalization
- structural diffs between derivation steps
- rule-based operation candidates such as expand, factor, simplify, differentiate, integrate, substitute, and rearrange
- graph/structure visualization routing
- shared TypeScript/Zod contracts
- PostgreSQL schema for documents, blocks, derivations, and visualization state
- endpoint tests for health, parsing, structural-diff classification, and visualization routing

The project does **not** claim to be a formal theorem prover, a complete MathJSON implementation, or a semantic verifier for arbitrary derivations.

## Architecture

```text
apps/
  web/            Next.js + React notebook UI
  math-service/   FastAPI + SymPy symbolic service
packages/
  shared/         shared TypeScript types and Zod contracts
infra/
  sql/            initial relational schema
```

The client may carry MathLive/Compute Engine structures. The server uses SymPy's `srepr` as its canonical symbolic representation and exposes a small MathJSON-like serializer for headless clients. That serializer is intentionally not advertised as full MathJSON conformance.

## Verification

The curated release has been exercised with:

- 5/5 math-service endpoint tests passing
- Python service compilation
- shared-package TypeScript type checking
- web-app TypeScript type checking
- a successful Next.js production build

Hosted CI mirrors these clone-local checks. GitHub Actions execution may still depend on account/repository runner availability, so the commands below remain the authoritative reproducible path.

## Quick start

Requirements:

- Node.js 20+
- pnpm 9
- Python 3.12+

Install JavaScript dependencies:

```bash
corepack enable
corepack prepare pnpm@9.0.0 --activate
pnpm install --frozen-lockfile
```

Create the math-service environment:

```bash
cd apps/math-service
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -e ".[dev]"
pytest -q
cd ../..
```

On Windows, activate with `.venv\Scripts\activate`.

Verify the TypeScript surfaces:

```bash
pnpm --filter @axiom/shared typecheck
pnpm --filter @axiom/web typecheck
pnpm --filter @axiom/web build
```

Run the two development services in separate terminals:

```bash
pnpm dev:math
pnpm dev:web
```

The web app runs on port 3000 and the math service on port 8000 by default.

## Trust boundary

Axiom distinguishes representation from proof.

- LaTeX parsing can fail or be ambiguous.
- SymPy equivalence checks inherit SymPy's semantics and assumptions.
- operation labels are heuristic candidates with confidences, not certified derivation rules.
- graphability is a routing heuristic.
- structural equality is not mathematical proof of an informal argument.
- user input is preserved when parsing cannot establish structure.

These boundaries are part of the product design.

## Data and secrets

Generated build output, caches, virtual environments, local database state, and environment files are excluded from version control. Do not commit database passwords, API keys, or local credentials.

## Release audit

See [CODEX_AUDIT.md](CODEX_AUDIT.md) for the curated source boundary and observed verification state.

## License

Source is publicly viewable for portfolio and technical evaluation. See [LICENSE](LICENSE).
