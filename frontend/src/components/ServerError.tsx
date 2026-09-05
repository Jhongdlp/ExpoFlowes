import type { ErrorDetails } from '../api/client'
import { ApiError } from '../api/client'
import { Notice } from './ui/Notice'

/**
 * Traduce un error del backend a un bloque visible. La UI decide por `code` y usa `details`
 * para dar el dato concreto; ningun rango ni cuota se escribe aqui, todos vienen del
 * servidor (y la mitigacion del riesgo de F9: el cliente no duplica reglas).
 */

interface Range {
  label: string
  min_m2: number
  max_m2: number
}

function readRanges(details: ErrorDetails): Range[] {
  const raw = details.allowed_ranges
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return []
    const row = item as Record<string, unknown>
    return typeof row.label === 'string' &&
      typeof row.min_m2 === 'number' &&
      typeof row.max_m2 === 'number'
      ? [{ label: row.label, min_m2: row.min_m2, max_m2: row.max_m2 }]
      : []
  })
}

function readShortages(details: ErrorDetails): { category: string; quota: number; assigned: number }[] {
  const raw = details.categories
  if (typeof raw !== 'object' || raw === null) return []
  return Object.entries(raw as Record<string, unknown>).flatMap(([category, value]) => {
    if (typeof value !== 'object' || value === null) return []
    const row = value as Record<string, unknown>
    return typeof row.quota === 'number' && typeof row.assigned === 'number'
      ? [{ category, quota: row.quota, assigned: row.assigned }]
      : []
  })
}

export function ServerError({ error, onDismiss }: { error: unknown; onDismiss?: () => void }) {
  if (!(error instanceof ApiError)) {
    return <Notice tone="error" title="Ocurrió un error inesperado. Inténtelo nuevamente." onDismiss={onDismiss} />
  }

  if (error.code === 'STAND_SIZE_OUT_OF_RANGE') {
    const ranges = readRanges(error.details)
    return (
      <Notice tone="error" title={error.message} onDismiss={onDismiss}>
        {ranges.length === 0 ? null : (
          <>
            <p>Rangos configurados para esta feria:</p>
            <ul className="tnum mt-1 space-y-0.5">
              {ranges.map((range) => (
                <li key={range.label}>
                  {range.label}: {range.min_m2} – {range.max_m2} m²
                </li>
              ))}
            </ul>
          </>
        )}
      </Notice>
    )
  }

  if (error.code === 'QUOTA_BELOW_ASSIGNED') {
    const shortages = readShortages(error.details)
    return (
      <Notice tone="error" title={error.message} onDismiss={onDismiss}>
        <ul className="tnum space-y-0.5">
          {shortages.map((row) => (
            <li key={row.category}>
              {row.category}: quedarían {row.quota} credenciales y ya hay {row.assigned}{' '}
              asignadas.
            </li>
          ))}
        </ul>
      </Notice>
    )
  }

  if (error.code === 'QUOTA_EXCEEDED') {
    const { category, quota, used } = error.details
    return (
      <Notice tone="error" title={error.message} onDismiss={onDismiss}>
        {typeof category === 'string' && typeof quota === 'number' && typeof used === 'number' ? (
          <>
            {category}: {used} de {quota} credenciales ya asignadas. Elimine una credencial de
            esa categoría o solicite al organizador un metraje mayor.
          </>
        ) : null}
      </Notice>
    )
  }

  if (error.code === 'PARTICIPANT_ALREADY_REGISTERED') {
    const registeredIn = error.details.registered_in
    return (
      <Notice tone="error" title={error.message} onDismiss={onDismiss}>
        {typeof registeredIn === 'string' ? <>Ya está acreditada por {registeredIn}.</> : null}
      </Notice>
    )
  }

  return <Notice tone="error" title={error.message} onDismiss={onDismiss} />
}

/** Errores de campo que envia el backend en VALIDATION_ERROR, con su ruta con puntos. */
export function fieldErrors(error: unknown): { field: string; message: string }[] {
  if (!(error instanceof ApiError)) return []
  const raw = error.details.fields
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return []
    const row = item as Record<string, unknown>
    return typeof row.field === 'string' && typeof row.message === 'string'
      ? [{ field: row.field, message: row.message }]
      : []
  })
}
