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
import { useUrlState } from '../../hooks/use-url-state'
import { rowExitDelay } from '../../lib/motion'
import { useTranslation } from '../i18n/LanguageContext'

const PAGE_SIZE = 20

export function ExhibitorListPage() {
  const { t, lang } = useTranslation()
  // Busqueda y pagina en la URL: un resultado concreto se puede compartir y recargar.
  const url = useUrlState()
  const { page } = url
  const search = url.get('q')
  const [confirming, setConfirming] = useState(false)
  // Filas marcadas para salir: se les aplica la animacion de salida antes de confirmar el
  // borrado, para que el usuario vea que la accion surtio efecto en vez de un salto seco.
  const [leaving, setLeaving] = useState<ReadonlySet<number>>(new Set())
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
    // Si falla, las filas vuelven a verse: la salida era una promesa de borrado, no el borrado.
    onSettled: () => setLeaving(new Set()),
  })

  const getSubtitle = () => {
    if (exhibitors.data === undefined) return undefined
    const total = exhibitors.data.total
    if (term !== '') {
      return lang === 'en'
        ? `${total} search result${total === 1 ? '' : 's'}`
        : `${total} resultado${total === 1 ? '' : 's'} de la búsqueda`
    }
    return lang === 'en'
      ? `${total} company${total === 1 ? '' : 'ies'} registered in the expo`
      : `${total} empresa${total === 1 ? '' : 's'} registrada${total === 1 ? '' : 's'} en la feria`
  }

  const header = (
    <PageHeader
      title={t.exhibitors.title}
      subtitle={getSubtitle()}
      actions={
        <>
          <DownloadReportButton />
          <Link to="/admin/expositores/nuevo">
            <Button>{t.dashboard.newExhibitor}</Button>
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
        onChange={(value) => url.set('q', value)}
        placeholder={t.exhibitors.searchPlaceholder}
        aria-label={t.exhibitors.searchAriaLabel}
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
          title={error instanceof ApiError ? error.message : t.common.tryAgain}
        >
          {t.common.tryAgain}
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
          title={t.exhibitors.emptyFilteredTitle}
          description={
            lang === 'en'
              ? `No expo company matches "${term}".`
              : `Ninguna empresa de la feria coincide con "${term}".`
          }
          action={
            <Button variant="secondary" onClick={url.clear}>
              {t.exhibitors.viewAllExhibitors}
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
          title={t.exhibitors.emptyInitialTitle}
          description={t.exhibitors.emptyInitialDesc}
          action={
            <Link to="/admin/expositores/nuevo">
              <Button>{t.exhibitors.registerExhibitor}</Button>
            </Link>
          }
        />
      </>
    )
  }

  const categories = rules.data.map((rule) => rule.category)

  const bulkLabel = lang === 'en'
    ? `Delete ${selection.count} exhibitor${selection.count === 1 ? '' : 's'}`
    : `Eliminar ${selection.count} expositor${selection.count === 1 ? '' : 'es'}`

  const confirmDescription = selection.count === 1
    ? lang === 'en'
      ? 'The stand will no longer appear in listings or reports. Already issued credentials are preserved.'
      : 'El stand deja de aparecer en los listados y en el reporte. Sus credenciales ya emitidas se conservan, así que las identificaciones siguen reservadas en esta feria.'
    : lang === 'en'
      ? `The ${selection.count} stands will no longer appear in listings or reports. Already issued credentials are preserved.`
      : `Los ${selection.count} stands dejan de aparecer en los listados y en el reporte. Sus credenciales ya emitidas se conservan, así que las identificaciones siguen reservadas en esta feria.`

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
          actionLabel={bulkLabel}
          onAction={() => setConfirming(true)}
          onClear={selection.clear}
          busy={remove.isPending}
        />
      </div>

      <div
        className={
          refreshing ? 'opacity-60 transition-opacity duration-[120ms]' : 'transition-opacity'
        }
      >
      <Table>
        <thead>
          <tr>
            <TH className="w-10">
              <SelectCheckbox
                checked={selection.allSelected}
                onChange={selection.toggleAll}
                aria-label={lang === 'en' ? 'Select all exhibitors on this page' : 'Seleccionar todos los expositores de esta página'}
              />
            </TH>
            <TH>{t.tables.company}</TH>
            <TH className="sm:max-lg:hidden">{t.tables.identification}</TH>
            <TH className="text-right">{t.tables.standSize}</TH>
            <TH className="sm:max-lg:hidden">{t.tables.category}</TH>
            {categories.map((category) => (
              <TH key={category} className="text-right">
                {t.categories[category as keyof typeof t.categories] ?? category}
              </TH>
            ))}
            <TH className="text-right">{t.tables.total}</TH>
          </tr>
        </thead>
        <TBody>
          {items.map((exhibitor, index) => {
            const assigned = Object.values(exhibitor.assigned).reduce((a, b) => a + b, 0)
            const quota = Object.values(exhibitor.quota).reduce((a, b) => a + b, 0)
            return (
              <TR
                key={exhibitor.id}
                selected={selection.isSelected(exhibitor.id)}
                className={leaving.has(exhibitor.id) ? 'animate-row-out' : 'animate-row-in'}
                style={{ animationDelay: `${Math.min(index, 10) * 20}ms` }}
              >
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
                <TD label={t.tables.identification} className="tnum text-ink-soft sm:max-lg:hidden">
                  {exhibitor.tax_id}
                  <span className="label-caps ml-2">{exhibitor.tax_id_type}</span>
                </TD>
                <TD label={t.tables.standSize} className="tnum text-right sm:text-right">
                  {exhibitor.requested_m2} m²
                </TD>
                <TD label={t.tables.category} className="text-ink-soft sm:max-lg:hidden">
                  {(t.standSizes as Record<string, string>)[exhibitor.stand_category] ?? exhibitor.stand_category}
                </TD>
                {categories.map((category) => (
                  <TD key={category} label={t.categories[category as keyof typeof t.categories] ?? category} className="tnum text-right">
                    {exhibitor.assigned[category] ?? 0}
                    <span className="text-ink-faint"> / {exhibitor.quota[category] ?? 0}</span>
                  </TD>
                ))}
                <TD label={t.tables.total} className="tnum text-right font-medium">
                  {assigned}
                  <span className="font-normal text-ink-faint"> / {quota}</span>
                </TD>
              </TR>
            )
          })}
        </TBody>
      </Table>
      </div>

      <p className="mt-2 text-[11px] text-ink-faint">
        {t.exhibitors.quotaFootnote}
      </p>

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={exhibitors.data.total}
        loading={refreshing}
        onChange={(next) => {
          selection.clear()
          url.setPage(next)
        }}
      />

      <ConfirmDialog
        open={confirming}
        title={selection.count === 1 ? t.exhibitors.deleteSingleTitle : t.exhibitors.deleteConfirmTitle}
        description={confirmDescription}
        confirmLabel={selection.count === 1 ? t.exhibitors.deleteSingleButton : t.exhibitors.deleteConfirmButton}
        busy={remove.isPending}
        onConfirm={() => {
          setConfirming(false)
          const ids = selection.selected
          setLeaving(new Set(ids))
          window.setTimeout(() => remove.mutate(ids), rowExitDelay())
        }}
        onCancel={() => setConfirming(false)}
      />
    </>
  )
}
