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
    <div className="flex items-center justify-between gap-4 pt-4">
      <p className="tnum text-[12px] text-ink-faint">
        {first}–{last} de {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
        >
          Anterior
        </Button>
        <span className="tnum text-[12px] text-ink-soft">
          {page} / {lastPage}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange(page + 1)}
          disabled={page >= lastPage}
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}
