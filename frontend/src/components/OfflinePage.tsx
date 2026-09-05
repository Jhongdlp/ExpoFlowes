import { useTranslation } from '../features/i18n/LanguageContext'
import { Button } from './ui/Button'

/** Se muestra a pantalla completa mientras `navigator.onLine` sea falso; ver useOnlineStatus. */
export function OfflinePage() {
  const { t } = useTranslation()

  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-6">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-8 text-center">
        <span
          aria-hidden="true"
          className="mx-auto grid h-10 w-10 place-items-center rounded-full border border-line-strong text-[15px] font-bold text-ink-faint"
        >
          !
        </span>
        <p className="mt-4 text-[13px] font-semibold text-ink">{t.common.offlineTitle}</p>
        <p className="mt-1 text-[12px] text-ink-soft">{t.common.offlineBody}</p>
        <Button className="mt-5 w-full" onClick={() => window.location.reload()}>
          {t.common.retry}
        </Button>
      </div>
    </div>
  )
}
