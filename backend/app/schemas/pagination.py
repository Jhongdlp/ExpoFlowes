from pydantic import BaseModel

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
SEARCH_MAX_LENGTH = 100
"""Tope del termino de busqueda de los listados: entrada de usuario, se acota."""


class Page[T](BaseModel):
    """Forma unica de todo listado. `page` es 1-based."""

    items: list[T]
    total: int
    page: int
    page_size: int
