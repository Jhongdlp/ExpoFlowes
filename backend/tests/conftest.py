"""Base de test propia (`<db>_test`), creada al vuelo. Cada test corre en una transaccion
que se revierte al terminar, asi que los tests no se contaminan entre si.
"""

from collections.abc import Iterator
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.core.security import AuthContext, Role, create_access_token, hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import *  # noqa: F401,F403  (registra las tablas en Base.metadata)
from app.models import Event, Exhibitor, User

ADMIN_PASSWORD = "Admin123!"  # noqa: S105  solo para los tests
REP_PASSWORD = "Representante123!"  # noqa: S105


def _test_database_url() -> str:
    url = make_url(get_settings().database_url)
    return url.set(database=f"{url.database}_test").render_as_string(hide_password=False)


@pytest.fixture(scope="session")
def engine() -> Iterator[Engine]:
    url = make_url(_test_database_url())
    admin = create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": url.database}
        ).scalar()
        if not exists:
            conn.execute(text(f'CREATE DATABASE "{url.database}"'))
    admin.dispose()

    # ponytail: create_all en vez de `alembic upgrade head`. El esquema autoritativo es la
    # migracion; si divergen, el test de constraints lo delata. Cambiar a alembic si crece.
    test_engine = create_engine(url, future=True)
    Base.metadata.drop_all(test_engine)
    Base.metadata.create_all(test_engine)
    yield test_engine
    test_engine.dispose()


@pytest.fixture
def db(engine: Engine) -> Iterator[Session]:
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, autoflush=False, expire_on_commit=False)
    try:
        yield session
    finally:
        session.close()
        if transaction.is_active:  # un IntegrityError ya deja la transaccion desasociada
            transaction.rollback()
        connection.close()


@pytest.fixture
def client(db: Session) -> Iterator[TestClient]:
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def reset_rate_limiter() -> None:
    """El limite de login es por IP y el TestClient siempre usa la misma: sin esto, el test
    que prueba el 429 dejaria bloqueados a los siguientes."""
    limiter.reset()


@pytest.fixture
def event(db: Session) -> Event:
    row = Event(
        name="Expo Flor Ecuador 2026",
        slug="expo-flor-ecuador-2026",
        year=2026,
        starts_on=date(2026, 10, 7),
        ends_on=date(2026, 10, 9),
        is_active=True,
    )
    db.add(row)
    db.flush()
    return row


def _exhibitor(db: Session, event: Event, tax_id: str, name: str) -> Exhibitor:
    row = Exhibitor(
        event_id=event.id,
        tax_id=tax_id,
        tax_id_type="RUC",
        legal_name=name,
        stand_name=name,
        address="Av. Demo 100",
        requested_m2=25,
    )
    db.add(row)
    db.flush()
    return row


@pytest.fixture
def exhibitor_a(db: Session, event: Event) -> Exhibitor:
    return _exhibitor(db, event, "1791234561001", "Rosas del Cotopaxi S.A.")


@pytest.fixture
def exhibitor_b(db: Session, event: Event) -> Exhibitor:
    return _exhibitor(db, event, "0992345675001", "Flores del Valle Cia. Ltda.")


def _user(db: Session, event: Event, email: str, role: str, **kwargs: object) -> User:
    row = User(event_id=event.id, email=email, role=role, **kwargs)
    db.add(row)
    db.flush()
    return row


@pytest.fixture
def admin_user(db: Session, event: Event) -> User:
    return _user(
        db, event, "admin@example.com", "admin", password_hash=hash_password(ADMIN_PASSWORD)
    )


@pytest.fixture
def rep_a(db: Session, event: Event, exhibitor_a: Exhibitor) -> User:
    return _user(
        db,
        event,
        "rep.a@example.com",
        "representative",
        exhibitor_id=exhibitor_a.id,
        password_hash=hash_password(REP_PASSWORD),
    )


@pytest.fixture
def rep_b(db: Session, event: Event, exhibitor_b: Exhibitor) -> User:
    return _user(
        db,
        event,
        "rep.b@example.com",
        "representative",
        exhibitor_id=exhibitor_b.id,
        password_hash=hash_password(REP_PASSWORD),
    )


@pytest.fixture
def rep_without_password(db: Session, event: Event, exhibitor_b: Exhibitor) -> User:
    """Representante recien creado: aun no establecio su clave (§6.5)."""
    return _user(db, event, "nuevo@example.com", "representative", exhibitor_id=exhibitor_b.id)


def auth_headers(user: User) -> dict[str, str]:
    """Token emitido directo, sin pasar por /login: asi los tests de negocio no gastan
    intentos del rate limit."""
    role: Role = "admin" if user.role == "admin" else "representative"
    context = AuthContext(
        user_id=user.id, role=role, event_id=user.event_id, exhibitor_id=user.exhibitor_id
    )
    return {"Authorization": f"Bearer {create_access_token(context)}"}
