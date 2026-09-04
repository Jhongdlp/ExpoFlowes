import { describe, expect, it } from 'vitest'
import { utils, write } from 'xlsx'

import { readWorkbook } from './preview'

/** Construye un .xlsx real en memoria, no un mock: se prueba lo que hace SheetJS de verdad. */
function workbookFile(rows: unknown[][]): File {
  const book = utils.book_new()
  utils.book_append_sheet(book, utils.aoa_to_sheet(rows), 'Hoja1')
  const bytes = write(book, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  return new File([bytes], 'carga.xlsx')
}

const HEADERS = ['nombre', 'apellido', 'identificacion']

describe('readWorkbook', () => {
  it('numera las filas como las ve el usuario en Excel', async () => {
    const preview = await readWorkbook(
      workbookFile([HEADERS, ['Ana', 'Rueda', '1710034065'], ['Luis', 'Paz', '0926687856']]),
    )

    expect(preview.headers).toEqual(HEADERS)
    // La fila 1 es el encabezado: el primer dato es la 2, no la 0.
    expect(preview.rows.map((row) => row.number)).toEqual([2, 3])
  })

  it('no convierte una identificacion numerica a notacion cientifica', async () => {
    // Es la razon de `raw: false`. Sin el, 1710034065 llega como "1.71003e+09" y el usuario
    // ve un archivo entero en rojo por un error que no cometio.
    const preview = await readWorkbook(workbookFile([HEADERS, ['Ana', 'Rueda', 1710034065]]))

    expect(preview.rows[0]?.cells[2]).toBe('1710034065')
  })

  it('descarta las filas totalmente vacias', async () => {
    // Excel arrastra filas en blanco al final en cuanto alguien toca una celda y la borra.
    const preview = await readWorkbook(
      workbookFile([HEADERS, ['Ana', 'Rueda', '1710034065'], ['', '', ''], ['', '', '']]),
    )

    expect(preview.rows).toHaveLength(1)
  })

  it('rellena las celdas que faltan en una fila corta', async () => {
    // Toda fila tiene tantas celdas como encabezados, para que la tabla del preview no se
    // descuadre ni haya que comprobar `undefined` al pintarla.
    const preview = await readWorkbook(workbookFile([HEADERS, ['Ana']]))

    expect(preview.rows[0]?.cells).toEqual(['Ana', '', ''])
  })

  it('lee la plantilla en blanco sin datos: encabezados si, filas no', async () => {
    // Es lo que sube quien se descarga la plantilla y la manda sin rellenar. La pantalla
    // tiene que poder decir "el archivo no tiene filas", no reventar.
    const preview = await readWorkbook(workbookFile([HEADERS]))

    expect(preview.headers).toEqual(HEADERS)
    expect(preview.rows).toEqual([])
  })
})
