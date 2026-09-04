from pydantic import BaseModel

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
SEARCH_MAX_LENGTH = 100
"""Tope del termino de busqueda de los listados: entrada de usuario, se acota (§8.4)."""


class Page[T](BaseModel):
    """Forma unica de todo listado (CLAUDE.md §9.5). `page` es 1-based."""

    items: list[T]
    total: int
    page: int
    page_size: int
