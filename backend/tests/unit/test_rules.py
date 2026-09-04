"""Motor de reglas: se prueba la REGLA, no el framework. Sin base de datos.

Trazabilidad con CLAUDE.md §12.2: R1, R2, R3, R4, R5, R6.
"""

from dataclasses import dataclass

import pytest

from app.domain.exceptions import StandSizeOutOfRangeError
from app.domain.rules import classify_stand, credential_quota, quota_breakdown


@dataclass
class SizeRule:
    label: str
    min_m2: int
    max_m2: int


@dataclass
class CredRule:
    category: str
    credentials_per_block: int
    block_m2: int
    rounding_mode: str = "floor"


# Reglas equivalentes al seed (§5.1 y §5.2). Son DATOS del test: cambiarlas cambia el
# resultado esperado, que es exactamente lo que se quiere demostrar.
SIZE_RULES = [
    SizeRule("Pequeño", 5, 12),
    SizeRule("Mediano", 13, 30),
    SizeRule("Grande", 31, 50),
]
EXHIBITOR = CredRule("Exhibitor", credentials_per_block=2, block_m2=5)
GUEST = CredRule("Guest", credentials_per_block=2, block_m2=10)
SERVICE = CredRule("Service", credentials_per_block=3, block_m2=10)
CREDENTIAL_RULES = [EXHIBITOR, GUEST, SERVICE]


# --- R1: clasificacion en los bordes exactos -------------------------------------------------


@pytest.mark.parametrize(
    ("m2", "expected"),
    [
        (5, "Pequeño"),
        (12, "Pequeño"),
        (13, "Mediano"),
        (30, "Mediano"),
        (31, "Grande"),
        (50, "Grande"),
    ],
)
def test_classify_boundaries(m2: int, expected: str) -> None:
    assert classify_stand(m2, SIZE_RULES).label == expected


# --- R2: metrajes fuera de todo rango --------------------------------------------------------


@pytest.mark.parametrize("m2", [0, 4, 51, 200])
def test_classify_out_of_range(m2: int) -> None:
    with pytest.raises(StandSizeOutOfRangeError) as exc:
        classify_stand(m2, SIZE_RULES)
    assert exc.value.code == "STAND_SIZE_OUT_OF_RANGE"
    assert exc.value.details["requested_m2"] == m2


# --- R3, R4, R5: la tabla completa de §5.2 ---------------------------------------------------


@pytest.mark.parametrize(
    ("m2", "expected"), [(5, 2), (12, 4), (13, 4), (30, 12), (31, 12), (50, 20)]
)
def test_quota_exhibitor(m2: int, expected: int) -> None:
    assert credential_quota(m2, EXHIBITOR) == expected


@pytest.mark.parametrize(("m2", "expected"), [(5, 0), (12, 2), (13, 2), (30, 6), (31, 6), (50, 10)])
def test_quota_guest(m2: int, expected: int) -> None:
    assert credential_quota(m2, GUEST) == expected


@pytest.mark.parametrize(("m2", "expected"), [(5, 0), (12, 3), (13, 3), (30, 9), (31, 9), (50, 15)])
def test_quota_service(m2: int, expected: int) -> None:
    assert credential_quota(m2, SERVICE) == expected


def test_small_stand_gets_zero_guest_and_service(m2: int = 8) -> None:
    """Consecuencia aceptada de floor (§5.2, nota): 5-9 m² no dan Guest ni Service."""
    assert quota_breakdown(m2, CREDENTIAL_RULES) == {"Exhibitor": 2, "Guest": 0, "Service": 0}


def test_quota_breakdown_uses_the_categories_of_the_rules() -> None:
    """Las categorias no estan cableadas: son las que traigan las reglas."""
    extra = CredRule("Prensa", credentials_per_block=1, block_m2=20)
    assert quota_breakdown(40, [*CREDENTIAL_RULES, extra]) == {
        "Exhibitor": 16,
        "Guest": 8,
        "Service": 12,
        "Prensa": 2,
    }


# --- R6: criterio de redondeo, leido de la regla ---------------------------------------------


def test_quota_rounding_floor() -> None:
    """13 m² con la regla Exhibitor (2 por cada 5 m²) da 4, no 6 (ADR-0004)."""
    assert credential_quota(13, EXHIBITOR) == 4


@pytest.mark.parametrize(
    ("m2", "mode", "expected"),
    [
        (13, "floor", 2),
        (13, "ceil", 4),
        (13, "round", 2),  # 1.3 bloques
        (15, "floor", 2),
        (15, "ceil", 4),
        (15, "round", 4),  # 1.5 bloques: medio hacia arriba
        (17, "floor", 2),
        (17, "ceil", 4),
        (17, "round", 4),  # 1.7 bloques
    ],
)
def test_rounding_mode_comes_from_the_rule(m2: int, mode: str, expected: int) -> None:
    rule = CredRule("Guest", credentials_per_block=2, block_m2=10, rounding_mode=mode)
    assert credential_quota(m2, rule) == expected


def test_round_is_half_up_not_bankers() -> None:
    """round() de Python redondea 0.5 al par; el negocio espera medio hacia arriba."""
    rule = CredRule("Guest", credentials_per_block=1, block_m2=2, rounding_mode="round")
    assert credential_quota(1, rule) == 1  # 0.5 bloques -> 1, no 0
    assert credential_quota(5, rule) == 3  # 2.5 bloques -> 3, no 2


def test_unknown_rounding_mode_is_rejected() -> None:
    rule = CredRule("Guest", credentials_per_block=2, block_m2=10, rounding_mode="truncate")
    with pytest.raises(ValueError, match="rounding_mode"):
        credential_quota(20, rule)


# --- Parametrizacion: cambiar la regla cambia el resultado, sin tocar codigo ------------------


def test_changing_a_range_changes_the_classification() -> None:
    """Version unitaria de R7. La version contra base de datos llega en F4."""
    ampliado = [SizeRule("Pequeño", 5, 12), SizeRule("Mediano", 13, 30), SizeRule("Grande", 31, 80)]
    assert classify_stand(70, ampliado).label == "Grande"
    with pytest.raises(StandSizeOutOfRangeError):
        classify_stand(70, SIZE_RULES)


def test_changing_the_block_changes_the_quota() -> None:
    generosa = CredRule("Exhibitor", credentials_per_block=2, block_m2=4)
    assert credential_quota(20, EXHIBITOR) == 8
    assert credential_quota(20, generosa) == 10
