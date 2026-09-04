import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { api, ApiError } from '../../api/client'
import type { CredentialRule, ExhibitorPage, ParticipantPage } from '../../api/types'
import { EmptyState } from '../../components/EmptyState'
import { Loading } from '../../components/Loading'
import { PageHeader } from '../../components/PageHeader'
import { Pagination } from '../../components/Pagination'
import { Notice } from '../../components/ui/Notice'
import { Select } from '../../components/ui/Select'
import { Table, TBody, TD, TH } from '../../components/ui/Table'

const PAGE_SIZE = 20

export function ParticipantListPage() {
  const [page, setPage] = useState(1)
  const [exhibitorId, setExhibitorId] = useState('')
  const [category, setCategory] = useState('')

  const rules = useQuery({
    queryKey: ['rules', 'credentials'],
    queryFn: () => api.get<CredentialRule[]>('/rules/credentials'),
    staleTime: Infinity,
  })

  // ponytail: el filtro de empresas trae hasta 100 (el maximo de la paginacion). Con mas
  // expositores habria que cambiarlo por un buscador; hoy la feria no llega ahi.
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

  const filtered = exhibitorId !== '' || category !== ''

  const onFilter = (apply: () => void) => {
    apply()
    setPage(1)
  }

  return (
    <>
      <PageHeader
        title="Credenciales"
        subtitle={
          participants.data === undefined
            ? undefined
            : `${participants.data.total} acreditado${participants.data.total === 1 ? '' : 's'} en la feria`
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
        <Select
          label="Empresa"
          placeholder="Todas las empresas"
          value={exhibitorId}
          onChange={(event) => onFilter(() => setExhibitorId(event.target.value))}
          options={(exhibitors.data?.items ?? []).map((item) => ({
            value: String(item.id),
            label: item.legal_name,
          }))}
        />
        <Select
          label="Categoría"
          placeholder="Todas las categorías"
          value={category}
          onChange={(event) => onFilter(() => setCategory(event.target.value))}
          options={(rules.data ?? []).map((rule) => ({
            value: rule.category,
            label: rule.category,
          }))}
        />
      </div>

      {participants.isPending ? (
        <Loading label="Cargando credenciales" />
      ) : participants.isError ? (
        <Notice
          title={
            participants.error instanceof ApiError
              ? participants.error.message
              : 'No se pudo cargar el listado.'
          }
        >
          Vuelva a intentarlo en unos segundos. Si el problema sigue, avise al equipo técnico.
        </Notice>
      ) : participants.data.total === 0 ? (
        <EmptyState
          title={filtered ? 'Ningún acreditado con esos filtros' : 'Todavía no hay acreditados'}
          description={
            filtered
              ? 'Pruebe con otra empresa o categoría, o quite los filtros para ver la feria completa.'
              : 'Cada representante acredita a su propio personal desde su acceso; aquí aparecerán todos.'
          }
        />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <TH>Persona</TH>
                <TH>Identificación</TH>
                <TH>Empresa</TH>
                <TH>Cargo</TH>
                <TH>Categoría</TH>
                <TH>Correo</TH>
              </tr>
            </thead>
            <TBody>
              {participants.data.items.map((person) => (
                <tr key={person.id} className="hover:bg-fill">
                  <TD>
                    <p className="font-medium">
                      {person.first_name} {person.last_name}
                    </p>
                  </TD>
                  <TD className="tnum text-ink-soft">
                    {person.identification}
                    <p className="label-caps">{person.identification_type}</p>
                  </TD>
                  <TD>
                    <p>{person.exhibitor_name}</p>
                    {person.provider_company === null ? null : (
                      <p className="text-[12px] text-ink-faint">
                        Proveedor: {person.provider_company}
                      </p>
                    )}
                  </TD>
                  <TD className="text-ink-soft">{person.position}</TD>
                  <TD>{person.category}</TD>
                  <TD className="text-ink-soft">
                    {person.email ?? <span className="text-ink-faint">Sin correo</span>}
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
    </>
  )
}
