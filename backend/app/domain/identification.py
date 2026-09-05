"""Validacion de identificacion. Modulo puro, sin framework.

La identificacion es la clave de deduplicacion de todo el sistema, asi que la cedula y
el RUC ecuatorianos se validan con el algoritmo real, no con una expresion regular de longitud.
PASSPORT y FOREIGN_ID no pasan por algoritmo: formato libre no vacio.
"""

from app.domain.exceptions import InvalidIdentificationError

CEDULA_COEFFICIENTS = (2, 1, 2, 1, 2, 1, 2, 1, 2)
RUC_PRIVATE_COEFFICIENTS = (4, 3, 2, 7, 6, 5, 4, 3, 2)
RUC_PUBLIC_COEFFICIENTS = (3, 2, 7, 6, 5, 4, 3, 2)
VALID_PROVINCES = frozenset({*range(1, 25), 30})  # 30 = ecuatorianos registrados en el exterior


def _fail(identification: str, id_type: str, reason: str) -> InvalidIdentificationError:
    return InvalidIdentificationError(
        f"La identificacion '{identification}' no es valida: {reason}",
        {"identification": identification, "identification_type": id_type, "reason": reason},
    )


def _check_province(value: str, id_type: str) -> None:
    if int(value[:2]) not in VALID_PROVINCES:
        raise _fail(value, id_type, "el codigo de provincia no existe")


def _modulo10_digit(first_nine: str) -> int:
    total = 0
    for digit, coefficient in zip(map(int, first_nine), CEDULA_COEFFICIENTS, strict=True):
        product = digit * coefficient
        total += product - 9 if product > 9 else product
    return (10 - total % 10) % 10


def _modulo11_digit(digits: str, coefficients: tuple[int, ...]) -> int:
    total = sum(int(d) * c for d, c in zip(digits, coefficients, strict=True))
    remainder = total % 11
    return 0 if remainder == 0 else 11 - remainder


def validate_cedula(value: str) -> None:
    if not (value.isdigit() and len(value) == 10):
        raise _fail(value, "CEDULA", "debe tener 10 digitos numericos")
    _check_province(value, "CEDULA")
    if int(value[2]) > 5:
        raise _fail(value, "CEDULA", "el tercer digito no corresponde a una persona natural")
    if _modulo10_digit(value[:9]) != int(value[9]):
        raise _fail(value, "CEDULA", "el digito verificador no coincide")


def validate_ruc(value: str) -> None:
    """El tercer digito decide el algoritmo: 0-5 persona natural, 6 publica, 9 juridica."""
    if not (value.isdigit() and len(value) == 13):
        raise _fail(value, "RUC", "debe tener 13 digitos numericos")

    kind = int(value[2])
    if kind <= 5:
        validate_cedula(value[:10])
        if value[10:] == "000":
            raise _fail(value, "RUC", "el codigo de establecimiento no puede ser 000")
        return

    if kind == 6:
        _check_province(value, "RUC")
        if _modulo11_digit(value[:8], RUC_PUBLIC_COEFFICIENTS) != int(value[8]):
            raise _fail(value, "RUC", "el digito verificador no coincide")
        if value[9:] == "0000":
            raise _fail(value, "RUC", "el codigo de establecimiento no puede ser 0000")
        return

    if kind == 9:
        _check_province(value, "RUC")
        if _modulo11_digit(value[:9], RUC_PRIVATE_COEFFICIENTS) != int(value[9]):
            raise _fail(value, "RUC", "el digito verificador no coincide")
        if value[10:] == "000":
            raise _fail(value, "RUC", "el codigo de establecimiento no puede ser 000")
        return

    raise _fail(value, "RUC", "el tercer digito no corresponde a ningun tipo de contribuyente")


def validate_identification(value: str, identification_type: str) -> None:
    """Punto de entrada unico. Lanza InvalidIdentificationError; no devuelve nada si es valida."""
    if identification_type == "CEDULA":
        validate_cedula(value)
    elif identification_type == "RUC":
        validate_ruc(value)
    elif identification_type in ("PASSPORT", "FOREIGN_ID"):
        # Documento extranjero: no hay algoritmo universal, solo formato razonable.
        if not (value.strip() and value.isalnum() and 5 <= len(value) <= 20):
            raise _fail(
                value, identification_type, "debe ser alfanumerico de entre 5 y 20 caracteres"
            )
    else:
        raise _fail(value, identification_type, "tipo de identificacion desconocido")
