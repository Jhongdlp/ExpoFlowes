import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { ApiError, download, upload } from '../../api/client'
import type { BulkUploadReport } from '../../api/types'
import { PageHeader } from '../../components/PageHeader'
import { ServerError } from '../../components/ServerError'
import { Button } from '../../components/ui/Button'
import { Notice } from '../../components/ui/Notice'
import { Table, TBody, TD, TH } from '../../components/ui/Table'
import { readWorkbook, type Preview } from './preview'

const BULK = '/me/participants/bulk'
const TEMPLATE = '/me/participants/template.xlsx'

interface RowError {
  row: number
  field: string
  message: string
}

/** Errores por fila del BULK_UPLOAD_INVALID_ROWS (§9.4). La UI decide por `code`, no por texto. */
function rowErrors(error: unknown): RowError[] {
  if (!(error instanceof ApiError) || error.code !== 'BULK_UPLOAD_INVALID_ROWS') return []
  const raw = error.details.errors
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return []
    const row = item as Record<string, unknown>
    return typeof row.row === 'number' && typeof row.message === 'string'
      ? [{ row: row.row, field: String(row.field ?? ''), message: row.message }]
      : []
  })
}

export function BulkUploadPage() {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [readFailure, setReadFailure] = useState<string | null>(null)
  const [imported, setImported] = useState<number | null>(null)

  const validate = useMutation({
    mutationFn: (picked: File) => upload<BulkUploadReport>(`${BULK}?dry_run=true`, picked),
  })
  const confirm = useMutation({
    mutationFn: (picked: File) => upload<BulkUploadReport>(`${BULK}?dry_run=false`, picked),
    onSuccess: async (report) => {
      setImported(report.inserted)
      reset()
      await queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })

  function reset() {
    setFile(null)
    setPreview(null)
    setReadFailure(null)
    validate.reset()
    confirm.reset()
    if (inputRef.current !== null) inputRef.current.value = ''
  }

  async function onPick(picked: File) {
    setImported(null)
    setReadFailure(null)
    confirm.reset()
    setFile(picked)
    try {
      setPreview(await readWorkbook(picked))
    } catch {
      setPreview(null)
      setReadFailure('No se pudo leer el archivo. Debe ser un .xlsx generado desde la plantilla.')
    }
    // La validacion que manda es la del servidor: el mismo endpoint del alta, sin insertar.
    await validate.mutateAsync(picked).catch(() => undefined)
  }

  const errors = rowErrors(validate.error)
  const byRow = new Map<number, RowError[]>()
  for (const error of errors) byRow.set(error.row, [...(byRow.get(error.row) ?? []), error])

  const report = validate.data
  // El servidor ya se pronuncio: o devolvio informe, o devolvio errores por fila.
  const validated = report !== undefined || errors.length > 0
  const ready = file !== null && report !== undefined && !validate.isPending

  return (
    <>
      <PageHeader
        title="Carga masiva de credenciales"
        subtitle="Suba el Excel, revise fila por fila lo que entra y confirme. Nada se importa hasta que usted lo confirme."
        actions={
          <>
            <Button variant="secondary" onClick={() => download(TEMPLATE, 'plantilla-credenciales.xlsx')}>
              Descargar plantilla
            </Button>
            <Link to="/stand/credenciales">
              <Button variant="ghost">Ver credenciales</Button>
            </Link>
          </>
        }
      />

      <div className="border border-line bg-surface px-5 py-4">
        <label htmlFor="archivo" className="block text-[13px] font-medium">
          Archivo de credenciales (.xlsx)
        </label>
        <p id="archivo-ayuda" className="mt-1 text-[13px] text-ink-soft">
          Máximo 2 MB y 500 filas. Use la plantilla: las columnas y su orden deben coincidir.
        </p>
        <input
          id="archivo"
          ref={inputRef}
          type="file"
          accept=".xlsx"
          aria-describedby="archivo-ayuda"
          onChange={(event) => {
            const picked = event.target.files?.[0]
            if (picked !== undefined) void onPick(picked)
          }}
          className="mt-3 block w-full text-[13px] file:mr-3 file:h-8 file:cursor-pointer file:rounded-sm file:border file:border-line-strong file:bg-surface file:px-3 file:text-[13px] file:font-medium"
        />
      </div>

      {imported === null ? null : (
        <Notice
          className="mt-6"
          title={`Se importaron ${imported} credencial${imported === 1 ? '' : 'es'}`}
          onDismiss={() => setImported(null)}
        >
          Las personas con correo recibieron el aviso de su credencial.
        </Notice>
      )}

      {readFailure === null ? null : (
        <Notice className="mt-6" title={readFailure} onDismiss={() => setReadFailure(null)} />
      )}

      {validate.isPending ? (
        <p className="mt-6 text-[13px] text-ink-soft" aria-live="polite">
          Validando el archivo en el servidor…
        </p>
      ) : null}

      {/* Errores que no son de fila: archivo rechazado, cupo insuficiente para el lote. */}
      {validate.error !== null && errors.length === 0 ? (
        <div className="mt-6">
          <ServerError error={validate.error} onDismiss={() => validate.reset()} />
        </div>
      ) : null}

      {errors.length === 0 ? null : (
        <Notice className="mt-6" title={`${errors.length} fila${errors.length === 1 ? '' : 's'} con errores`}>
          No se importó ninguna credencial. Corrija el archivo en Excel y vuelva a subirlo: la
          importación es todo o nada.
        </Notice>
      )}

      {confirm.error === null ? null : (
        <div className="mt-6">
          <ServerError error={confirm.error} onDismiss={() => confirm.reset()} />
        </div>
      )}

      {preview === null ? null : (
        <section className="mt-8">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold">Vista previa</h2>
              <p className="mt-0.5 text-[13px] text-ink-soft">
                {preview.rows.length} fila{preview.rows.length === 1 ? '' : 's'} en el archivo
                {report === undefined ? null : ` · ${report.valid_rows} válidas`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={reset}>
                Descartar
              </Button>
              <Button
                disabled={!ready || confirm.isPending}
                onClick={() => {
                  if (file !== null) confirm.mutate(file)
                }}
              >
                {confirm.isPending
                  ? 'Importando…'
                  : errors.length > 0
                    ? 'Corrija el archivo para importar'
                    : `Importar ${report?.valid_rows ?? 0} credenciales`}
              </Button>
            </div>
          </div>

          <Table>
            <thead>
              <tr>
                <TH className="w-12 text-right">Fila</TH>
                {/* El estado va pegado al numero de fila: es lo primero que hay que leer, y
                    un archivo de 9 columnas empuja la ultima fuera de la pantalla. */}
                <TH className="w-72 min-w-72">Estado</TH>
                {preview.headers.map((header, index) => (
                  <TH key={`${header}-${index}`} className="whitespace-nowrap">
                    {header}
                  </TH>
                ))}
              </tr>
            </thead>
            <TBody>
              {preview.rows.map((row) => {
                const failures = byRow.get(row.number) ?? []
                return (
                  <tr key={row.number} className={failures.length === 0 ? '' : 'bg-fill'}>
                    <TD className="tnum text-right text-ink-faint">{row.number}</TD>
                    <TD>
                      {failures.length === 0 ? (
                        <span className="label-caps">
                          {validated ? 'Lista para importar' : 'Sin validar'}
                        </span>
                      ) : (
                        <ul className="space-y-1 border-l-2 border-l-ink pl-3 text-[12px]">
                          {failures.map((failure, index) => (
                            <li key={index}>
                              <span className="label-caps">{failure.field}</span>{' '}
                              {failure.message}
                            </li>
                          ))}
                        </ul>
                      )}
                    </TD>
                    {row.cells.map((cell, index) => (
                      <TD key={index} className="whitespace-nowrap text-ink-soft">
                        {cell === '' ? <span className="text-ink-faint">—</span> : cell}
                      </TD>
                    ))}
                  </tr>
                )
              })}
            </TBody>
          </Table>
        </section>
      )}
    </>
  )
}
