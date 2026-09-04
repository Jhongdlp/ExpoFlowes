"""Generacion de Excel con openpyxl.

Las columnas por categoria salen de las reglas del evento, no de una lista fija: si manana
una feria define una cuarta categoria de credencial, el reporte la incluye sin tocar codigo.
"""

from collections.abc import Sequence
from io import BytesIO
from typing import Any

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font
from openpyxl.utils import get_column_letter

XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

_BASE_HEADERS = [
    "Razon social",
    "Identificacion tributaria",
    "Nombre del stand",
    "Metraje (m2)",
    "Categoria de stand",
]


def _autosize(sheet: Any, headers: Sequence[str]) -> None:
    for index, header in enumerate(headers, start=1):
        width = max(len(header) + 2, 12)
        sheet.column_dimensions[get_column_letter(index)].width = min(width, 40)


def exhibitors_report(
    summaries: Sequence[dict[str, Any]], categories: Sequence[str], event_name: str
) -> bytes:
    """Un stand por fila, con cuota / asignadas / disponibles de cada categoria."""
    headers = list(_BASE_HEADERS)
    for category in categories:
        headers += [f"{category}: cuota", f"{category}: asignadas", f"{category}: disponibles"]

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Expositores"
    sheet["A1"] = event_name
    sheet["A1"].font = Font(bold=True, size=13)
    sheet.append([])
    sheet.append(headers)
    for cell in sheet[3]:
        cell.font = Font(bold=True)
        cell.alignment = Alignment(horizontal="center", wrap_text=True)

    for item in summaries:
        row: list[Any] = [
            item["legal_name"],
            item["tax_id"],
            item["stand_name"],
            item["requested_m2"],
            item["stand_category"],
        ]
        for category in categories:
            row += [
                item["quota"].get(category, 0),
                item["assigned"].get(category, 0),
                item["available"].get(category, 0),
            ]
        sheet.append(row)

    sheet.freeze_panes = "A4"
    _autosize(sheet, headers)

    buffer = BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()
