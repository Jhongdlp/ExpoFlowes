import { useState } from 'react'
import { FileSpreadsheet, Loader2 } from 'lucide-react'

import { ApiError, download } from '../api/client'
import { Button } from './ui/Button'
import { Notice } from './ui/Notice'

/**
 * La descarga va por fetch, no por un <a href>: el .xlsx exige la cabecera Authorization.
 */
export function DownloadReportButton() {
  const [failure, setFailure] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onClick = async () => {
    setFailure(null)
    setBusy(true)
    try {
      await download('/reports/exhibitors.xlsx', 'expositores_expoflores_2026.xlsx')
    } catch (error) {
      setFailure(error instanceof ApiError ? error.message : 'No se pudo generar el reporte.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button variant="secondary" onClick={onClick} disabled={busy} className="gap-2">
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-4 w-4" />
        )}
        <span>{busy ? 'Generando…' : 'Descargar Excel'}</span>
      </Button>
      {failure !== null ? <Notice title={failure} onDismiss={() => setFailure(null)} /> : null}
    </div>
  )
}
