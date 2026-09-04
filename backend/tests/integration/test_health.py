from fastapi.testclient import TestClient


def test_health_ok_and_returns_request_id(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}
    assert response.headers["X-Request-ID"]


def test_unknown_route_uses_the_single_error_format(client: TestClient) -> None:
    body = client.get("/api/v1/no-existe").json()
    assert body["code"] == "NOT_FOUND"
    assert set(body) == {"code", "message", "details"}
