import { useTranslation } from '../features/i18n/LanguageContext'
import { Button } from './ui/Button'
import { Spinner } from './ui/Spinner'

interface Props {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
  /** Página siguiente en vuelo: bloquea los controles en vez de dejar que un segundo clic dispare dos saltos. */
  loading?: boolean
}

/** Paginacion de todos los listados (§9.5). Dice donde esta el usuario, no solo el numero. */
export function Pagination({ page, pageSize, total, onChange, loading = false }: Props) {
  const { t } = useTranslation()
  const lastPage = Math.max(1, Math.ceil(total / pageSize))
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between gap-3 pt-3">
      <p className="tnum text-[12px] text-ink-faint">
        {first}–{last} <span className="hidden sm:inline">{t.pagination.showing} {total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1 || loading}
          aria-label={t.pagination.prevPage}
        >
          <span className="sm:hidden" aria-hidden="true">
            ←
          </span>
          <span className="hidden sm:inline">{t.pagination.previous}</span>
        </Button>
        <span className="tnum flex items-center gap-1.5 px-1 text-[12px] text-ink-soft">
          {loading ? <Spinner className="h-3 w-3" /> : null}
          {page} / {lastPage}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange(page + 1)}
          disabled={page >= lastPage || loading}
          aria-label={t.pagination.nextPage}
        >
          <span className="hidden sm:inline">{t.pagination.next}</span>
          <span className="sm:hidden" aria-hidden="true">
            →
          </span>
        </Button>
      </div>
    </div>
  )
}
