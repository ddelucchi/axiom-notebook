"""Axiom Notebook math service — FastAPI entrypoint."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import diff as diff_routes
from .routes import parse as parse_routes
from .routes import visualize as visualize_routes

MATH_PREFIX = "/math"

app = FastAPI(
    title="Axiom Math Service",
    version="0.0.1",
    description=(
        "Symbolic math service for Axiom Notebook. Parses LaTeX into a "
        "canonical SymPy form, computes structural diffs between derivation "
        "steps, and routes graphable expressions to visualization adapters."
    ),
)

# CORS — the Next.js app talks directly to this service in development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "axiom-math-service"}


app.include_router(parse_routes.router, prefix=MATH_PREFIX, tags=["math"])
app.include_router(diff_routes.router, prefix=MATH_PREFIX, tags=["math"])
app.include_router(visualize_routes.router, prefix=MATH_PREFIX, tags=["math"])

