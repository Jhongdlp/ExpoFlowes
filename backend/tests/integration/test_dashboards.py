"""Dashboards, listado global, reglas de solo lectura y reporte Excel (F6).

Lo que se prueba aqui no es que FastAPI responda 200, sino que los agregados CUADREN con lo
insertado y que sigan siendo derivados: si alguien congelara la cuota en una columna, el test
de recalculo por metraje lo delata.
"""

from io import BytesIO
from typing import Any

from fastapi.testclient import TestClient
from openpyxl import load_workbook
from sqlalchemy.orm import Session

from app.models import Exhibitor, Participant, User
from tests.conftest import auth_headers

ADMIN_DASHBOARD = "/api/v1/dashboard/admin"
MY_QUOTA = "/api/v1/me/quota"


def add_participant(
    db: Session, exhibitor: Exhibitor, identification: str, category: str, email: str | None
) -> None:
    db.add(
        Participant(
            event_id=exhibitor.event_id,
            exhibitor_id=exhibitor.id,
            first_name="Ana",
            last_name="Torres",
            identification=identification,
            identification_type="CEDULA",
            phone="0990000001",
            position="Personal de stand",
            category=category,
            email=email,
        )
    )
    db.flush()


# --- Dashboard del admin ----------------------------------------------------------------------


def test_admin_dashboard_aggregates(
    client: TestClient, db: Session, admin_user: User, exhibitor_a: Exhibitor
) -> None:
    """25 m2 -> Exhibitor 10, Guest 4, Service 6. Dos asignadas dejan ocho libres."""
    add_participant(db, exhibitor_a, "1710000017", "Exhibitor", "ana@demo.test")
    add_participant(db, exhibitor_a, "0920000023", "Exhibitor", None)

    body = client.get(ADMIN_DASHBOARD, headers=auth_headers(admin_user)).json()

    assert body["exhibitors_total"] == 1
    assert body["total_m2"] == 25
    assert body["participants_total"] == 2
    assert body["totals"]["Exhibitor"] == {"quota": 10, "assigned": 2, "available": 8}
    assert body["totals"]["Guest"] == {"quota": 4, "assigned": 0, "available": 4}
    assert body["totals"]["Service"] == {"quota": 6, "assigned": 0, "available": 6}
    assert body["event"]["year"] == 2026


def test_admin_dashboard_counts_stands_by_size_category(
    client: TestClient,
    db: Session,
    admin_user: User,
    exhibitor_a: Exhibitor,
    exhibitor_b: Exhibitor,
) -> None:
    """La categoria de stand es informativa, pero el dashboard la muestra agrupada."""
    exhibitor_b.requested_m2 = 8  # Pequeño
    db.flush()

    body = client.get(ADMIN_DASHBOARD, headers=auth_headers(admin_user)).json()
    by_label = {row["label"]: row["exhibitors"] for row in body["stand_categories"]}

    assert by_label == {"Pequeño": 1, "Mediano": 1, "Grande": 0}


def test_admin_dashboard_quota_follows_m2(
    client: TestClient, db: Session, admin_user: User, exhibitor_a: Exhibitor
) -> None:
    """Prueba que la cuota es derivada: cambiar el metraje cambia el agregado sin migrar nada."""
    before = client.get(ADMIN_DASHBOARD, headers=auth_headers(admin_user)).json()
    exhibitor_a.requested_m2 = 50
    db.flush()
    after = client.get(ADMIN_DASHBOARD, headers=auth_headers(admin_user)).json()

    assert before["totals"]["Exhibitor"]["quota"] == 10
    assert after["totals"]["Exhibitor"]["quota"] == 20


def test_admin_dashboard_is_admin_only(client: TestClient, rep_a: User) -> None:
    assert client.get(ADMIN_DASHBOARD, headers=auth_headers(rep_a)).status_code == 403


# --- Dashboard del representante --------------------------------------------------------------


def test_my_quota_breakdown(
    client: TestClient, db: Session, rep_a: User, exhibitor_a: Exhibitor
) -> None:
    add_participant(db, exhibitor_a, "1710000017", "Exhibitor", "ana@demo.test")
    add_participant(db, exhibitor_a, "0920000023", "Guest", None)

    body = client.get(MY_QUOTA, headers=auth_headers(rep_a)).json()

    assert body["exhibitor_id"] == exhibitor_a.id
    assert body["stand_category"] == "Mediano"
    assert body["quota"] == {"Exhibitor": 10, "Guest": 4, "Service": 6}
    assert body["assigned"] == {"Exhibitor": 1, "Guest": 1, "Service": 0}
    assert body["available"] == {"Exhibitor": 9, "Guest": 3, "Service": 6}
    assert body["participants_total"] == 2
    # Uno de los dos no tiene correo: no recibira la notificacion de credencial
    assert body["participants_without_email"] == 1


def test_my_quota_renders_zero_for_small_stands(
    client: TestClient, db: Session, rep_b: User, exhibitor_b: Exhibitor
) -> None:
    """Consecuencia aceptada de `floor`: 8 m2 da 0 credenciales Guest y 0 Service."""
    exhibitor_b.requested_m2 = 8
    db.flush()

    body = client.get(MY_QUOTA, headers=auth_headers(rep_b)).json()

    assert body["quota"]["Guest"] == 0
    assert body["available"]["Guest"] == 0


def test_my_quota_is_representative_only(client: TestClient, admin_user: User) -> None:
    assert client.get(MY_QUOTA, headers=auth_headers(admin_user)).status_code == 403


# --- Listado global de participantes (admin) --------------------------------------------------


def test_admin_lists_participants_of_every_stand(
    client: TestClient,
    db: Session,
    admin_user: User,
    exhibitor_a: Exhibitor,
    exhibitor_b: Exhibitor,
) -> None:
    add_participant(db, exhibitor_a, "1710000017", "Exhibitor", None)
    add_participant(db, exhibitor_b, "0920000023", "Exhibitor", None)

    body = client.get("/api/v1/participants", headers=auth_headers(admin_user)).json()

    assert body["total"] == 2
    assert {row["exhibitor_name"] for row in body["items"]} == {
        exhibitor_a.legal_name,
        exhibitor_b.legal_name,
    }


def test_admin_filters_participants_by_exhibitor(
    client: TestClient,
    db: Session,
    admin_user: User,
    exhibitor_a: Exhibitor,
    exhibitor_b: Exhibitor,
) -> None:
    add_participant(db, exhibitor_a, "1710000017", "Exhibitor", None)
    add_participant(db, exhibitor_b, "0920000023", "Exhibitor", None)

    body = client.get(
        f"/api/v1/participants?exhibitor_id={exhibitor_b.id}", headers=auth_headers(admin_user)
    ).json()

    assert body["total"] == 1
    assert body["items"][0]["exhibitor_id"] == exhibitor_b.id


def test_participants_listing_is_admin_only(client: TestClient, rep_a: User) -> None:
    assert client.get("/api/v1/participants", headers=auth_headers(rep_a)).status_code == 403


# --- Paginacion -------------------------------------------------------------------------------


def test_page_size_above_maximum_is_rejected(client: TestClient, admin_user: User) -> None:
    """El maximo es 100. Se rechaza en vez de servir en silencio una pagina enorme."""
    for url in ("/api/v1/exhibitors", "/api/v1/participants"):
        response = client.get(f"{url}?page_size=500", headers=auth_headers(admin_user))
        assert response.status_code == 422
        assert response.json()["code"] == "VALIDATION_ERROR"


def test_listings_paginate(
    client: TestClient,
    db: Session,
    admin_user: User,
    exhibitor_a: Exhibitor,
    exhibitor_b: Exhibitor,
) -> None:
    body = client.get(
        "/api/v1/exhibitors?page=2&page_size=1", headers=auth_headers(admin_user)
    ).json()

    assert body["total"] == 2
    assert body["page"] == 2
    assert len(body["items"]) == 1


# --- Reglas (solo lectura) --------------------------------------------------------------------


def test_rules_are_readable_by_both_roles(
    client: TestClient, admin_user: User, rep_a: User
) -> None:
    for user in (admin_user, rep_a):
        sizes = client.get("/api/v1/rules/stand-sizes", headers=auth_headers(user)).json()
        credentials = client.get("/api/v1/rules/credentials", headers=auth_headers(user)).json()

        assert [r["label"] for r in sizes] == ["Pequeño", "Mediano", "Grande"]
        assert {r["category"]: r["block_m2"] for r in credentials} == {
            "Exhibitor": 5,
            "Guest": 10,
            "Service": 10,
        }


def test_rules_require_authentication(client: TestClient) -> None:
    assert client.get("/api/v1/rules/stand-sizes").status_code == 401


# --- Reporte Excel ----------------------------------------------------------------------------


def test_exhibitors_report_downloads_and_opens(
    client: TestClient, db: Session, admin_user: User, exhibitor_a: Exhibitor
) -> None:
    add_participant(db, exhibitor_a, "1710000017", "Exhibitor", None)

    response = client.get("/api/v1/reports/exhibitors.xlsx", headers=auth_headers(admin_user))

    assert response.status_code == 200
    assert "spreadsheetml" in response.headers["content-type"]
    assert "expositores.xlsx" in response.headers["content-disposition"]

    sheet: Any = load_workbook(BytesIO(response.content)).active
    headers = [cell.value for cell in sheet[3]]
    row = {
        header: value for header, value in zip(headers, [c.value for c in sheet[4]], strict=True)
    }

    assert row["Razon social"] == exhibitor_a.legal_name
    assert row["Metraje (m2)"] == 25
    assert row["Categoria de stand"] == "Mediano"
    assert row["Exhibitor: cuota"] == 10
    assert row["Exhibitor: asignadas"] == 1
    assert row["Exhibitor: disponibles"] == 9


def test_report_is_admin_only(client: TestClient, rep_a: User) -> None:
    response = client.get("/api/v1/reports/exhibitors.xlsx", headers=auth_headers(rep_a))
    assert response.status_code == 403


# --- Imagen de las credenciales (la sube el representante) -------------------------------------

BADGE_ART = "/api/v1/me/badge-art"
PIXEL = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAE="


def test_badge_art_round_trips_through_the_stand(client: TestClient, rep_a: User) -> None:
    """La imagen vive en el stand, no en el navegador: quien imprima desde otro equipo ve
    la misma credencial."""
    saved = client.put(
        BADGE_ART,
        json={"image": PIXEL, "focus_x": 30, "focus_y": 70, "zoom": 140},
        headers=auth_headers(rep_a),
    )
    assert saved.status_code == 200

    quota = client.get(MY_QUOTA, headers=auth_headers(rep_a)).json()
    assert quota["badge_art"] == {"image": PIXEL, "focus_x": 30, "focus_y": 70, "zoom": 140}

    assert client.delete(BADGE_ART, headers=auth_headers(rep_a)).status_code == 204
    assert client.get(MY_QUOTA, headers=auth_headers(rep_a)).json()["badge_art"] is None


def test_badge_art_only_accepts_embedded_images(client: TestClient, rep_a: User) -> None:
    """Una URL remota convertiria el campo en una peticion a un tercero desde el navegador
    de quien imprime, y quien lo escribe es un representante, no el administrador."""
    for rejected in ("https://ejemplo.invalid/foto.png", "data:text/html;base64,PHNjcmlwdD4="):
        response = client.put(BADGE_ART, json={"image": rejected}, headers=auth_headers(rep_a))
        assert response.status_code == 422
        assert response.json()["code"] == "VALIDATION_ERROR"


def test_badge_art_rejects_an_oversized_image(client: TestClient, rep_a: User) -> None:
    """Sin almacenamiento de ficheros, el tope de la columna es la unica defensa: el
    navegador reescala antes de subir, pero el servidor no se fia de eso."""
    huge = "data:image/jpeg;base64," + ("A" * 400_001)
    assert (
        client.put(BADGE_ART, json={"image": huge}, headers=auth_headers(rep_a)).status_code == 422
    )


def test_badge_art_is_representative_only(client: TestClient, admin_user: User) -> None:
    response = client.put(BADGE_ART, json={"image": PIXEL}, headers=auth_headers(admin_user))
    assert response.status_code == 403


def test_each_stand_sees_only_its_own_badge_art(
    client: TestClient, rep_a: User, rep_b: User
) -> None:
    """El exhibitor_id sale del token: A no puede pintar las credenciales de B."""
    client.put(BADGE_ART, json={"image": PIXEL}, headers=auth_headers(rep_a))
    assert client.get(MY_QUOTA, headers=auth_headers(rep_b)).json()["badge_art"] is None
