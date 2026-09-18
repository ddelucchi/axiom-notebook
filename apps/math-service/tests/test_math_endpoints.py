from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_parse_simple_polynomial():
    r = client.post("/math/parse", json={"rawLatex": "x^2 + 2x + 1"})
    assert r.status_code == 200
    body = r.json()
    assert body["parseStatus"] == "ok"
    assert body["serverCanonicalForm"]["graphable"] is True
    assert "x" in body["serverCanonicalForm"]["freeSymbols"]


def test_parse_equation():
    r = client.post("/math/parse", json={"rawLatex": "y = x^2"})
    assert r.status_code == 200
    body = r.json()
    assert body["serverCanonicalForm"]["isRelational"] is True


def test_diff_detects_expand():
    a = client.post("/math/parse", json={"rawLatex": "(x+1)^2"}).json()
    b = client.post("/math/parse", json={"rawLatex": "x^2 + 2x + 1"}).json()
    r = client.post(
        "/math/diff",
        json={
            "prevCanonical": a["serverCanonicalForm"],
            "nextCanonical": b["serverCanonicalForm"],
        },
    )
    assert r.status_code == 200
    kinds = [c["kind"] for c in r.json()["operationCandidates"]]
    assert "expand" in kinds or "simplify" in kinds


def test_visualize_graphable():
    parsed = client.post("/math/parse", json={"rawLatex": "x^2"}).json()
    r = client.post(
        "/math/visualize",
        json={
            "canonical": parsed["serverCanonicalForm"],
            "domainTag": "algebra",
        },
    )
    assert r.status_code == 200
    assert r.json()["state"]["adapterType"] == "graph"



def test_parse_failure_preserves_raw_input_and_reports_error():
    raw = r"\\frac{"
    r = client.post("/math/parse", json={"rawLatex": raw})
    assert r.status_code == 200
    body = r.json()
    assert body["parseStatus"] == "error"
    assert body["normalizedLatex"] == raw
    assert body["canonicalMathJson"] is None
    assert body["serverCanonicalForm"]["srepr"] == ""
    assert body["serverCanonicalForm"]["graphable"] is False
    assert body["parseError"]


def test_parse_assumption_rebinds_symbol_without_changing_name():
    r = client.post(
        "/math/parse",
        json={
            "rawLatex": "x^2",
            "assumptions": [{"symbol": "x", "predicate": "positive"}],
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["parseStatus"] == "ok"
    assert body["serverCanonicalForm"]["freeSymbols"] == ["x"]
    assert "positive=True" in body["serverCanonicalForm"]["srepr"]


def test_parse_unknown_assumption_predicate_does_not_destroy_expression():
    r = client.post(
        "/math/parse",
        json={
            "rawLatex": "x+1",
            "assumptions": [{"symbol": "x", "predicate": "definitely_not_a_sympy_assumption"}],
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["parseStatus"] == "ok"
    assert "x" in body["serverCanonicalForm"]["freeSymbols"]


def test_diff_identical_expression_has_no_false_transform():
    parsed = client.post("/math/parse", json={"rawLatex": "x^2 + 1"}).json()
    r = client.post(
        "/math/diff",
        json={
            "prevCanonical": parsed["serverCanonicalForm"],
            "nextCanonical": parsed["serverCanonicalForm"],
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["changeSet"]["transformedSubtrees"] == []
    assert body["changeSet"]["unchangedContext"]
    assert body["operationCandidates"][0]["kind"] == "unknown"


def test_diff_detects_equation_side_swap_as_rearrangement():
    a = client.post("/math/parse", json={"rawLatex": "x = y"}).json()
    b = client.post("/math/parse", json={"rawLatex": "y = x"}).json()
    r = client.post(
        "/math/diff",
        json={
            "prevCanonical": a["serverCanonicalForm"],
            "nextCanonical": b["serverCanonicalForm"],
        },
    )
    assert r.status_code == 200
    kinds = [c["kind"] for c in r.json()["operationCandidates"]]
    assert "rearrange" in kinds


def test_diff_single_leaf_change_is_only_a_low_confidence_substitution_candidate():
    a = client.post("/math/parse", json={"rawLatex": "x+1"}).json()
    b = client.post("/math/parse", json={"rawLatex": "x+2"}).json()
    r = client.post(
        "/math/diff",
        json={
            "prevCanonical": a["serverCanonicalForm"],
            "nextCanonical": b["serverCanonicalForm"],
        },
    )
    assert r.status_code == 200
    body = r.json()
    candidates = {c["kind"]: c["confidence"] for c in body["operationCandidates"]}
    assert candidates.get("substitute") == 0.6
    assert body["confidence"] <= 0.6


def test_visualize_non_graphable_expression_falls_back_to_structure():
    canonical = {
        "srepr": "Integral(Symbol('x'), Symbol('x'))",
        "head": "Integral",
        "freeSymbols": ["x"],
        "isRelational": False,
        "graphable": False,
    }
    r = client.post(
        "/math/visualize",
        json={"canonical": canonical, "domainTag": "calculus"},
    )
    assert r.status_code == 200
    state = r.json()["state"]
    assert state["adapterType"] == "structure"
    assert state["fallbackMode"] is True
    assert state["confidence"] == 0.3


def test_visualization_response_collections_are_not_shared():
    parsed = client.post("/math/parse", json={"rawLatex": "x^2"}).json()
    payload = {
        "canonical": parsed["serverCanonicalForm"],
        "domainTag": "algebra",
    }
    first = client.post("/math/visualize", json=payload).json()["state"]
    second = client.post("/math/visualize", json=payload).json()["state"]
    first["annotations"].append({"kind": "client-only", "payload": {}})
    assert second["annotations"] == []


def test_diff_rejects_hostile_srepr_without_execution(tmp_path):
    marker = tmp_path / "pwned"
    hostile = (
        "__import__('pathlib').Path("
        + repr(str(marker))
        + ").write_text('owned')"
    )
    canonical = {
        "srepr": hostile,
        "head": "Symbol",
        "freeSymbols": [],
        "isRelational": False,
        "graphable": False,
    }
    r = client.post(
        "/math/diff",
        json={"prevCanonical": canonical, "nextCanonical": canonical},
    )
    assert r.status_code == 200
    assert not marker.exists()
    body = r.json()
    assert body["operationCandidates"][0]["kind"] == "unknown"


def test_visualize_rejects_hostile_srepr_without_execution(tmp_path):
    marker = tmp_path / "pwned_visualize"
    hostile = (
        "__import__('pathlib').Path("
        + repr(str(marker))
        + ").write_text('owned')"
    )
    canonical = {
        "srepr": hostile,
        "head": "Symbol",
        "freeSymbols": [],
        "isRelational": False,
        "graphable": True,
    }
    r = client.post(
        "/math/visualize",
        json={"canonical": canonical, "domainTag": "algebra"},
    )
    assert r.status_code == 200
    assert not marker.exists()
    state = r.json()["state"]
    assert state["adapterType"] == "structure"
    assert state["fallbackMode"] is True


def test_safe_srepr_accepts_undefined_symbolic_function():
    canonical = {
        "srepr": "Function('f')(Symbol('x'))",
        "head": "f",
        "freeSymbols": ["x"],
        "isRelational": False,
        "graphable": True,
    }
    r = client.post(
        "/math/visualize",
        json={"canonical": canonical, "domainTag": "algebra"},
    )
    assert r.status_code == 200
    state = r.json()["state"]
    assert state["adapterType"] == "graph"


def test_safe_srepr_rejects_attribute_access():
    canonical = {
        "srepr": "Symbol.__subclasses__()",
        "head": "Symbol",
        "freeSymbols": [],
        "isRelational": False,
        "graphable": False,
    }
    r = client.post(
        "/math/diff",
        json={"prevCanonical": canonical, "nextCanonical": canonical},
    )
    assert r.status_code == 200
    assert r.json()["operationCandidates"][0]["kind"] == "unknown"
