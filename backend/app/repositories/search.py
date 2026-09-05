"""Busqueda de texto compartida por los listados.

Sin extensiones de Postgres ni indices de texto completo: `translate` pliega los acentos en
SQL y `unicodedata` hace lo mismo con el termino en Python, asi "jose" encuentra a "José" y
"munoz" a "Muñoz". Cada palabra del termino debe aparecer en alguna columna (AND de ORs),
de modo que escribir mas palabras siempre acota el resultado en vez de ampliarlo.
"""

import unicodedata
from typing import Any

from sqlalchemy import ColumnElement, func, or_

# El mismo plegado que hace `fold`, pero expresado como lo entiende `translate` en SQL.
_ACCENTED = "áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ"
_PLAIN = "aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC"

MAX_TERMS = 6
"""Tope de palabras: una consulta con 200 terminos son 200 subconsultas OR."""


def fold(text: str) -> str:
    """Minusculas sin tildes."""
    decomposed = unicodedata.normalize("NFD", text)
    return "".join(c for c in decomposed if not unicodedata.combining(c)).lower()


def _pattern(term: str) -> str:
    """`%` y `_` del usuario son texto, no comodines."""
    escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def matches(search: str | None, *columns: Any) -> list[ColumnElement[bool]]:
    """Filtros a anadir al `where` del listado. Termino vacio -> sin filtros."""
    if search is None:
        return []
    return [
        or_(
            *[
                func.lower(func.translate(column, _ACCENTED, _PLAIN)).like(
                    _pattern(term), escape="\\"
                )
                for column in columns
            ]
        )
        for term in fold(search).split()[:MAX_TERMS]
    ]
