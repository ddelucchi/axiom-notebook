"""Safe reconstruction of the limited SymPy srepr surface used by Axiom.

SymPy string sympification is intentionally not used here because canonical
forms arrive from the client and string evaluation is not a security boundary.
This module parses Python syntax with ast and evaluates only a small, explicit
constructor vocabulary.

The goal is not to support every possible SymPy object. Unsupported forms fail
closed and callers fall back to coarse structural behavior.
"""
from __future__ import annotations

import ast
from typing import Any, Callable

import sympy as sp

MAX_SREPR_CHARS = 20_000
MAX_AST_NODES = 2_000
MAX_DEPTH = 64


_ALLOWED_CALLS: dict[str, Callable[..., Any]] = {
    "Symbol": sp.Symbol,
    "Integer": sp.Integer,
    "Float": sp.Float,
    "Rational": sp.Rational,
    "Add": sp.Add,
    "Mul": sp.Mul,
    "Pow": sp.Pow,
    "Equality": sp.Eq,
    "Unequality": sp.Ne,
    "StrictGreaterThan": sp.StrictGreaterThan,
    "StrictLessThan": sp.StrictLessThan,
    "GreaterThan": sp.GreaterThan,
    "LessThan": sp.LessThan,
    "And": sp.And,
    "Or": sp.Or,
    "Not": sp.Not,
    "Derivative": sp.Derivative,
    "Integral": sp.Integral,
    "Limit": sp.Limit,
    "Sum": sp.Sum,
    "Product": sp.Product,
    "sin": sp.sin,
    "cos": sp.cos,
    "tan": sp.tan,
    "asin": sp.asin,
    "acos": sp.acos,
    "atan": sp.atan,
    "atan2": sp.atan2,
    "sinh": sp.sinh,
    "cosh": sp.cosh,
    "tanh": sp.tanh,
    "exp": sp.exp,
    "log": sp.log,
    "Abs": sp.Abs,
    "sign": sp.sign,
    "floor": sp.floor,
    "ceiling": sp.ceiling,
    "factorial": sp.factorial,
    "gamma": sp.gamma,
    "Tuple": sp.Tuple,
    "FiniteSet": sp.FiniteSet,
    "ImmutableDenseMatrix": sp.ImmutableDenseMatrix,
    "MutableDenseMatrix": sp.MutableDenseMatrix,
    "MatrixSymbol": sp.MatrixSymbol,
    "Function": sp.Function,
}

_ALLOWED_NAMES: dict[str, Any] = {
    "pi": sp.pi,
    "E": sp.E,
    "I": sp.I,
    "oo": sp.oo,
    "zoo": sp.zoo,
    "nan": sp.nan,
    "true": sp.true,
    "false": sp.false,
    "True": True,
    "False": False,
    "None": None,
}


class UnsafeSrepr(ValueError):
    """Canonical expression text is outside the approved grammar."""


def safe_from_srepr(source: str) -> sp.Basic:
    if not isinstance(source, str) or not source.strip():
        raise UnsafeSrepr("empty canonical expression")
    if len(source) > MAX_SREPR_CHARS:
        raise UnsafeSrepr("canonical expression exceeds size limit")

    try:
        tree = ast.parse(source, mode="eval")
    except SyntaxError as exc:
        raise UnsafeSrepr("invalid canonical-expression syntax") from exc

    if sum(1 for _ in ast.walk(tree)) > MAX_AST_NODES:
        raise UnsafeSrepr("canonical expression exceeds AST node limit")

    value = _eval_node(tree.body, depth=0)
    if not isinstance(value, sp.Basic):
        raise UnsafeSrepr("canonical expression did not produce a SymPy object")
    return value


def _eval_node(node: ast.AST, *, depth: int) -> Any:
    if depth > MAX_DEPTH:
        raise UnsafeSrepr("canonical expression exceeds recursion limit")

    if isinstance(node, ast.Constant):
        if isinstance(node.value, (str, int, float, bool)) or node.value is None:
            return node.value
        raise UnsafeSrepr("unsupported literal type")

    if isinstance(node, ast.Name):
        if node.id in _ALLOWED_NAMES:
            return _ALLOWED_NAMES[node.id]
        raise UnsafeSrepr(f"bare name is not allowed: {node.id}")

    if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.USub, ast.UAdd)):
        value = _eval_node(node.operand, depth=depth + 1)
        if not isinstance(value, (int, float)):
            raise UnsafeSrepr("unary sign is allowed only on numeric literals")
        return -value if isinstance(node.op, ast.USub) else value

    if isinstance(node, ast.List):
        return [_eval_node(item, depth=depth + 1) for item in node.elts]

    if isinstance(node, ast.Tuple):
        return tuple(_eval_node(item, depth=depth + 1) for item in node.elts)

    if isinstance(node, ast.Call):
        func = _resolve_call_target(node.func, depth=depth + 1)
        args = [_eval_node(arg, depth=depth + 1) for arg in node.args]
        kwargs: dict[str, Any] = {}
        for keyword in node.keywords:
            if keyword.arg is None or keyword.arg.startswith("__"):
                raise UnsafeSrepr("expanded or dunder keyword arguments are forbidden")
            kwargs[keyword.arg] = _eval_node(keyword.value, depth=depth + 1)
        try:
            return func(*args, **kwargs)
        except Exception as exc:
            raise UnsafeSrepr("approved constructor rejected canonical arguments") from exc

    raise UnsafeSrepr(f"unsupported canonical syntax: {type(node).__name__}")


def _resolve_call_target(node: ast.AST, *, depth: int) -> Callable[..., Any]:
    if isinstance(node, ast.Name):
        target = _ALLOWED_CALLS.get(node.id)
        if target is None:
            raise UnsafeSrepr(f"constructor is not approved: {node.id}")
        return target

    if isinstance(node, ast.Call):
        if not isinstance(node.func, ast.Name) or node.func.id != "Function":
            raise UnsafeSrepr("nested call target is not an approved symbolic Function")
        target = _eval_node(node, depth=depth + 1)
        if isinstance(target, sp.FunctionClass):
            return target
        raise UnsafeSrepr("nested Function constructor did not produce a symbolic function")

    raise UnsafeSrepr("call target must be an approved constructor name")
