from pydantic import BaseModel

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


class Page[T](BaseModel):
    """Forma unica de todo listado (CLAUDE.md §9.5). `page` es 1-based."""

    items: list[T]
    total: int
    page: int
    page_size: int
