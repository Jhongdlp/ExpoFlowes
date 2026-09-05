import { useNavigate } from 'react-router-dom'

import { HOME_BY_ROLE } from '../features/auth/guards'
import { useSession } from '../features/auth/session'
import { useTranslation } from '../features/i18n/LanguageContext'
import { Button } from './ui/Button'

/** Ruta comodín (`*`): no redirige en silencio, dice que la dirección no existe. */
export function NotFoundPage() {
  const { t } = useTranslation()
  const { user } = useSession()
  const navigate = useNavigate()
  const target = user !== null ? HOME_BY_ROLE[user.role] : '/login'
  const label = user !== null ? t.common.goToPanel : t.common.goToLogin

  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-6">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-8 text-center">
        <p className="text-[28px] font-semibold tracking-tight text-ink-faint">404</p>
        <p className="mt-2 text-[13px] font-semibold text-ink">{t.common.notFoundTitle}</p>
        <p className="mt-1 text-[12px] text-ink-soft">{t.common.notFoundBody}</p>
        <Button className="mt-5 w-full" onClick={() => navigate(target, { replace: true })}>
          {label}
        </Button>
      </div>
    </div>
  )
}
