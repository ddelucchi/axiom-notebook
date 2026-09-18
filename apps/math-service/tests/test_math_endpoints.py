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

