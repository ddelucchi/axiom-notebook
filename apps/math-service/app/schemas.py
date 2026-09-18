"""Pydantic schemas — must stay in sync with packages/shared/src/schemas."""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

DomainTag = Literal[
    "unknown",
    "algebra",
    "calculus",
    "linear_algebra",
    "ode",
    "vector_calc",
    "probability",
    "physics",
]
ParseStatus = Literal["pending", "ok", "partial", "error"]
DisplayMode = Literal["inline", "block", "derivation"]
AdapterType = Literal[
    "graph",
    "structure",
    "linear_algebra",
    "ode",
    "vector_field",
    "tensor",
    "quantum",
]
OperationKind = Literal[
    "simplify",
    "expand",
    "factor",
    "substitute",
    "differentiate",
    "integrate",
    "solve",
    "rearrange",
    "isolate_variable",
    "apply_identity",
    "unknown",
]


class Assumption(BaseModel):
    symbol: str
    predicate: str


class ServerCanonicalForm(BaseModel):
    srepr: str
    head: str
    freeSymbols: list[str]
    isRelational: bool
    graphable: bool


class VisualizationHint(BaseModel):
    adapterType: Literal["graph", "structure", "linear_algebra", "ode"] | None = None
    variables: list[str] | None = None
    domain: dict[str, float] | None = None


# ---------- /math/parse ----------
class MathParseRequest(BaseModel):
    rawLatex: str = Field(min_length=1, max_length=10_000)
    assumptions: list[Assumption] | None = None


class MathParseResponse(BaseModel):
    canonicalMathJson: Any
    normalizedLatex: str
    parseStatus: ParseStatus
    parseError: str | None
    domainTag: DomainTag
    graphability: bool
    serverCanonicalForm: ServerCanonicalForm


# ---------- /math/diff ----------
class SubtreeRef(BaseModel):
    path: list[int]
    srepr: str


class TransformRef(BaseModel):
    path: list[int]
    before: str
    after: str


class ChangeSet(BaseModel):
    addedSubtrees: list[SubtreeRef]
    removedSubtrees: list[SubtreeRef]
    transformedSubtrees: list[TransformRef]
    unchangedContext: list[SubtreeRef]


class OperationCandidate(BaseModel):
    kind: OperationKind
    confidence: float
    detail: str | None = None


class MathDiffRequest(BaseModel):
    prevCanonical: ServerCanonicalForm
    nextCanonical: ServerCanonicalForm


class MathDiffResponse(BaseModel):
    changeSet: ChangeSet
    operationCandidates: list[OperationCandidate]
    confidence: float


# ---------- /math/visualize ----------
class Viewport(BaseModel):
    xMin: float
    xMax: float
    yMin: float
    yMax: float


class Annotation(BaseModel):
    kind: str
    payload: dict[str, Any]


class Highlight(BaseModel):
    path: list[int]
    color: str | None = None
    label: str | None = None


class VisualizationState(BaseModel):
    adapterType: AdapterType
    adapterPayload: dict[str, Any]
    viewport: Viewport | None = None
    annotations: list[Annotation] = []
    highlights: list[Highlight] = []
    fallbackMode: bool | None = None
    confidence: float


class MathVisualizeRequest(BaseModel):
    canonical: ServerCanonicalForm
    domainTag: DomainTag
    visualizationHint: VisualizationHint | None = None


class MathVisualizeResponse(BaseModel):
    state: VisualizationState

