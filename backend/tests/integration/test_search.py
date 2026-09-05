"""Busqueda de texto de los listados.

Lo que se prueba no es que exista un `LIKE`, sino las tres cosas que se pueden romper solas:
que ignore tildes, que varias palabras acoten en vez de ampliar, y que la busqueda NO sea una
puerta trasera al scope del token.
"""

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Event, Exhibitor, Participant, User
from tests.conftest import auth_headers

MINE = "/api/v1/me/participants"
ALL = "/api/v1/participants"


def add(db: Session, event: Event, exhibitor: Exhibitor, **kwargs: str) -> Participant:
    row = Participant(
        event_id=event.id,
        exhibitor_id=exhibitor.id,
        identification_type="CEDULA",
        phone="0990000001",
        position="Personal de stand",
        category="Exhibitor",
        **kwargs,
    )
    db.add(row)
    db.flush()
    return row


def names(response_json: dict[str, object]) -> set[str]:
    items = response_json["items"]
    assert isinstance(items, list)
    return {item["first_name"] for item in items}


def test_search_ignores_accents_and_case(
    client: TestClient, db: Session, event: Event, exhibitor_a: Exhibitor, rep_a: User
) -> None:
    add(db, event, exhibitor_a, first_name="José", last_name="Muñoz", identification="1710000017")
    add(db, event, exhibitor_a, first_name="Ana", last_name="Torres", identification="0920000023")

    found = client.get(f"{MINE}?search=jose%20munoz", headers=auth_headers(rep_a))
    assert found.status_code == 200
    assert names(found.json()) == {"José"}


def test_search_words_narrow_instead_of_widening(
    client: TestClient, db: Session, event: Event, exhibitor_a: Exhibitor, rep_a: User
) -> None:
    """ "ana torres" no puede traer tambien a "Ana Vera": cada palabra debe estar presente."""
    add(db, event, exhibitor_a, first_name="Ana", last_name="Torres", identification="1710000017")
    add(db, event, exhibitor_a, first_name="Ana", last_name="Vera", identification="0920000023")

    assert names(client.get(f"{MINE}?search=ana", headers=auth_headers(rep_a)).json()) == {"Ana"}
    narrowed = client.get(f"{MINE}?search=ana%20vera", headers=auth_headers(rep_a)).json()
    assert narrowed["total"] == 1
    assert narrowed["items"][0]["last_name"] == "Vera"


def test_search_does_not_escape_the_token_scope(
    client: TestClient,
    db: Session,
    event: Event,
    exhibitor_a: Exhibitor,
    exhibitor_b: Exhibitor,
    rep_a: User,
) -> None:
    """El comodin `%` es texto, no un comodin, y el scope del token sigue mandando."""
    add(db, event, exhibitor_b, first_name="Ajeno", last_name="Vera", identification="0920000023")

    assert client.get(f"{MINE}?search=ajeno", headers=auth_headers(rep_a)).json()["total"] == 0
    assert client.get(f"{MINE}?search=%25", headers=auth_headers(rep_a)).json()["total"] == 0


def test_admin_search_reaches_the_exhibitor_columns(
    client: TestClient,
    db: Session,
    event: Event,
    exhibitor_a: Exhibitor,
    admin_user: User,
) -> None:
    """El listado global busca tambien por empresa: "cotopaxi" no esta en el participante."""
    add(db, event, exhibitor_a, first_name="Ana", last_name="Torres", identification="1710000017")

    found = client.get(f"{ALL}?search=cotopaxi", headers=auth_headers(admin_user))
    assert found.status_code == 200
    assert found.json()["total"] == 1


def test_exhibitor_search_by_tax_id(
    client: TestClient, exhibitor_a: Exhibitor, exhibitor_b: Exhibitor, admin_user: User
) -> None:
    found = client.get(
        f"/api/v1/exhibitors?search={exhibitor_b.tax_id}", headers=auth_headers(admin_user)
    )
    assert found.status_code == 200
    assert [item["id"] for item in found.json()["items"]] == [exhibitor_b.id]
