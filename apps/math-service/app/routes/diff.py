"""POST /math/diff — pairwise structural diff between two canonical forms."""
from __future__ import annotations

from fastapi import APIRouter

from ..core.diff import diff_canonical
from ..schemas import MathDiffRequest, MathDiffResponse

router = APIRouter()


@router.post("/diff")
def diff_math(req: MathDiffRequest) -> MathDiffResponse:
    change_set, candidates, confidence = diff_canonical(
        req.prevCanonical.srepr,
        req.nextCanonical.srepr,
    )
    return MathDiffResponse(
        changeSet=change_set,
        operationCandidates=candidates,
        confidence=confidence,
    )

