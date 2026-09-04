import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Mail, MailX, Building2, X } from 'lucide-react'

import { api, ApiError } from '../../api/client'
import type { CredentialRule, ExhibitorPage, ParticipantPage } from '../../api/types'
import { Avatar } from '../../components/Avatar'
import { CategoryBadge } from '../../components/CategoryBadge'
import { CategorySelect } from '../../components/CategorySelect'
import { EmptyState } from '../../components/EmptyState'
import { Loading } from '../../components/Loading'
import { PageHeader } from '../../components/PageHeader'
import { Pagination } from '../../components/Pagination'
import { SearchInput, normalizeText } from '../../components/SearchInput'
import { Button } from '../../components/ui/Button'
import { Notice } from '../../components/ui/Notice'
import { Select } from '../../components/ui/Select'
import { Table, TBody, TD, TH } from '../../components/ui/Table'

const PAGE_SIZE = 20

export function ParticipantListPage() {
  const [page, setPage] = useState(1)
  const [exhibitorId, setExhibitorId] = useState('')
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')

  const rules = useQuery({
    queryKey: ['rules', 'credentials'],
    queryFn: () => api.get<CredentialRule[]>('/rules/credentials'),
    staleTime: Infinity,
  })

  const exhibitors = useQuery({
    queryKey: ['exhibitors', 'filter'],
    queryFn: () => api.get<ExhibitorPage>('/exhibitors?page=1&page_size=100'),
    staleTime: Infinity,
  })

  const query = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
  if (exhibitorId !== '') query.set('exhibitor_id', exhibitorId)
  if (category !== '') query.set('category', category)

  const participants = useQuery({
    queryKey: ['participants', query.toString()],
    queryFn: () => api.get<ParticipantPage>(`/participants?${query.toString()}`),
    placeholderData: (previous) => previous,
  })

  const isFiltered = exhibitorId !== '' || category !== '' || search !== ''

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

  // Filtrado universal en tiempo real
  const allItems = participants.data?.items ?? []
  const q = normalizeText(search)
  const visibleItems =
    q === ''
      ? allItems
      : allItems.filter((person) => {
          const fullName = normalizeText(`${person.first_name} ${person.last_name}`)
          const id = normalizeText(person.identification)
          const exhibitor = normalizeText(person.exhibitor_name)
          const provider = normalizeText(person.provider_company)
          const position = normalizeText(person.position)
          const email = normalizeText(person.email)
          const categoryName = normalizeText(person.category)

          return (
            fullName.includes(q) ||
            id.includes(q) ||
            exhibitor.includes(q) ||
            provider.includes(q) ||
            position.includes(q) ||
            email.includes(q) ||
            categoryName.includes(q)
          )
        })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credenciales"
        subtitle={
          participants.data === undefined
            ? undefined
            : isFiltered && visibleItems.length !== participants.data.total
              ? `Mostrando ${visibleItems.length} de ${participants.data.total} acreditados`
              : `${participants.data.total} acreditado${participants.data.total === 1 ? '' : 's'} en la feria`
        }
      />

      {/* Barra de busqueda y filtros */}
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
        {/* Buscador universal por teclado */}
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre, cédula/RUC, empresa, cargo o correo..."
          autoFocus
        />

        {/* Desplegables de filtro */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-t border-line/60 pt-3">
          <div className="grid gap-3 sm:grid-cols-2 flex-1 max-w-xl">
            <Select
              label="Empresa / Stand"
              placeholder="Todas las empresas"
              value={exhibitorId}
              onChange={(event) => onFilter(() => setExhibitorId(event.target.value))}
              options={(exhibitors.data?.items ?? []).map((item) => ({
                value: String(item.id),
                label: item.legal_name,
              }))}
            />
            <CategorySelect
              label="Categoría"
              placeholder="Todas las categorías"
              value={category}
              onChange={(val) => onFilter(() => setCategory(val))}
              categories={(rules.data ?? []).map((rule) => rule.category)}
            />
          </div>

          {isFiltered ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-1.5 text-ink-faint hover:text-ink self-start sm:self-auto"
            >
              <X className="h-3.5 w-3.5" />
              <span>Limpiar filtros</span>
            </Button>
          ) : null}
        </div>
      </div>

      {participants.isPending ? (
        <Loading label="Cargando credenciales…" />
      ) : participants.isError ? (
        <Notice
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
              ? 'Pruebe seleccionando otra empresa o categoría, o limpie los filtros para ver toda la feria.'
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
      ) : visibleItems.length === 0 ? (
        <EmptyState
          title="Sin resultados para la búsqueda"
          description={`No encontramos ningún acreditado que coincida con "${search}".`}
          action={
            <Button variant="secondary" onClick={() => setSearch('')}>
              Limpiar búsqueda
            </Button>
          }
        />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <TH>Persona</TH>
                <TH>Identificación</TH>
                <TH>Empresa / Stand</TH>
                <TH>Cargo</TH>
                <TH>Categoría</TH>
                <TH>Contacto</TH>
              </tr>
            </thead>
            <TBody>
              {visibleItems.map((person) => (
                <tr
                  key={person.id}
                  className="even:bg-fill/25 hover:bg-fill/60 transition-colors"
                >
                  {/* Persona con Avatar */}
                  <TD>
                    <div className="flex items-center gap-3">
                      <Avatar
                        firstName={person.first_name}
                        lastName={person.last_name}
                        identification={person.identification}
                        email={person.email}
                      />
                      <div>
                        <p className="font-semibold text-ink leading-tight">
                          {person.first_name} {person.last_name}
                        </p>
                        <p className="text-[11px] text-ink-faint mt-0.5 sm:hidden">
                          {person.position}
                        </p>
                      </div>
                    </div>
                  </TD>

                  {/* Identificacion */}
                  <TD className="tnum">
                    <p className="font-medium text-ink">{person.identification}</p>
                    <p className="label-caps mt-0.5 text-[10px]">{person.identification_type}</p>
                  </TD>

                  {/* Empresa */}
                  <TD>
                    <div className="flex items-start gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-ink-faint shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-ink">{person.exhibitor_name}</p>
                        {person.provider_company ? (
                          <p className="text-[11px] text-ink-faint mt-0.5">
                            Proveedor: {person.provider_company}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </TD>

                  {/* Cargo */}
                  <TD className="text-ink-soft">{person.position}</TD>

                  {/* Categoria */}
                  <TD>
                    <CategoryBadge category={person.category} />
                  </TD>

                  {/* Correo */}
                  <TD>
                    {person.email ? (
                      <div className="flex items-center gap-1.5 text-ink-soft">
                        <Mail className="h-3.5 w-3.5 text-ink-faint shrink-0" />
                        <span className="truncate max-w-[200px]">{person.email}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-ink-faint">
                        <MailX className="h-3.5 w-3.5 text-ink-faint shrink-0" />
                        <span className="text-[12px] italic">Sin correo</span>
                      </div>
                    )}
                  </TD>
                </tr>
              ))}
            </TBody>
          </Table>

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
