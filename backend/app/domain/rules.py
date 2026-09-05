"""Motor de reglas: modulo PURO.

Sin imports de sqlalchemy, fastapi ni pydantic. Recibe las reglas como parametro, nunca las
lee: quien las lee es el servicio (F4). Asi se prueba entero sin base de datos.

Es la pieza del punto extra E3: ni un solo numero de negocio vive aqui.
Rangos, bloques, credenciales por bloque y criterio de redondeo llegan en las reglas.
"""

from collections.abc import Sequence
from typing import Protocol

from app.domain.exceptions import StandSizeOutOfRangeError


class StandSizeRule(Protocol):
    """Fila de `stand_size_rules`. Protocolo estructural: la fila de SQLAlchemy encaja sola."""

    label: str
    min_m2: int
    max_m2: int


class CredentialRule(Protocol):
    """Fila de `credential_rules`: `credentials_per_block` por cada `block_m2`."""

    category: str
    credentials_per_block: int
    block_m2: int
    rounding_mode: str


def classify_stand(m2: int, rules: Sequence[StandSizeRule]) -> StandSizeRule:
    """Devuelve la regla de tamaño cuyo rango contiene el metraje.

    Un metraje que no cae en ningun rango se rechaza: clasificarlo por defecto crearia
    datos mal categorizados en silencio, y de esa columna cuelga el calculo de credenciales.
    """
    match = next((r for r in rules if m2 in range(r.min_m2, r.max_m2 + 1)), None)
    if match is None:
        raise StandSizeOutOfRangeError(
            f"El metraje de {m2} m² no corresponde a ninguna categoria de stand configurada.",
            {
                "requested_m2": m2,
                "allowed_ranges": [
                    {"label": r.label, "min_m2": r.min_m2, "max_m2": r.max_m2} for r in rules
                ],
            },
        )
    return match


def _blocks(m2: int, block_m2: int, rounding_mode: str) -> int:
    """Bloques de metraje que se pagan. Aritmetica entera: sin errores de coma flotante."""
    if rounding_mode == "floor":
        return m2 // block_m2
    if rounding_mode == "ceil":
        return -(-m2 // block_m2)
    if rounding_mode == "round":  # medio hacia arriba, no el redondeo bancario de round()
        return (2 * m2 + block_m2) // (2 * block_m2)
    raise ValueError(f"rounding_mode desconocido: {rounding_mode!r}")


def credential_quota(m2: int, rule: CredentialRule) -> int:
    """cuota = credentials_per_block * redondeo(m2 / block_m2).

    Con `floor` (el criterio por defecto, ADR-0004) un stand de 5-9 m² recibe 0 credenciales
    Guest y 0 Service. Es la lectura literal de "N por cada M m²" y el comportamiento esperado.
    """
    return rule.credentials_per_block * _blocks(m2, rule.block_m2, rule.rounding_mode)


def quota_breakdown(m2: int, rules: Sequence[CredentialRule]) -> dict[str, int]:
    """Cuota por categoria de credencial. Las categorias son las que traigan las reglas."""
    return {rule.category: credential_quota(m2, rule) for rule in rules}
