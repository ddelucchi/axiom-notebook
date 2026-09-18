"""POST /math/parse — LaTeX in, canonical form out."""
from __future__ import annotations

from fastapi import APIRouter

from ..core.parsing import expr_to_mathjson, parse_and_canonicalize
from ..schemas import MathParseRequest, MathParseResponse

router = APIRouter()


@router.post("/parse")
def parse_math(req: MathParseRequest) -> MathParseResponse:
    result = parse_and_canonicalize(req.rawLatex, req.assumptions)
    canonical_mathjson = expr_to_mathjson(result.expr) if result.expr is not None else None
    domain_tag = _infer_domain(result.canonical.head, result.canonical.freeSymbols)
    return MathParseResponse(
        canonicalMathJson=canonical_mathjson,
        normalizedLatex=result.normalized_latex,
        parseStatus=result.status,  # type: ignore[arg-type]
        parseError=result.error,
        domainTag=domain_tag,
        graphability=result.canonical.graphable,
        serverCanonicalForm=result.canonical,
    )


def _infer_domain(head: str, free_syms: list[str]) -> str:
    if head in {"Derivative", "Integral", "Limit"}:
        return "calculus"
    if head in {"MatMul", "MatAdd", "Determinant", "Transpose"}:
        return "linear_algebra"
    if head in {"Eq", "Add", "Mul", "Pow", "Symbol", "Integer", "Rational", "Float"}:
        return "algebra"
    if not free_syms:
        return "algebra"
    return "unknown"

