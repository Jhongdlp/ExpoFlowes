"""Validacion de cedula y RUC con el algoritmo real (trazabilidad R16).

Todas las identificaciones son ficticias: validas por algoritmo, generadas, no pertenecen a
ninguna persona ni empresa real.
"""

import pytest

from app.domain.exceptions import InvalidIdentificationError
from app.domain.identification import (
    validate_cedula,
    validate_identification,
    validate_ruc,
)

VALID_CEDULAS = ["1712345675", "0923456784", "0109876540", "1710000017", "1300000070"]
VALID_RUCS = [
    "1791234561001",  # juridica privada (tercer digito 9)
    "0992345675001",
    "0198765430001",
    "1712345675001",  # persona natural: cedula valida + establecimiento
    "1760012320001",  # entidad publica (tercer digito 6)
]


# --- R16: cedula, modulo 10 ------------------------------------------------------------------


@pytest.mark.parametrize("value", VALID_CEDULAS)
def test_cedula_modulo10(value: str) -> None:
    validate_cedula(value)


@pytest.mark.parametrize(
    ("value", "reason"),
    [
        ("1712345674", "digito verificador"),  # ultimo digito alterado
        ("1712345670", "digito verificador"),
        ("2512345675", "provincia"),  # provincia 25 no existe
        ("1762345675", "tercer digito"),  # tercer digito 6: no es persona natural
        ("171234567", "10 digitos"),  # corta
        ("17123456755", "10 digitos"),  # larga
        ("17123A5675", "10 digitos"),  # no numerica
        ("", "10 digitos"),
    ],
)
def test_cedula_invalid(value: str, reason: str) -> None:
    with pytest.raises(InvalidIdentificationError) as exc:
        validate_cedula(value)
    assert reason in exc.value.details["reason"]
    assert exc.value.code == "INVALID_IDENTIFICATION"


# --- R16: RUC, modulo 11 segun el tercer digito ----------------------------------------------


@pytest.mark.parametrize("value", VALID_RUCS)
def test_ruc_modulo11(value: str) -> None:
    validate_ruc(value)


@pytest.mark.parametrize(
    ("value", "reason"),
    [
        ("1791234562001", "digito verificador"),  # juridica con verificador alterado
        ("1760012310001", "digito verificador"),  # publica con verificador alterado
        ("1712345674001", "digito verificador"),  # natural sobre cedula invalida
        ("1771234561001", "tercer digito"),  # tercer digito 7: no existe ese contribuyente
        ("1791234561000", "establecimiento"),  # establecimiento 000
        ("179123456100", "13 digitos"),
        ("17912345610011", "13 digitos"),
    ],
)
def test_ruc_invalid(value: str, reason: str) -> None:
    with pytest.raises(InvalidIdentificationError) as exc:
        validate_ruc(value)
    assert reason in exc.value.details["reason"]


# --- Documentos extranjeros: sin algoritmo, solo formato -------------------------------------


@pytest.mark.parametrize(
    ("value", "id_type"),
    [("AB1234567", "PASSPORT"), ("X4839201", "FOREIGN_ID"), ("123456789012345", "PASSPORT")],
)
def test_foreign_documents_skip_the_algorithm(value: str, id_type: str) -> None:
    validate_identification(value, id_type)


@pytest.mark.parametrize("value", ["", "AB1", "AB 123456", "A" * 21])
def test_foreign_documents_still_need_a_reasonable_format(value: str) -> None:
    with pytest.raises(InvalidIdentificationError):
        validate_identification(value, "PASSPORT")


def test_unknown_identification_type_is_rejected() -> None:
    with pytest.raises(InvalidIdentificationError) as exc:
        validate_identification("1712345675", "DNI")
    assert "desconocido" in exc.value.details["reason"]


@pytest.mark.parametrize(("value", "id_type"), [("1712345675", "CEDULA"), ("1791234561001", "RUC")])
def test_validate_identification_dispatches_by_type(value: str, id_type: str) -> None:
    validate_identification(value, id_type)
