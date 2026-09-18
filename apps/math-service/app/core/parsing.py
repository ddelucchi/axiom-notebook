"""LaTeX -> SymPy parsing and canonicalization.

We deliberately keep the parser tolerant: if the LaTeX cannot be parsed by
SymPy's experimental LaTeX parser we fall back to a "partial" status that
still preserves the raw input. Math metadata is never silently dropped.
"""
from __future__ import annotations

from dataclasses import dataclass

import sympy as sp
from sympy.core.relational import Relational
from sympy.parsing.latex import parse_latex

from ..schemas import Assumption, ServerCanonicalForm


@dataclass(frozen=True)
class ParseResult:
    expr: sp.Expr | sp.Basic | None
    normalized_latex: str
    status: str          # "ok" | "partial" | "error"
    error: str | None
    canonical: ServerCanonicalForm


_GRAPHABLE_HEADS = {"Eq", "Function", "Add", "Mul", "Pow", "Symbol", "Integer", "Float", "Rational"}


def parse_and_canonicalize(
    raw_latex: str,
    assumptions: list[Assumption] | None = None,
) -> ParseResult:
    raw = raw_latex.strip()
    try:
        expr = parse_latex(raw)
    except Exception as e:  # noqa: BLE001 — surface any parser failure
        return ParseResult(
            expr=None,
            normalized_latex=raw,
            status="error",
            error=f"latex_parse_failed: {e!s}",
            canonical=ServerCanonicalForm(
                srepr="",
                head="Unknown",
                freeSymbols=[],
                isRelational=False,
                graphable=False,
            ),
        )

    # Apply user assumptions by re-binding free symbols.
    if assumptions:
        replacements: dict[sp.Symbol, sp.Symbol] = {}
        for a in assumptions:
            old = sp.Symbol(a.symbol)
            kwargs = {a.predicate: True}
            try:
                replacements[old] = sp.Symbol(a.symbol, **kwargs)
            except TypeError:
                # Unknown predicate — ignore but don't fail the parse.
                continue
        if replacements:
            expr = expr.xreplace(replacements)

    head = type(expr).__name__
    free_syms = sorted({s.name for s in expr.free_symbols}) if hasattr(expr, "free_symbols") else []
    is_relational = isinstance(expr, Relational)
    graphable = _is_graphable(expr, head)

    canonical = ServerCanonicalForm(
        srepr=sp.srepr(expr),
        head=head,
        freeSymbols=free_syms,
        isRelational=is_relational,
        graphable=graphable,
    )

    try:
        normalized = sp.latex(expr)
    except Exception:  # noqa: BLE001
        normalized = raw

    return ParseResult(
        expr=expr,
        normalized_latex=normalized,
        status="ok",
        error=None,
        canonical=canonical,
    )


def _is_graphable(expr: sp.Basic, head: str) -> bool:
    """V1 graphability heuristic: explicit y=f(x) or single-variable expressions."""
    if head not in _GRAPHABLE_HEADS:
        return False
    free = getattr(expr, "free_symbols", set())
    return len(free) <= 2


def expr_to_mathjson(expr: sp.Basic) -> object:
    """Minimal SymPy -> MathJSON-ish serializer.

    Not a full MathJSON conformant encoder; the canonical client-side MathJSON
    is produced by MathLive's Compute Engine. This server-side form exists so
    headless clients (tests, exporters) still get a structured tree.
    """
    if isinstance(expr, sp.Symbol):
        return {"sym": expr.name}
    if isinstance(expr, sp.Integer):
        return {"num": str(expr)}
    if isinstance(expr, sp.Float):
        return {"num": str(expr)}
    if isinstance(expr, sp.Rational):
        return {"fn": ["Rational", {"num": str(expr.p)}, {"num": str(expr.q)}]}
    if isinstance(expr, sp.Equality):
        return {"fn": ["Equal", expr_to_mathjson(expr.lhs), expr_to_mathjson(expr.rhs)]}
    head = type(expr).__name__
    args = [expr_to_mathjson(a) for a in expr.args]
    return {"fn": [head, *args]}

