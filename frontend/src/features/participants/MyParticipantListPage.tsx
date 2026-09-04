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
import { useTranslation } from '../i18n/LanguageContext'

const PAGE_SIZE = 20

export function MyParticipantListPage() {
  const { t, lang } = useTranslation()
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
        <Button variant="secondary">{t.dashboard.bulkUpload}</Button>
      </Link>
      <Link to="/stand/credenciales/nueva">
        <Button>{t.dashboard.newCredential}</Button>
      </Link>
    </>
  )

  const selectedPeople = items.filter((person) => selection.isSelected(person.id))
  const only = selectedPeople.length === 1 ? selectedPeople[0] : undefined

  const getSubtitle = () => {
    if (participants.data === undefined) return undefined
    const total = participants.data.total
    if (isFiltered) {
      return lang === 'en'
        ? `${total} search result${total === 1 ? '' : 's'}`
        : `${total} resultado${total === 1 ? '' : 's'} de la búsqueda`
    }
    return lang === 'en'
      ? `${total} registered person${total === 1 ? '' : 's'}`
      : `${total} persona${total === 1 ? '' : 's'} acreditada${total === 1 ? '' : 's'}`
  }

  const bulkActionLabel = lang === 'en'
    ? `Delete ${selection.count} credential${selection.count === 1 ? '' : 's'}`
    : `Eliminar ${selection.count} credencial${selection.count === 1 ? '' : 'es'}`

  const confirmDescription = only !== undefined
    ? lang === 'en'
      ? `The credential for ${only.first_name} ${only.last_name} will be deleted. The quota for category (${only.category}) will be released and the ID will be available again.`
      : `Se eliminará la credencial de ${only.first_name} ${only.last_name}. Se liberará el cupo de su categoría (${only.category}) y su identificación quedará disponible para otro registro.`
    : lang === 'en'
      ? `${selection.count} credentials will be deleted. Category quotas will be released and IDs will become available again.`
      : `Se eliminarán ${selection.count} credenciales. Se liberará el cupo de sus categorías y sus identificaciones quedarán disponibles para otro registro.`

  return (
    <div className="space-y-4">
      <PageHeader
        title={lang === 'en' ? 'Stand Credentials' : 'Credenciales del stand'}
        subtitle={getSubtitle()}
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
          placeholder={lang === 'en' ? 'Search by name, ID, position or email…' : 'Buscar por nombre, identificación, cargo o correo…'}
          aria-label={t.participants.searchAriaLabel}
        />
        <div className="sm:w-48">
          <Select
            label={t.participants.categoryFilter}
            placeholder={t.participants.all}
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
            {t.participants.clearFilters}
          </Button>
        ) : null}
      </FilterBar>

      <BulkBar
        count={selection.count}
        actionLabel={bulkActionLabel}
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
          title={t.participants.emptyStandFilteredTitle}
          description={t.participants.emptyStandFilteredDesc}
          action={
            <Button variant="secondary" onClick={clearFilters}>
              {t.participants.viewAllCredentials}
            </Button>
          }
        />
      ) : participants.data.total === 0 ? (
        <EmptyState
          title={t.participants.emptyStandInitialTitle}
          description={t.participants.emptyStandInitialDesc}
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
                      aria-label={t.participants.selectAllAria}
                    />
                  </TH>
                  <TH>{t.tables.person}</TH>
                  <TH>{t.tables.identification}</TH>
                  <TH className="sm:max-lg:hidden">{t.tables.position}</TH>
                  <TH>{t.tables.category}</TH>
                  <TH>{t.tables.email}</TH>
                </tr>
              </thead>
              <TBody>
                {items.map((person) => (
                  <TR key={person.id} selected={selection.isSelected(person.id)}>
                    <TD className="cell-select">
                      <SelectCheckbox
                        checked={selection.isSelected(person.id)}
                        onChange={() => selection.toggle(person.id)}
                        aria-label={t.participants.selectRowAria.replace('{name}', `${person.first_name} ${person.last_name}`)}
                      />
                    </TD>
                    <TD className="font-medium">
                      {person.first_name} {person.last_name}
                    </TD>
                    <TD label={t.tables.identification} className="tnum text-ink-soft">
                      {person.identification}
                      <span className="label-caps ml-2 sm:max-lg:hidden">
                        {person.identification_type}
                      </span>
                    </TD>
                    <TD label={t.tables.position} className="text-ink-soft sm:max-lg:hidden">
                      {person.position}
                    </TD>
                    <TD label={t.tables.category}>
                      <CategoryBadge category={person.category} />
                      {person.provider_company === null ||
                      person.provider_company === undefined ? null : (
                        <span className="mt-0.5 block text-[11px] text-ink-faint">
                          {person.provider_company}
                        </span>
                      )}
                    </TD>
                    <TD label={t.tables.email}>
                      {person.email ? (
                        <span className="block text-ink-soft sm:max-w-[12rem] sm:truncate lg:max-w-[16rem]">
                          {person.email}
                        </span>
                      ) : (
                        <Status tone="muted" label={t.tables.noEmail} />
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
        title={selection.count === 1 ? (lang === 'en' ? 'Delete this credential' : 'Eliminar esta credencial') : t.participants.deleteConfirmTitle}
        description={confirmDescription}
        confirmLabel={selection.count === 1 ? (lang === 'en' ? 'Delete credential' : 'Eliminar credencial') : t.participants.deleteConfirmButton}
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
