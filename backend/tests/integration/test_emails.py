"""Correos transaccionales (F13, punto extra E1).

Trazabilidad: E1, E1b.

Los tests no envian nada: se sustituye `mailer.send`, que es el unico punto que habla con el
SMTP. Con `SMTP_HOST` vacio el mailer ya escribe al log en vez de enviar, asi que la suite es
segura incluso sin este parche.
"""

import email
import email.policy
import socket
import threading
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.integrations import mailer
from app.models import Participant, User
from tests.conftest import auth_headers
from tests.integration.test_exhibitors import EXHIBITORS
from tests.integration.test_exhibitors import payload as exhibitor_payload
from tests.integration.test_participants import PARTICIPANTS
from tests.integration.test_participants import payload as participant_payload

Mail = tuple[str, str, str]


@pytest.fixture
def outbox(monkeypatch: pytest.MonkeyPatch) -> list[Mail]:
    """Buzon en memoria: (destinatario, asunto, cuerpo)."""
    sent: list[Mail] = []
    monkeypatch.setattr(
        mailer,
        "send",
        lambda to, subject, body, body_html=None: sent.append((to, subject, body)),
    )
    return sent


@pytest.fixture
def broken_mailer(monkeypatch: pytest.MonkeyPatch) -> None:
    def explode(*_: Any, **__: Any) -> None:
        raise OSError("SMTP caido")

    monkeypatch.setattr(mailer, "send", explode)


# --- E1: los dos correos del enunciado ---------------------------------------------------------


def test_exhibitor_creation_sends_setup_link(
    client: TestClient, db: Session, admin_user: User, outbox: list[Mail]
) -> None:
    response = client.post(EXHIBITORS, json=exhibitor_payload(), headers=auth_headers(admin_user))
    assert response.status_code == 201

    assert len(outbox) == 1
    to, _, body = outbox[0]
    assert to == "jorge.benitez@example.com"
    assert "/establecer-clave?token=" in body
    # Nunca una contraseña en el correo. El demo no expone el enlace por defecto.
    assert response.json()["password_setup_link"] is None


def test_resending_the_link_emails_the_representative(
    client: TestClient, admin_user: User, rep_a: User, outbox: list[Mail]
) -> None:
    response = client.post(
        "/api/v1/auth/request-password-setup",
        json={"email": rep_a.email},
        headers=auth_headers(admin_user),
    )

    assert response.status_code == 202
    assert len(outbox) == 1
    assert "/establecer-clave?token=" in outbox[0][2]


def test_unknown_email_sends_nothing_and_looks_the_same(
    client: TestClient, admin_user: User, outbox: list[Mail]
) -> None:
    """: la respuesta es identica exista o no el correo; el envio no."""
    response = client.post(
        "/api/v1/auth/request-password-setup",
        json={"email": "nadie@example.com"},
        headers=auth_headers(admin_user),
    )

    assert response.status_code == 202
    assert outbox == []


def test_participant_with_email_is_notified(
    client: TestClient, db: Session, rep_a: User, outbox: list[Mail]
) -> None:
    response = client.post(
        PARTICIPANTS,
        json=participant_payload(email="ana.torres@example.com"),
        headers=auth_headers(rep_a),
    )
    assert response.status_code == 201

    to, subject, body = outbox[0]
    assert to == "ana.torres@example.com"
    assert "credencial" in subject.lower()
    assert "Rosas del Cotopaxi" in body  # la empresa que le asigno la credencial
    assert "Exhibitor" in body

    participant = db.execute(select(Participant)).scalar_one()
    assert participant.credential_notified_at is not None


def test_participant_without_email_does_not_fail(
    client: TestClient, db: Session, rep_a: User, outbox: list[Mail]
) -> None:
    """: el correo es opcional; sin el, el alta funciona y no se envia nada."""
    response = client.post(PARTICIPANTS, json=participant_payload(), headers=auth_headers(rep_a))

    assert response.status_code == 201
    assert outbox == []
    assert db.execute(select(Participant)).scalar_one().credential_notified_at is None


def test_credential_is_not_notified_twice(
    client: TestClient, rep_a: User, outbox: list[Mail]
) -> None:
    """`credential_notified_at` evita el reenvio al editar la misma credencial."""
    created = client.post(
        PARTICIPANTS,
        json=participant_payload(email="ana.torres@example.com"),
        headers=auth_headers(rep_a),
    ).json()

    client.patch(
        f"{PARTICIPANTS}/{created['id']}",
        json={"position": "Coordinadora de stand"},
        headers=auth_headers(rep_a),
    )

    assert len(outbox) == 1


def test_adding_the_email_later_sends_the_credential(
    client: TestClient, rep_a: User, outbox: list[Mail]
) -> None:
    created = client.post(
        PARTICIPANTS, json=participant_payload(), headers=auth_headers(rep_a)
    ).json()
    assert outbox == []

    client.patch(
        f"{PARTICIPANTS}/{created['id']}",
        json={"email": "ana.torres@example.com"},
        headers=auth_headers(rep_a),
    )

    assert len(outbox) == 1
    assert outbox[0][0] == "ana.torres@example.com"


# --- E1b: un fallo del correo no revierte nada -------------------------------------------------


def test_mailer_failure_does_not_rollback(
    client: TestClient, db: Session, admin_user: User, broken_mailer: None
) -> None:
    """El SMTP se cae y el expositor se crea igual: el correo va despues del COMMIT."""
    response = client.post(EXHIBITORS, json=exhibitor_payload(), headers=auth_headers(admin_user))

    assert response.status_code == 201
    assert db.execute(select(User).where(User.role == "representative")).scalars().all()


def test_mailer_failure_does_not_block_a_credential(
    client: TestClient, db: Session, rep_a: User, broken_mailer: None
) -> None:
    response = client.post(
        PARTICIPANTS,
        json=participant_payload(email="ana.torres@example.com"),
        headers=auth_headers(rep_a),
    )

    assert response.status_code == 201
    # Sin marca: el aviso quedo pendiente y se reintentara si se edita la credencial.
    assert db.execute(select(Participant)).scalar_one().credential_notified_at is None


# --- Carga masiva: los correos salen tras confirmar la insercion -------------------------------


def test_bulk_upload_notifies_after_commit(
    client: TestClient, db: Session, rep_a: User, outbox: list[Mail]
) -> None:
    from tests.integration.test_bulk_upload import cedula, row, upload, workbook_bytes

    content = workbook_bytes(
        [
            row(cedula(0), correo="uno@example.com"),
            row(cedula(1)),
            row(cedula(2), correo="dos@example.com"),
        ]
    )

    assert upload(client, rep_a, content, dry_run=True).status_code == 200
    assert outbox == []  # en dry_run no se envia nada

    assert upload(client, rep_a, content).status_code == 200
    assert {mail[0] for mail in outbox} == {"uno@example.com", "dos@example.com"}
    assert db.execute(select(Participant).where(Participant.email.is_(None))).scalar_one()


def test_demo_flag_exposes_the_setup_link(
    client: TestClient, admin_user: User, outbox: list[Mail], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Fallback documentado: con EXPOSE_SETUP_LINK=true el enlace vuelve en la respuesta
    del alta para poder activar la cuenta sin inbox. Sigue sin viajar ninguna contraseña."""
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "expose_setup_link", True)

    response = client.post(EXHIBITORS, json=exhibitor_payload(), headers=auth_headers(admin_user))

    link = response.json()["password_setup_link"]
    assert link is not None and "/establecer-clave?token=" in link


# --- El camino SMTP real, sin depender de Mailtrap ---------------------------------------------


def _smtp_stub(sock: socket.socket, received: list[bytes]) -> None:
    """SMTP mínimo: acepta el sobre, guarda el cuerpo y no anuncia STARTTLS."""
    conn, _ = sock.accept()
    stream = conn.makefile("rwb")

    def reply(line: bytes) -> None:
        stream.write(line + b"\r\n")
        stream.flush()

    reply(b"220 stub")
    body: list[bytes] = []
    in_data = False
    while True:
        line = stream.readline()
        if not line:
            break
        if in_data:
            if line.strip() == b".":
                in_data = False
                received.append(b"".join(body))
                reply(b"250 ok")
            else:
                body.append(line)
            continue
        command = line.strip().upper()
        if command.startswith(b"EHLO"):
            reply(b"250-stub\r\n250 SIZE 10240000")
        elif command.startswith(b"DATA"):
            in_data = True
            reply(b"354 adelante")
        elif command.startswith(b"QUIT"):
            reply(b"221 chau")
            break
        else:
            reply(b"250 ok")
    conn.close()


def test_send_speaks_smtp_when_configured(monkeypatch: pytest.MonkeyPatch) -> None:
    """Con SMTP_HOST configurado el correo sale de verdad por el socket.

    Es el unico camino del mailer que los demas tests no recorren, porque sustituyen `send`.
    El servidor de prueba no ofrece STARTTLS a proposito: cifrar es oportunista, no obligatorio,
    para que el mailer sirva igual con Mailtrap que con un buzon de captura local.
    """
    from app.core.config import get_settings

    with socket.socket() as server:
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.bind(("127.0.0.1", 0))
        server.listen(1)
        received: list[bytes] = []
        threading.Thread(target=_smtp_stub, args=(server, received), daemon=True).start()

        settings = get_settings()
        monkeypatch.setattr(settings, "smtp_host", "127.0.0.1")
        monkeypatch.setattr(settings, "smtp_port", server.getsockname()[1])
        monkeypatch.setattr(settings, "smtp_user", "")

        assert mailer.notify_password_setup("rep@example.com", "Mariana", "http://x/?token=XYZ")

    message = email.message_from_bytes(received[0], policy=email.policy.default)
    assert message["To"] == "rep@example.com"
    assert message["From"] == settings.mail_from
    # El correo sale como multipart/alternative: texto plano de respaldo + HTML.
    plain = message.get_body(preferencelist=("plain",))
    rich = message.get_body(preferencelist=("html",))
    assert plain is not None and rich is not None
    # El enlace sobrevive a la codificacion quoted-printable en las dos partes.
    assert "token=XYZ" in plain.get_content()
    assert "token=XYZ" in rich.get_content()
