import { Button } from './ui/Button'

interface Props {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
}

/** Paginacion de todos los listados (§9.5). Dice donde esta el usuario, no solo el numero. */
export function Pagination({ page, pageSize, total, onChange }: Props) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize))
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between gap-3 pt-3">
      <p className="tnum text-[12px] text-ink-faint">
        {first}–{last} <span className="hidden sm:inline">de {total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
        >
          <span className="sm:hidden" aria-hidden="true">
            ←
          </span>
          <span className="hidden sm:inline">Anterior</span>
        </Button>
        <span className="tnum px-1 text-[12px] text-ink-soft">
          {page} / {lastPage}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange(page + 1)}
          disabled={page >= lastPage}
          aria-label="Página siguiente"
        >
          <span className="hidden sm:inline">Siguiente</span>
          <span className="sm:hidden" aria-hidden="true">
            →
          </span>
        </Button>
      </div>
    </div>
  )
}
