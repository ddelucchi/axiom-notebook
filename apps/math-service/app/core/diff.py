"""Structural diff between two SymPy srepr trees.

We work on the reconstructed expressions rather than text so paths refer to
the actual `args` indices that the editor will use to highlight subtrees.
"""
from __future__ import annotations

import sympy as sp

from ..schemas import (
    ChangeSet,
    OperationCandidate,
    OperationKind,
    SubtreeRef,
    TransformRef,
)


def _from_srepr(s: str) -> sp.Basic:
    # `srepr` output is valid Python referring to sympy classes.
    return sp.sympify(s, locals=sp.__dict__)  # type: ignore[arg-type]


def diff_canonical(prev_srepr: str, next_srepr: str) -> tuple[ChangeSet, list[OperationCandidate], float]:
    try:
        a = _from_srepr(prev_srepr)
        b = _from_srepr(next_srepr)
    except Exception:  # noqa: BLE001 — fall back to coarse text-level diff
        return _empty_changeset(), [_op("unknown", 0.0, "srepr_eval_failed")], 0.0

    added: list[SubtreeRef] = []
    removed: list[SubtreeRef] = []
    transformed: list[TransformRef] = []
    unchanged: list[SubtreeRef] = []

    _walk(a, b, [], added, removed, transformed, unchanged)

    candidates = _classify(a, b, transformed)
    confidence = max((c.confidence for c in candidates), default=0.0)

    return (
        ChangeSet(
            addedSubtrees=added,
            removedSubtrees=removed,
            transformedSubtrees=transformed,
            unchangedContext=unchanged,
        ),
        candidates,
        confidence,
    )


def _walk(
    a: sp.Basic,
    b: sp.Basic,
    path: list[int],
    added: list[SubtreeRef],
    removed: list[SubtreeRef],
    transformed: list[TransformRef],
    unchanged: list[SubtreeRef],
) -> None:
    if a == b:
        unchanged.append(SubtreeRef(path=list(path), srepr=sp.srepr(a)))
        return

    a_args = getattr(a, "args", ())
    b_args = getattr(b, "args", ())

    # If heads or arity differ we record a single transform at this path.
    if type(a) is not type(b) or len(a_args) != len(b_args):
        transformed.append(
            TransformRef(path=list(path), before=sp.srepr(a), after=sp.srepr(b)),
        )
        return

    if not a_args:
        # Leaf change (e.g. Integer(2) -> Integer(3)).
        transformed.append(
            TransformRef(path=list(path), before=sp.srepr(a), after=sp.srepr(b)),
        )
        return

    for i, (ca, cb) in enumerate(zip(a_args, b_args, strict=True)):
        _walk(ca, cb, [*path, i], added, removed, transformed, unchanged)


def _classify(
    a: sp.Basic,
    b: sp.Basic,
    transformed: list[TransformRef],
) -> list[OperationCandidate]:
    """Rule-based first-pass classification of the change."""
    cands: list[OperationCandidate] = []
    cands.extend(_classify_equivalent_rewrite(a, b))
    cands.extend(_classify_calculus(a, b))
    cands.extend(_classify_substitution(transformed))
    cands.extend(_classify_rearrangement(a, b))

    if not cands:
        cands.append(_op("unknown", 0.1))

    return _dedupe_candidates(cands)


def _classify_equivalent_rewrite(a: sp.Basic, b: sp.Basic) -> list[OperationCandidate]:
    try:
        if sp.simplify(a - b) != 0 or a == b:
            return []
        if sp.expand(a) == b:
            return [_op("expand", 0.85)]
        if sp.factor(a) == b:
            return [_op("factor", 0.85)]
        if sp.simplify(b) == sp.simplify(a):
            return [_op("simplify", 0.7)]
    except Exception:  # noqa: BLE001
        return []
    return []


def _classify_calculus(a: sp.Basic, b: sp.Basic) -> list[OperationCandidate]:
    free = list(getattr(a, "free_symbols", set()) | getattr(b, "free_symbols", set()))
    if len(free) != 1:
        return []

    x = free[0]
    cands: list[OperationCandidate] = []
    try:
        if sp.diff(a, x) == b:
            cands.append(_op("differentiate", 0.9, f"d/d{x.name}"))
        if sp.integrate(a, x) == b:
            cands.append(_op("integrate", 0.85, f"∫·d{x.name}"))
    except Exception:  # noqa: BLE001
        return []
    return cands


def _classify_substitution(transformed: list[TransformRef]) -> list[OperationCandidate]:
    if len(transformed) == 1:
        return [_op("substitute", 0.6, "single-leaf change")]
    return []


def _classify_rearrangement(a: sp.Basic, b: sp.Basic) -> list[OperationCandidate]:
    if not isinstance(a, sp.Equality) or not isinstance(b, sp.Equality):
        return []

    same_sides = {a.lhs, a.rhs} == {b.lhs, b.rhs}
    try:
        equivalent_delta = sp.simplify((a.lhs - a.rhs) - (b.lhs - b.rhs)) == 0
    except Exception:  # noqa: BLE001
        equivalent_delta = False

    if same_sides or equivalent_delta:
        return [_op("rearrange", 0.75)]
    return []


def _dedupe_candidates(cands: list[OperationCandidate]) -> list[OperationCandidate]:
    best: dict[str, OperationCandidate] = {}
    for cand in cands:
        if cand.kind not in best or cand.confidence > best[cand.kind].confidence:
            best[cand.kind] = cand
    return sorted(best.values(), key=lambda cand: cand.confidence, reverse=True)


def _op(kind: OperationKind, conf: float, detail: str | None = None) -> OperationCandidate:
    return OperationCandidate(kind=kind, confidence=conf, detail=detail)


def _empty_changeset() -> ChangeSet:
    return ChangeSet(
        addedSubtrees=[],
        removedSubtrees=[],
        transformedSubtrees=[],
        unchangedContext=[],
    )

