import { useState } from 'react'

import { ApiError, download } from '../api/client'
import { Button } from './ui/Button'
import { Notice } from './ui/Notice'

/**
 * La descarga va por fetch, no por un <a href>: el .xlsx exige la cabecera Authorization.
 * Un fallo se cuenta en su sitio, no en un toast que se va antes de leerlo.
 */
export function DownloadReportButton() {
  const [failure, setFailure] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onClick = async () => {
    setFailure(null)
    setBusy(true)
    try {
      await download('/reports/exhibitors.xlsx', 'expositores.xlsx')
    } catch (error) {
      setFailure(error instanceof ApiError ? error.message : 'No se pudo generar el reporte.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button variant="secondary" onClick={onClick} disabled={busy}>
        {busy ? 'Generando…' : 'Descargar reporte'}
      </Button>
      {failure !== null ? <Notice title={failure} onDismiss={() => setFailure(null)} /> : null}
    </div>
  )
}
