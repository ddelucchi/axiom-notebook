"""Visualization adapter routing.

V1 only ships the GraphAdapter (Desmos-compatible payload) and a
StructureAdapter fallback. Both are pure functions of the canonical form;
the actual rendering happens in the web app.
"""
from __future__ import annotations

import sympy as sp

from ..schemas import (
    DomainTag,
    ServerCanonicalForm,
    VisualizationHint,
    VisualizationState,
)


def visualize(
    canonical: ServerCanonicalForm,
    _domain: DomainTag,
    hint: VisualizationHint | None,
) -> VisualizationState:
    if canonical.graphable and canonical.srepr:
        try:
            payload = _graph_payload(canonical, hint)
            return VisualizationState(
                adapterType="graph",
                adapterPayload=payload,
                viewport=None,
                annotations=[],
                highlights=[],
                fallbackMode=False,
                confidence=0.8,
            )
        except Exception:  # noqa: BLE001 — drop to structure fallback
            pass

    return VisualizationState(
        adapterType="structure",
        adapterPayload={"srepr": canonical.srepr, "head": canonical.head},
        annotations=[],
        highlights=[],
        fallbackMode=True,
        confidence=0.3,
    )


def _graph_payload(canonical: ServerCanonicalForm, hint: VisualizationHint | None) -> dict[str, object]:
    expr = sp.sympify(canonical.srepr, locals=sp.__dict__)  # type: ignore[arg-type]
    # Desmos accepts LaTeX expressions directly via expressions[].latex.
    latex = sp.latex(expr)
    variables = canonical.freeSymbols
    if hint and hint.variables:
        variables = hint.variables
    return {
        "engine": "desmos",
        "expressions": [{"id": "main", "latex": latex}],
        "variables": variables,
    }

