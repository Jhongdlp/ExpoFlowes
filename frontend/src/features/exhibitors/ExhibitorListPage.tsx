import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { api, ApiError } from '../../api/client'
import type { ExhibitorPage } from '../../api/types'
import { BulkBar, SelectCheckbox } from '../../components/BulkBar'
import { DownloadReportButton } from '../../components/DownloadReportButton'
import { EmptyState } from '../../components/EmptyState'
import { TableSkeleton } from '../../components/Loading'
import { PageHeader } from '../../components/PageHeader'
import { Pagination } from '../../components/Pagination'
import { FilterBar, SearchInput } from '../../components/SearchInput'
import { ServerError } from '../../components/ServerError'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Notice } from '../../components/ui/Notice'
import { Table, TBody, TD, TH, TR } from '../../components/ui/Table'
import { useDebounced } from '../../hooks/use-debounced'
import { useCredentialRules } from '../../hooks/use-rules'
import { useSelection } from '../../hooks/use-selection'

const PAGE_SIZE = 20

export function ExhibitorListPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [confirming, setConfirming] = useState(false)
  const queryClient = useQueryClient()

  // Busca el servidor, sobre todo el evento: por razon social, nombre del stand, RUC o direccion.
  const term = useDebounced(search)

  // Las categorias de credencial salen de las reglas del evento: la tabla no las conoce.
  const rules = useCredentialRules()

  const query = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
  if (term !== '') query.set('search', term)

  const exhibitors = useQuery({
    queryKey: ['exhibitors', query.toString()],
    queryFn: () => api.get<ExhibitorPage>(`/exhibitors?${query.toString()}`),
    placeholderData: (previous) => previous,
  })

  const items = exhibitors.data?.items ?? []
  const selection = useSelection(items.map((item) => item.id))

  const remove = useMutation({
    // En serie: cada baja es un soft delete propio y asi el primer fallo no deja el lote a medias
    // sin que se sepa donde paro.
    mutationFn: async (ids: readonly number[]) => {
      for (const id of ids) await api.delete<void>(`/exhibitors/${id}`)
    },
    onSuccess: async () => {
      selection.clear()
      await queryClient.invalidateQueries({ queryKey: ['exhibitors'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const header = (
    <PageHeader
      title="Expositores"
      subtitle={
        exhibitors.data === undefined
          ? undefined
          : term !== ''
            ? `${exhibitors.data.total} resultado${exhibitors.data.total === 1 ? '' : 's'} de la búsqueda`
            : `${exhibitors.data.total} empresa${exhibitors.data.total === 1 ? '' : 's'} registrada${exhibitors.data.total === 1 ? '' : 's'} en la feria`
      }
      actions={
        <>
          <DownloadReportButton />
          <Link to="/admin/expositores/nuevo">
            <Button>Nuevo expositor</Button>
          </Link>
        </>
      }
    />
  )

  const refreshing = exhibitors.isFetching && !exhibitors.isPending

  const searchBar = (
    <FilterBar className="mb-4">
      <SearchInput
        value={search}
        busy={refreshing}
        onChange={(value) => {
          setSearch(value)
          setPage(1)
        }}
        placeholder="Buscar por razón social, stand, RUC o dirección…"
        aria-label="Buscar expositores"
      />
    </FilterBar>
  )

  if (exhibitors.isPending || rules.isPending) {
    return (
      <>
        {header}
        {searchBar}
        <TableSkeleton columns={7} />
      </>
    )
  }

  if (exhibitors.isError || rules.isError) {
    const error = exhibitors.error ?? rules.error
    return (
      <>
        {header}
        <Notice
          tone="error"
          title={error instanceof ApiError ? error.message : 'No se pudo cargar el listado.'}
        >
          Vuelva a intentarlo en unos segundos. Si el problema sigue, avise al equipo técnico.
        </Notice>
      </>
    )
  }

  if (exhibitors.data.total === 0 && term !== '') {
    return (
      <>
        {header}
        {searchBar}
        <EmptyState
          title="Sin resultados"
          description={`Ninguna empresa de la feria coincide con "${term}".`}
          action={
            <Button variant="secondary" onClick={() => setSearch('')}>
              Ver todos los expositores
            </Button>
          }
        />
      </>
    )
  }

  if (exhibitors.data.total === 0) {
    return (
      <>
        {header}
        <EmptyState
          title="Todavía no hay expositores"
          description="Registre la primera empresa: al crearla, su representante recibe el enlace de acceso y puede empezar a acreditar personal."
          action={
            <Link to="/admin/expositores/nuevo">
              <Button>Registrar expositor</Button>
            </Link>
          }
        />
      </>
    )
  }

  const categories = rules.data.map((rule) => rule.category)

  return (
    <>
      {header}
      {searchBar}

      {remove.error === null ? null : (
        <div className="mb-4">
          <ServerError error={remove.error} onDismiss={() => remove.reset()} />
        </div>
      )}

      <div className="mb-4 empty:mb-0">
        <BulkBar
          count={selection.count}
          actionLabel={`Eliminar ${selection.count} expositor${selection.count === 1 ? '' : 'es'}`}
          onAction={() => setConfirming(true)}
          onClear={selection.clear}
          busy={remove.isPending}
        />
      </div>

      <Table>
        <thead>
          <tr>
            <TH className="w-10">
              <SelectCheckbox
                checked={selection.allSelected}
                onChange={selection.toggleAll}
                aria-label="Seleccionar todos los expositores de esta página"
              />
            </TH>
            <TH>Empresa</TH>
            <TH className="sm:max-lg:hidden">Identificación</TH>
            <TH className="text-right">Metraje</TH>
            <TH className="sm:max-lg:hidden">Categoría</TH>
            {categories.map((category) => (
              <TH key={category} className="text-right">
                {category}
              </TH>
            ))}
            <TH className="text-right">Total</TH>
          </tr>
        </thead>
        <TBody>
          {items.map((exhibitor) => {
            const assigned = Object.values(exhibitor.assigned).reduce((a, b) => a + b, 0)
            const quota = Object.values(exhibitor.quota).reduce((a, b) => a + b, 0)
            return (
              <TR key={exhibitor.id} selected={selection.isSelected(exhibitor.id)}>
                <TD className="cell-select">
                  <SelectCheckbox
                    checked={selection.isSelected(exhibitor.id)}
                    onChange={() => selection.toggle(exhibitor.id)}
                    aria-label={`Seleccionar ${exhibitor.legal_name}`}
                  />
                </TD>
                <TD>
                  <Link
                    to={`/admin/expositores/${exhibitor.id}`}
                    className="font-medium underline decoration-line-strong underline-offset-2 transition-colors duration-[120ms] hover:decoration-ink"
                  >
                    {exhibitor.legal_name}
                  </Link>
                  <span className="block text-[11px] text-ink-faint">{exhibitor.stand_name}</span>
                </TD>
                <TD label="Identificación" className="tnum text-ink-soft sm:max-lg:hidden">
                  {exhibitor.tax_id}
                  <span className="label-caps ml-2">{exhibitor.tax_id_type}</span>
                </TD>
                <TD label="Metraje" className="tnum text-right sm:text-right">
                  {exhibitor.requested_m2} m²
                </TD>
                <TD label="Categoría" className="text-ink-soft sm:max-lg:hidden">
                  {exhibitor.stand_category}
                </TD>
                {categories.map((category) => (
                  <TD key={category} label={category} className="tnum text-right">
                    {exhibitor.assigned[category] ?? 0}
                    <span className="text-ink-faint"> / {exhibitor.quota[category] ?? 0}</span>
                  </TD>
                ))}
                <TD label="Total" className="tnum text-right font-medium">
                  {assigned}
                  <span className="font-normal text-ink-faint"> / {quota}</span>
                </TD>
              </TR>
            )
          })}
        </TBody>
      </Table>

      <p className="mt-2 text-[11px] text-ink-faint">
        Por categoría de credencial: asignadas / cuota. La cuota se recalcula con el metraje y
        las reglas vigentes de la feria.
      </p>

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={exhibitors.data.total}
        onChange={(next) => {
          selection.clear()
          setPage(next)
        }}
      />

      <ConfirmDialog
        open={confirming}
        title={selection.count === 1 ? 'Eliminar este expositor' : 'Eliminar expositores'}
        description={`${selection.count === 1 ? 'El stand deja' : `Los ${selection.count} stands dejan`} de aparecer en los listados y en el reporte. Sus credenciales ya emitidas se conservan, así que las identificaciones siguen reservadas en esta feria.`}
        confirmLabel={selection.count === 1 ? 'Eliminar expositor' : 'Eliminar expositores'}
        busy={remove.isPending}
        onConfirm={() => {
          setConfirming(false)
          remove.mutate(selection.selected)
        }}
        onCancel={() => setConfirming(false)}
      />
    </>
  )
}
