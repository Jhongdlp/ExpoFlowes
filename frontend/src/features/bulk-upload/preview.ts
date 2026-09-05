/**
 * Lectura del Excel EN EL NAVEGADOR con SheetJS (punto extra E2, exigido literalmente por el
 * enunciado).
 *
 * Este modulo lee y nada mas. **Ninguna decision de validez se toma aqui**: quien dice si una
 * fila entra es el servidor con `dry_run=true`. Duplicar las reglas en el cliente para
 * "dar feedback antes" es exactamente como divergen cliente y servidor.
 */

/** Fila del archivo tal cual se leyo, con el numero de fila que ve el usuario en Excel. */
export interface PreviewRow {
  number: number
  cells: string[]
}

export interface Preview {
  headers: string[]
  rows: PreviewRow[]
}

const HEADER_ROW = 1

export async function readWorkbook(file: File): Promise<Preview> {
  // Import dinamico: SheetJS pesa mas que el resto de la aplicacion junta y solo lo necesita
  // quien abre esta pantalla.
  const { read, utils } = await import('xlsx')
  const workbook = read(await file.arrayBuffer())
  const name = workbook.SheetNames[0]
  const sheet = name === undefined ? undefined : workbook.Sheets[name]
  if (sheet === undefined) return { headers: [], rows: [] }

  // `raw: false` entrega texto formateado: una cedula numerica no llega como 1.71e9.
  const matrix = utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '' })
  const [header = [], ...body] = matrix

  const headers = header.map((cell) => String(cell ?? '').trim())
  const rows = body
    .map((cells, index) => ({
      number: index + HEADER_ROW + 1,
      cells: headers.map((_, column) => String(cells[column] ?? '').trim()),
    }))
    .filter((row) => row.cells.some((cell) => cell !== ''))

  return { headers, rows }
}
