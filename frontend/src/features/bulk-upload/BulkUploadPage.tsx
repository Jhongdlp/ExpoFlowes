import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { ApiError, download, upload } from '../../api/client'
import type { BulkUploadReport } from '../../api/types'
import { PageHeader } from '../../components/PageHeader'
import { ServerError } from '../../components/ServerError'
import { Button } from '../../components/ui/Button'
import { Notice } from '../../components/ui/Notice'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Status } from '../../components/ui/Status'
import { Table, TBody, TD, TH, TR } from '../../components/ui/Table'
import { cn } from '../../lib/cn'
import { readWorkbook, type Preview } from './preview'

const BULK = '/me/participants/bulk'
const TEMPLATE = '/me/participants/template.xlsx'

interface RowError {
  row: number
  field: string
  message: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
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
  const [dragging, setDragging] = useState(false)

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

  const busy = validate.isPending || confirm.isPending

  function reset() {
    setFile(null)
    setPreview(null)
    setReadFailure(null)
    setDragging(false)
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
      setReadFailure(
        'No se pudo leer el archivo. Debe ser un libro .xlsx generado desde la plantilla.',
      )
    }
    // La validacion autoritativa es la del servidor (dry_run=true).
    await validate.mutateAsync(picked).catch(() => undefined)
  }

  const errors = rowErrors(validate.error)
  const byRow = new Map<number, RowError[]>()
  for (const error of errors) byRow.set(error.row, [...(byRow.get(error.row) ?? []), error])

  const report = validate.data
  const ready = file !== null && report !== undefined && !validate.isPending

  return (
    <div className="space-y-4">
      <PageHeader
        title="Carga masiva de credenciales"
        subtitle="Suba el Excel, revise fila por fila lo que entra y confirme. Nada se importa hasta que usted lo confirme."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => download(TEMPLATE, 'plantilla-credenciales.xlsx')}
            >
              Descargar plantilla
            </Button>
            <Link to="/stand/credenciales">
              <Button variant="ghost">Ver credenciales</Button>
            </Link>
          </>
        }
      />

      {/* Zona de carga. El borde es el único elemento que reacciona al arrastre. */}
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          const dropped = event.dataTransfer.files?.[0]
          if (dropped !== undefined) void onPick(dropped)
        }}
        className={cn(
          'surface p-4 transition-colors duration-[120ms] ease-brand',
          dragging ? 'border-ink bg-fill' : 'hover:border-line-strong',
        )}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <label htmlFor="archivo" className="block cursor-pointer text-[13px] font-medium text-ink">
              {file === null ? 'Archivo de credenciales (.xlsx)' : file.name}
            </label>
            <p id="archivo-ayuda" className="mt-0.5 text-[12px] text-ink-soft">
              {file === null
                ? 'Arrastre el archivo aquí o examine. Máximo 2 MB y 500 filas.'
                : `${formatFileSize(file.size)} · listo para validar`}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 max-sm:w-full max-sm:[&>*]:flex-1">
            {file === null ? null : (
              <Button variant="ghost" size="sm" onClick={reset} disabled={busy} className="w-full sm:w-auto">
                Quitar archivo
              </Button>
            )}
            <label
              htmlFor="archivo"
              className={cn(
                'inline-flex h-8 cursor-pointer items-center justify-center rounded-md border border-line-strong bg-surface px-3 text-[12px] font-medium text-ink',
                'transition-colors duration-[120ms] hover:bg-fill active:translate-y-px',
                busy ? 'pointer-events-none opacity-45' : '',
              )}
            >
              {file === null ? 'Examinar archivo' : 'Cambiar archivo'}
            </label>
            <input
              id="archivo"
              ref={inputRef}
              type="file"
              accept=".xlsx"
              aria-describedby="archivo-ayuda"
              disabled={busy}
              onChange={(event) => {
                const picked = event.target.files?.[0]
                if (picked !== undefined) void onPick(picked)
              }}
              className="sr-only"
            />
          </div>
        </div>

        {validate.isPending ? (
          <div className="mt-3.5 border-t border-line pt-3.5">
            <ProgressBar
              label="Validando en el servidor…"
              sublabel="Columnas, identificaciones y cupo disponible"
            />
          </div>
        ) : null}
      </div>

      {imported === null ? null : (
        <Notice
          tone="success"
          title={`Se importaron ${imported} credencial${imported === 1 ? '' : 'es'}`}
          onDismiss={() => setImported(null)}
        >
          Quedaron registradas en su stand. Quienes indicaron correo recibieron la confirmación.
        </Notice>
      )}

      {readFailure === null ? null : (
        <Notice tone="error" title={readFailure} onDismiss={() => setReadFailure(null)} />
      )}

      {/* Errores globales del servidor (archivo invalido, cupo total insuficiente). */}
      {validate.error !== null && errors.length === 0 ? (
        <ServerError error={validate.error} onDismiss={() => validate.reset()} />
      ) : null}

      {errors.length === 0 ? null : (
        <Notice
          tone="error"
          title={`${errors.length} fila${errors.length === 1 ? '' : 's'} con errores`}
        >
          No se importó ninguna credencial: la carga es todo o nada. Corrija las filas marcadas
          abajo en su archivo y vuelva a subirlo.
        </Notice>
      )}

      {confirm.error === null ? null : (
        <ServerError error={confirm.error} onDismiss={() => confirm.reset()} />
      )}

      {preview === null ? null : (
        <section className="space-y-3">
          <div className="surface flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <h2 className="text-[13px] font-semibold text-ink">Vista previa</h2>
              <p className="tnum mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-faint">
                <span>
                  {preview.rows.length} fila{preview.rows.length === 1 ? '' : 's'} leída
                  {preview.rows.length === 1 ? '' : 's'}
                </span>
                {validate.isPending ? (
                  <Status tone="pending" label="Validando" />
                ) : report === undefined ? null : (
                  <Status tone="ok" label={`${report.valid_rows} válidas`} />
                )}
                {errors.length > 0 ? (
                  <Status tone="error" label={`${errors.length} con error`} />
                ) : null}
              </p>
            </div>
            <div className="flex w-full items-center gap-2 sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none">
              <Button variant="ghost" onClick={reset} disabled={busy}>
                Descartar
              </Button>
              <Button
                loading={confirm.isPending}
                disabled={!ready || busy}
                onClick={() => {
                  if (file !== null) confirm.mutate(file)
                }}
              >
                {confirm.isPending
                  ? 'Importando…'
                  : validate.isPending
                    ? 'Validando…'
                    : errors.length > 0
                      ? 'Corrija los errores'
                      : `Importar ${report?.valid_rows ?? 0} credenciales`}
              </Button>
            </div>
          </div>

          {confirm.isPending ? (
            <ProgressBar
              label="Importando credenciales…"
              sublabel="Inserción atómica y envío de correos"
            />
          ) : null}

          <div
            className={cn(
              'transition-opacity duration-[120ms]',
              confirm.isPending ? 'pointer-events-none opacity-50' : '',
            )}
          >
            {/* Columnas arbitrarias del archivo: aquí lo correcto es desplazar, no apilar. */}
            <Table stack={false}>
              <thead>
                <tr>
                  <TH className="w-12 text-right">Fila</TH>
                  <TH className="w-64">Estado</TH>
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
                  const hasError = failures.length > 0

                  return (
                    <TR
                      key={row.number}
                      className={hasError ? 'bg-alert-soft hover:bg-alert-soft' : undefined}
                    >
                      <TD className="tnum text-right text-ink-faint">{row.number}</TD>
                      <TD className="py-2">
                        {validate.isPending ? (
                          <Status tone="pending" label="Validando" />
                        ) : hasError ? (
                          <div className="space-y-1">
                            <Status tone="error" label="No se puede importar" />
                            <ul className="space-y-0.5 border-l border-alert/40 pl-2 text-[11px] text-ink-soft">
                              {failures.map((failure, index) => (
                                <li key={index}>
                                  <span className="font-medium text-ink">{failure.field}:</span>{' '}
                                  {failure.message}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : report === undefined ? (
                          <Status tone="muted" label="Sin validar" />
                        ) : (
                          <Status tone="ok" label="Lista para importar" />
                        )}
                      </TD>
                      {row.cells.map((cell, index) => (
                        <TD key={index} className="whitespace-nowrap text-ink-soft">
                          {cell === '' ? <span className="text-ink-faint">—</span> : cell}
                        </TD>
                      ))}
                    </TR>
                  )
                })}
              </TBody>
            </Table>
            <p className="mt-1.5 text-[11px] text-ink-faint sm:hidden">
              La vista previa conserva las columnas del archivo: deslice la tabla en horizontal
              para verlas todas.
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
