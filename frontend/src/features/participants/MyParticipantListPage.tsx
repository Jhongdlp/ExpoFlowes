import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { api } from '../../api/client'
import type { MyParticipantPage } from '../../api/types'
import { BulkBar, SelectCheckbox } from '../../components/BulkBar'
import { CategoryBadge } from '../../components/CategoryBadge'
import { EmptyState } from '../../components/EmptyState'
import { TableSkeleton } from '../../components/Loading'
import { PageHeader } from '../../components/PageHeader'
import { Pagination } from '../../components/Pagination'
import { FilterBar, SearchInput } from '../../components/SearchInput'
import { ServerError } from '../../components/ServerError'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Select } from '../../components/ui/Select'
import { Status } from '../../components/ui/Status'
import { Table, TBody, TD, TH, TR } from '../../components/ui/Table'
import { useDebounced } from '../../hooks/use-debounced'
import { useCredentialRules } from '../../hooks/use-rules'
import { useSelection } from '../../hooks/use-selection'

const PAGE_SIZE = 20

export function MyParticipantListPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [confirming, setConfirming] = useState(false)
  const queryClient = useQueryClient()

  // El servidor busca sobre TODAS las credenciales del stand, no solo sobre la pagina a la
  // vista; se espera a que el termino se estabilice para no consultar por cada tecla.
  const term = useDebounced(search)

  const rules = useCredentialRules()

  const query = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
  if (category !== '') query.set('category', category)
  if (term !== '') query.set('search', term)

  const participants = useQuery({
    queryKey: ['me', 'participants', query.toString()],
    queryFn: () => api.get<MyParticipantPage>(`/me/participants?${query.toString()}`),
    placeholderData: (previous) => previous,
  })

  const items = participants.data?.items ?? []
  const selection = useSelection(items.map((person) => person.id))
  const isFiltered = term !== '' || category !== ''
  // Refrescando con datos ya en pantalla: se avisa sin vaciar la tabla.
  const refreshing = participants.isFetching && !participants.isPending

  const filter = (apply: () => void) => {
    apply()
    setPage(1)
  }

  const clearFilters = () => {
    setSearch('')
    setCategory('')
    setPage(1)
  }

  const remove = useMutation({
    // En serie, no en paralelo: cada baja toca el cupo del stand con la fila bloqueada (§9.3).
    mutationFn: async (ids: readonly number[]) => {
      for (const id of ids) await api.delete<void>(`/me/participants/${id}`)
    },
    onSuccess: async () => {
      selection.clear()
      await queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })

  const actions = (
    <>
      <Link to="/stand/credenciales/carga">
        <Button variant="secondary">Carga masiva</Button>
      </Link>
      <Link to="/stand/credenciales/nueva">
        <Button>Nueva credencial</Button>
      </Link>
    </>
  )

  const selectedPeople = items.filter((person) => selection.isSelected(person.id))
  const only = selectedPeople.length === 1 ? selectedPeople[0] : undefined

  return (
    <div className="space-y-4">
      <PageHeader
        title="Credenciales del stand"
        subtitle={
          participants.data === undefined
            ? undefined
            : isFiltered
              ? `${participants.data.total} resultado${participants.data.total === 1 ? '' : 's'} de la búsqueda`
              : `${participants.data.total} persona${participants.data.total === 1 ? '' : 's'} acreditada${participants.data.total === 1 ? '' : 's'}`
        }
        actions={actions}
      />

      {remove.error === null || remove.error === undefined ? null : (
        <ServerError error={remove.error} onDismiss={() => remove.reset()} />
      )}

      <FilterBar>
        <SearchInput
          value={search}
          busy={refreshing}
          onChange={(value) => filter(() => setSearch(value))}
          placeholder="Buscar por nombre, identificación, cargo o correo…"
          aria-label="Buscar credenciales"
        />
        <div className="sm:w-48">
          <Select
            label="Categoría"
            placeholder="Todas"
            value={category}
            onChange={(event) => filter(() => setCategory(event.target.value))}
            options={(rules.data ?? []).map((rule) => ({
              value: rule.category,
              label: rule.category,
            }))}
          />
        </div>
        {isFiltered ? (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Limpiar
          </Button>
        ) : null}
      </FilterBar>

      <BulkBar
        count={selection.count}
        actionLabel={`Eliminar ${selection.count} credencial${selection.count === 1 ? '' : 'es'}`}
        onAction={() => setConfirming(true)}
        onClear={selection.clear}
        busy={remove.isPending}
      />

      {participants.isPending ? (
        <TableSkeleton columns={6} />
      ) : participants.isError ? (
        <ServerError error={participants.error} />
      ) : participants.data.total === 0 && isFiltered ? (
        <EmptyState
          title="Sin resultados"
          description="Ningún acreditado de su stand coincide con esa búsqueda o categoría."
          action={
            <Button variant="secondary" onClick={clearFilters}>
              Ver todas las credenciales
            </Button>
          }
        />
      ) : participants.data.total === 0 ? (
        <EmptyState
          title="Todavía no ha acreditado a nadie"
          description="Registre al personal que operará su stand. Cada persona consume una credencial de su categoría."
          action={actions}
        />
      ) : (
        <>
          {/* Al refrescar, la tabla baja de opacidad en lugar de desaparecer: sin salto. */}
          <div
            className={
              refreshing ? 'opacity-60 transition-opacity duration-[120ms]' : 'transition-opacity'
            }
          >
            <Table>
              <thead>
                <tr>
                  <TH className="w-9">
                    <SelectCheckbox
                      checked={selection.allSelected}
                      onChange={selection.toggleAll}
                      aria-label="Seleccionar todas las credenciales de esta página"
                    />
                  </TH>
                  <TH>Persona</TH>
                  <TH>Identificación</TH>
                  <TH className="sm:max-lg:hidden">Cargo</TH>
                  <TH>Categoría</TH>
                  <TH>Correo</TH>
                </tr>
              </thead>
              <TBody>
                {items.map((person) => (
                  <TR key={person.id} selected={selection.isSelected(person.id)}>
                    <TD className="cell-select">
                      <SelectCheckbox
                        checked={selection.isSelected(person.id)}
                        onChange={() => selection.toggle(person.id)}
                        aria-label={`Seleccionar a ${person.first_name} ${person.last_name}`}
                      />
                    </TD>
                    <TD className="font-medium">
                      {person.first_name} {person.last_name}
                    </TD>
                    <TD label="Identificación" className="tnum text-ink-soft">
                      {person.identification}
                      {/* El tipo de documento cede el sitio en la banda donde la tabla no
                          cabe: el numero es la clave, el tipo es la acotacion. */}
                      <span className="label-caps ml-2 sm:max-lg:hidden">
                        {person.identification_type}
                      </span>
                    </TD>
                    <TD label="Cargo" className="text-ink-soft sm:max-lg:hidden">
                      {person.position}
                    </TD>
                    <TD label="Categoría">
                      <CategoryBadge category={person.category} />
                      {person.provider_company === null ||
                      person.provider_company === undefined ? null : (
                        <span className="mt-0.5 block text-[11px] text-ink-faint">
                          {person.provider_company}
                        </span>
                      )}
                    </TD>
                    <TD label="Correo">
                      {person.email ? (
                        <span className="block text-ink-soft sm:max-w-[12rem] sm:truncate lg:max-w-[16rem]">
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
            onChange={(next) => {
              selection.clear()
              setPage(next)
            }}
          />
        </>
      )}

      <ConfirmDialog
        open={confirming}
        title={selection.count === 1 ? 'Eliminar esta credencial' : 'Eliminar credenciales'}
        description={
          only !== undefined
            ? `Se eliminará la credencial de ${only.first_name} ${only.last_name}. Se liberará el cupo de su categoría (${only.category}) y su identificación quedará disponible para otro registro.`
            : `Se eliminarán ${selection.count} credenciales. Se liberará el cupo de sus categorías y sus identificaciones quedarán disponibles para otro registro.`
        }
        confirmLabel={selection.count === 1 ? 'Eliminar credencial' : 'Eliminar credenciales'}
        busy={remove.isPending}
        onConfirm={() => {
          remove.mutate(selection.selected)
          setConfirming(false)
        }}
        onCancel={() => setConfirming(false)}
      />
    </div>
  )
}
