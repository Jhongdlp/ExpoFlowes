import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { api, ApiError } from '../../api/client'
import type { ExhibitorPage, ParticipantPage } from '../../api/types'
import { CategoryBadge } from '../../components/CategoryBadge'
import { EmptyState } from '../../components/EmptyState'
import { TableSkeleton } from '../../components/Loading'
import { PageHeader } from '../../components/PageHeader'
import { Pagination } from '../../components/Pagination'
import { FilterBar, SearchInput } from '../../components/SearchInput'
import { Button } from '../../components/ui/Button'
import { Notice } from '../../components/ui/Notice'
import { Select } from '../../components/ui/Select'
import { Status } from '../../components/ui/Status'
import { Table, TBody, TD, TH, TR } from '../../components/ui/Table'
import { useDebounced } from '../../hooks/use-debounced'
import { useCredentialRules } from '../../hooks/use-rules'

const PAGE_SIZE = 20

export function ParticipantListPage() {
  const [page, setPage] = useState(1)
  const [exhibitorId, setExhibitorId] = useState('')
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')

  // La busqueda la resuelve el servidor sobre TODO el evento, no sobre la pagina cargada:
  // filtrar en el cliente solo encontraba a quien ya estaba a la vista.
  const term = useDebounced(search)

  const rules = useCredentialRules()

  const exhibitors = useQuery({
    queryKey: ['exhibitors', 'filter'],
    queryFn: () => api.get<ExhibitorPage>('/exhibitors?page=1&page_size=100'),
    staleTime: Infinity,
  })

  const query = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
  if (exhibitorId !== '') query.set('exhibitor_id', exhibitorId)
  if (category !== '') query.set('category', category)
  if (term !== '') query.set('search', term)

  const participants = useQuery({
    queryKey: ['participants', query.toString()],
    queryFn: () => api.get<ParticipantPage>(`/participants?${query.toString()}`),
    placeholderData: (previous) => previous,
  })

  const isFiltered = exhibitorId !== '' || category !== '' || term !== ''

  const onFilter = (apply: () => void) => {
    apply()
    setPage(1)
  }

  const clearFilters = () => {
    setExhibitorId('')
    setCategory('')
    setSearch('')
    setPage(1)
  }

  const items = participants.data?.items ?? []
  const refreshing = participants.isFetching && !participants.isPending

  return (
    <div className="space-y-4">
      <PageHeader
        title="Credenciales"
        subtitle={
          participants.data === undefined
            ? undefined
            : isFiltered
              ? `${participants.data.total} resultado${participants.data.total === 1 ? '' : 's'} de la búsqueda`
              : `${participants.data.total} acreditado${participants.data.total === 1 ? '' : 's'} en la feria`
        }
      />

      <FilterBar className="flex-col sm:flex-col sm:items-stretch">
        <SearchInput
          value={search}
          busy={refreshing}
          onChange={(value) => onFilter(() => setSearch(value))}
          placeholder="Buscar por nombre, identificación, empresa, cargo o correo…"
          aria-label="Buscar credenciales"
          autoFocus
        />

        <div className="flex flex-col gap-3 border-t border-line pt-3 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-3 sm:max-w-xl sm:grid-cols-2">
            <Select
              label="Empresa / Stand"
              placeholder="Todas"
              value={exhibitorId}
              onChange={(event) => onFilter(() => setExhibitorId(event.target.value))}
              options={(exhibitors.data?.items ?? []).map((item) => ({
                value: String(item.id),
                label: item.legal_name,
              }))}
            />
            <Select
              label="Categoría"
              placeholder="Todas"
              value={category}
              onChange={(event) => onFilter(() => setCategory(event.target.value))}
              options={(rules.data ?? []).map((rule) => ({
                value: rule.category,
                label: rule.category,
              }))}
            />
          </div>

          {isFiltered ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          ) : null}
        </div>
      </FilterBar>

      {participants.isPending ? (
        <TableSkeleton columns={6} />
      ) : participants.isError ? (
        <Notice
          tone="error"
          title={
            participants.error instanceof ApiError
              ? participants.error.message
              : 'No se pudo cargar el listado de credenciales.'
          }
        >
          Vuelva a intentarlo en unos momentos o verifique la conexión con el servidor.
        </Notice>
      ) : participants.data.total === 0 ? (
        <EmptyState
          title={isFiltered ? 'Ningún acreditado con esos filtros' : 'Todavía no hay acreditados'}
          description={
            isFiltered
              ? 'Pruebe con otro término de búsqueda, otra empresa o categoría, o limpie los filtros para ver toda la feria.'
              : 'Cada representante acredita a su propio personal desde su panel; aquí aparecerán todas las credenciales emitidas.'
          }
          action={
            isFiltered ? (
              <Button variant="secondary" onClick={clearFilters}>
                Ver todas las credenciales
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <div
            className={
              refreshing ? 'opacity-60 transition-opacity duration-[120ms]' : 'transition-opacity'
            }
          >
            <Table>
              <thead>
                <tr>
                  <TH>Persona</TH>
                  <TH>Identificación</TH>
                  <TH>Empresa / Stand</TH>
                  <TH className="sm:max-lg:hidden">Cargo</TH>
                  <TH>Categoría</TH>
                  <TH className="sm:max-lg:hidden">Correo</TH>
                </tr>
              </thead>
              <TBody>
                {items.map((person) => (
                  <TR key={person.id}>
                    <TD className="font-medium">
                      {person.first_name} {person.last_name}
                    </TD>
                    <TD label="Identificación" className="tnum text-ink-soft">
                      {person.identification}
                      <span className="label-caps ml-2">{person.identification_type}</span>
                    </TD>
                    <TD label="Empresa">
                      {person.exhibitor_name}
                      {person.provider_company === null ||
                      person.provider_company === undefined ? null : (
                        <span className="mt-0.5 block text-[11px] text-ink-faint">
                          Proveedor: {person.provider_company}
                        </span>
                      )}
                    </TD>
                    <TD label="Cargo" className="text-ink-soft sm:max-lg:hidden">
                      {person.position}
                    </TD>
                    <TD label="Categoría">
                      <CategoryBadge category={person.category} />
                    </TD>
                    <TD label="Correo" className="sm:max-lg:hidden">
                      {person.email ? (
                        <span className="block text-ink-soft sm:max-w-[16rem] sm:truncate">
                          {person.email}
                        </span>
                      ) : (
                        <Status tone="muted" label="Sin correo" />
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={participants.data.total}
            onChange={setPage}
          />
        </>
      )}
    </div>
  )
}
