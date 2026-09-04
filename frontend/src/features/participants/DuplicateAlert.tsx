import type { ApiError } from '../../api/client'
import { Button } from '../../components/ui/Button'

/**
 * Validacion critica de §5.4, en pantalla.
 *
 * Es un bloque persistente, NO un toast: el usuario tiene que poder leer que empresa ya
 * registro a esa persona, copiarla y decidir. Un aviso que se desvanece a los tres segundos
 * convierte el requisito en un adorno (§13).
 */
export function DuplicateAlert({ error, onDismiss }: { error: ApiError; onDismiss: () => void }) {
  const identification = error.details.identification
  const registeredIn = error.details.registered_in
  const category = error.details.category

  return (
    <div role="alert" className="border border-ink border-l-4 bg-surface px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[14px] font-semibold">
            Esa persona ya está acreditada en esta feria
          </p>
          <p className="mt-1 text-[13px] text-ink-soft">
            Una misma identificación no puede aparecer en dos stands de la misma edición.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Cerrar
        </Button>
      </div>

      <dl className="mt-4 grid gap-3 border-t border-line pt-4 text-[13px] sm:grid-cols-3">
        <div>
          <dt className="label-caps">Identificación</dt>
          <dd className="tnum mt-0.5">{typeof identification === 'string' ? identification : '—'}</dd>
        </div>
        <div>
          <dt className="label-caps">Registrada por</dt>
          <dd className="mt-0.5 font-semibold">
            {typeof registeredIn === 'string' ? registeredIn : 'Otra empresa de la feria'}
          </dd>
        </div>
        <div>
          <dt className="label-caps">Categoría</dt>
          <dd className="mt-0.5">{typeof category === 'string' ? category : '—'}</dd>
        </div>
      </dl>

      <p className="mt-4 text-[12px] text-ink-faint">
        Si la persona cambió de empresa, la compañía que la registró debe eliminar su
        credencial antes de que usted pueda acreditarla.
      </p>
    </div>
  )
}
