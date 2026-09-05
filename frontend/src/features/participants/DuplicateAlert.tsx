import type { ApiError } from '../../api/client'
import { Button } from '../../components/ui/Button'
import { useTranslation } from '../i18n/LanguageContext'

/**
 * Validacion critica de, en pantalla.
 *
 * Es un bloque persistente, NO un toast: el usuario tiene que poder leer que empresa ya
 * registro a esa persona, copiarla y decidir. Un aviso que se desvanece a los tres segundos
 * convierte el requisito en un adorno.
 */
export function DuplicateAlert({ error, onDismiss }: { error: ApiError; onDismiss: () => void }) {
  const { t } = useTranslation()
  const identification = error.details.identification
  const registeredIn = error.details.registered_in
  const category = error.details.category

  return (
    <div
      role="alert"
      className="animate-rise rounded-lg border border-line border-l-2 border-l-alert bg-alert-soft px-4 py-3.5"
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden="true"
          className="mt-px grid h-4 w-4 shrink-0 place-items-center rounded-full border border-alert text-[10px] leading-none font-bold text-alert"
        >
          !
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-ink">
            Esa persona ya está acreditada en esta feria
          </p>
          <p className="mt-1 text-[12px] text-ink-soft">
            Una misma identificación no puede aparecer en dos stands de la misma edición.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Cerrar
        </Button>
      </div>

      <dl className="mt-3.5 grid gap-3 border-t border-alert/15 pt-3.5 text-[12px] sm:grid-cols-3">
        <div>
          <dt className="label-caps">Identificación</dt>
          <dd className="tnum mt-0.5 text-ink">
            {typeof identification === 'string' ? identification : '—'}
          </dd>
        </div>
        <div>
          <dt className="label-caps">Registrada por</dt>
          <dd className="mt-0.5 font-semibold text-ink">
            {typeof registeredIn === 'string' ? registeredIn : 'Otra empresa de la feria'}
          </dd>
        </div>
        <div>
          <dt className="label-caps">Categoría</dt>
          <dd className="mt-0.5 text-ink">
            {typeof category === 'string'
              ? ((t.categories as Record<string, string>)[category] ?? category)
              : '—'}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-[11px] text-ink-faint">
        Si la persona cambió de empresa, la compañía que la registró debe eliminar su
        credencial antes de que usted pueda acreditarla.
      </p>
    </div>
  )
}
