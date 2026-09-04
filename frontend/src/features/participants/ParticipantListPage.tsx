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
import { useTranslation } from '../i18n/LanguageContext'

const PAGE_SIZE = 20

export function ParticipantListPage() {
  const { t, lang } = useTranslation()
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

  const getSubtitle = () => {
    if (participants.data === undefined) return undefined
    const total = participants.data.total
    if (isFiltered) {
      return lang === 'en'
        ? `${total} search result${total === 1 ? '' : 's'}`
        : `${total} resultado${total === 1 ? '' : 's'} de la búsqueda`
    }
    return lang === 'en'
      ? `${total} registered credential${total === 1 ? '' : 's'} in the expo`
      : `${total} acreditado${total === 1 ? '' : 's'} en la feria`
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t.participants.title}
        subtitle={getSubtitle()}
      />

      <FilterBar className="flex-col sm:flex-col sm:items-stretch">
        <SearchInput
          value={search}
          busy={refreshing}
          onChange={(value) => onFilter(() => setSearch(value))}
          placeholder={t.participants.searchPlaceholder}
          aria-label={t.participants.searchAriaLabel}
          autoFocus
        />

        <div className="flex flex-col gap-3 border-t border-line pt-3 sm:flex-row sm:items-end">
          <div className="grid flex-1 gap-3 sm:max-w-xl sm:grid-cols-2">
            <Select
              label={t.participants.companyFilter}
              placeholder={t.participants.all}
              value={exhibitorId}
              onChange={(event) => onFilter(() => setExhibitorId(event.target.value))}
              options={(exhibitors.data?.items ?? []).map((item) => ({
                value: String(item.id),
                label: item.legal_name,
              }))}
            />
            <Select
              label={t.participants.categoryFilter}
              placeholder={t.participants.all}
              value={category}
              onChange={(event) => onFilter(() => setCategory(event.target.value))}
              options={(rules.data ?? []).map((rule) => ({
                value: rule.category,
                label: (t.categories as Record<string, string>)[rule.category] ?? rule.category,
              }))}
            />
          </div>

          {isFiltered ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              {t.participants.clearFilters}
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
              : t.common.tryAgain
          }
        >
          {t.common.tryAgain}
        </Notice>
      ) : participants.data.total === 0 ? (
        <EmptyState
          title={isFiltered ? t.participants.emptyFilteredTitle : t.participants.emptyInitialTitle}
          description={
            isFiltered
              ? t.participants.emptyFilteredDesc
              : t.participants.emptyInitialDesc
          }
          action={
            isFiltered ? (
              <Button variant="secondary" onClick={clearFilters}>
                {t.participants.viewAllCredentials}
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
                  <TH>{t.tables.person}</TH>
                  <TH>{t.tables.identification}</TH>
                  <TH>{t.tables.companyStand}</TH>
                  <TH className="sm:max-lg:hidden">{t.tables.position}</TH>
                  <TH>{t.tables.category}</TH>
                  <TH className="sm:max-lg:hidden">{t.tables.email}</TH>
                </tr>
              </thead>
              <TBody>
                {items.map((person) => (
                  <TR key={person.id}>
                    <TD className="font-medium">
                      {person.first_name} {person.last_name}
                    </TD>
                    <TD label={t.tables.identification} className="tnum text-ink-soft">
                      {person.identification}
                      <span className="label-caps ml-2">{person.identification_type}</span>
                    </TD>
                    <TD label={t.tables.company}>
                      {person.exhibitor_name}
                      {person.provider_company === null ||
                      person.provider_company === undefined ? null : (
                        <span className="mt-0.5 block text-[11px] text-ink-faint">
                          {t.tables.provider}: {person.provider_company}
                        </span>
                      )}
                    </TD>
                    <TD label={t.tables.position} className="text-ink-soft sm:max-lg:hidden">
                      {person.position}
                    </TD>
                    <TD label={t.tables.category}>
                      <CategoryBadge category={person.category} />
                    </TD>
                    <TD label={t.tables.email} className="sm:max-lg:hidden">
                      {person.email ? (
                        <span className="block text-ink-soft sm:max-w-[16rem] sm:truncate">
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
            onChange={setPage}
          />
        </>
      )}
    </div>
  )
}
