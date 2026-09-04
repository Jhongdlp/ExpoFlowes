import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { api, ApiError } from '../../api/client'
import type { CredentialRule, ExhibitorPage } from '../../api/types'
import { DownloadReportButton } from '../../components/DownloadReportButton'
import { EmptyState } from '../../components/EmptyState'
import { Loading } from '../../components/Loading'
import { PageHeader } from '../../components/PageHeader'
import { Pagination } from '../../components/Pagination'
import { Button } from '../../components/ui/Button'
import { Notice } from '../../components/ui/Notice'
import { Table, TBody, TD, TH } from '../../components/ui/Table'

const PAGE_SIZE = 20

export function ExhibitorListPage() {
  const [page, setPage] = useState(1)

  // Las categorias de credencial salen de las reglas del evento: la tabla no las conoce.
  const rules = useQuery({
    queryKey: ['rules', 'credentials'],
    queryFn: () => api.get<CredentialRule[]>('/rules/credentials'),
    staleTime: Infinity,
  })

  const exhibitors = useQuery({
    queryKey: ['exhibitors', page],
    queryFn: () => api.get<ExhibitorPage>(`/exhibitors?page=${page}&page_size=${PAGE_SIZE}`),
    placeholderData: (previous) => previous,
  })

  const header = (
    <PageHeader
      title="Expositores"
      subtitle={
        exhibitors.data === undefined
          ? undefined
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

  if (exhibitors.isPending || rules.isPending) {
    return (
      <>
        {header}
        <Loading label="Cargando expositores" />
      </>
    )
  }

  if (exhibitors.isError || rules.isError) {
    const error = exhibitors.error ?? rules.error
    return (
      <>
        {header}
        <Notice
          title={error instanceof ApiError ? error.message : 'No se pudo cargar el listado.'}
        >
          Vuelva a intentarlo en unos segundos. Si el problema sigue, avise al equipo técnico.
        </Notice>
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
      <Table>
        <thead>
          <tr>
            <TH>Empresa</TH>
            <TH>Identificación</TH>
            <TH className="text-right">Metraje</TH>
            <TH>Categoría</TH>
            {categories.map((category) => (
              <TH key={category} className="text-right">
                {category}
              </TH>
            ))}
            <TH className="text-right">Total</TH>
          </tr>
        </thead>
        <TBody>
          {exhibitors.data.items.map((exhibitor) => {
            const assigned = Object.values(exhibitor.assigned).reduce((a, b) => a + b, 0)
            const quota = Object.values(exhibitor.quota).reduce((a, b) => a + b, 0)
            return (
              <tr key={exhibitor.id} className="hover:bg-fill">
                <TD>
                  <Link
                    to={`/admin/expositores/${exhibitor.id}`}
                    className="font-medium underline decoration-line-strong underline-offset-2 hover:decoration-ink"
                  >
                    {exhibitor.legal_name}
                  </Link>
                  <p className="text-[12px] text-ink-faint">{exhibitor.stand_name}</p>
                </TD>
                <TD className="tnum text-ink-soft">
                  {exhibitor.tax_id}
                  <p className="label-caps">{exhibitor.tax_id_type}</p>
                </TD>
                <TD className="tnum text-right">{exhibitor.requested_m2} m²</TD>
                <TD className="text-ink-soft">{exhibitor.stand_category}</TD>
                {categories.map((category) => (
                  <TD key={category} className="tnum text-right">
                    {exhibitor.assigned[category] ?? 0}
                    <span className="text-ink-faint"> / {exhibitor.quota[category] ?? 0}</span>
                  </TD>
                ))}
                <TD className="tnum text-right font-medium">
                  {assigned}
                  <span className="font-normal text-ink-faint"> / {quota}</span>
                </TD>
              </tr>
            )
          })}
        </TBody>
      </Table>

      <p className="mt-2 text-[12px] text-ink-faint">
        Por categoría de credencial: asignadas / cuota. La cuota se recalcula con el metraje y
        las reglas vigentes de la feria.
      </p>

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={exhibitors.data.total}
        onChange={setPage}
      />
    </>
  )
}
