"""POST /math/visualize — route a canonical form to a visualization adapter."""
from __future__ import annotations

from fastapi import APIRouter

from ..core.visualization import visualize
from ..schemas import MathVisualizeRequest, MathVisualizeResponse

router = APIRouter()


@router.post("/visualize")
def visualize_math(req: MathVisualizeRequest) -> MathVisualizeResponse:
    state = visualize(req.canonical, req.domainTag, req.visualizationHint)
    return MathVisualizeResponse(state=state)

