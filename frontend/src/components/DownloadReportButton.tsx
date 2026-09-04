import { useState } from 'react'

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
    <div className="relative">
      <Button variant="secondary" loading={busy} onClick={onClick}>
        {busy ? 'Generando…' : 'Descargar Excel'}
      </Button>
      {/* El fallo cuelga del boton, no empuja la cabecera: la fila de acciones no se mueve. */}
      {failure === null ? null : (
        <div className="absolute top-full right-0 z-20 mt-2 w-72">
          <Notice tone="error" title={failure} onDismiss={() => setFailure(null)} />
        </div>
      )}
    </div>
  )
}
