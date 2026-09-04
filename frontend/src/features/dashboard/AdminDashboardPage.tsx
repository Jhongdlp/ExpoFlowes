import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { api, ApiError } from '../../api/client'
import type { AdminDashboard } from '../../api/types'
import { DownloadReportButton } from '../../components/DownloadReportButton'
import { EmptyState } from '../../components/EmptyState'
import { Loading } from '../../components/Loading'
import { PageHeader } from '../../components/PageHeader'
import { Stat, StatRow } from '../../components/Stat'
import { Button } from '../../components/ui/Button'
import { Notice } from '../../components/ui/Notice'
import { Meter } from '../../components/ui/Meter'
import { Table, TBody, TD, TH, TR } from '../../components/ui/Table'
import { QuotaTable } from './QuotaTable'

const DATE = new Intl.DateTimeFormat('es-EC', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/** Rotulo de seccion: mismo peso en todas las paginas, con su dato a la derecha. */
function SectionHeading({ title, meta }: { title: string; meta?: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3">
      <h2 className="label-caps">{title}</h2>
      {meta === undefined ? null : <span className="text-[11px] text-ink-faint">{meta}</span>}
    </div>
  )
}

export function AdminDashboardPage() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: () => api.get<AdminDashboard>('/dashboard/admin'),
  })

  const header = (subtitle?: string) => (
    <PageHeader
      title="Panel general"
      subtitle={subtitle}
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

  if (isPending) {
    return (
      <>
        {header()}
        <Loading label="Cargando el panel" />
      </>
    )
  }

  if (isError) {
    return (
      <>
        {header()}
        <Notice
          tone="error"
          title={error instanceof ApiError ? error.message : 'No se pudo cargar el panel.'}
        >
          Vuelva a intentarlo en unos segundos. Si el problema sigue, avise al equipo técnico.
        </Notice>
      </>
    )
  }

  const categories = Object.keys(data.totals)
  const quota = Object.fromEntries(Object.entries(data.totals).map(([k, v]) => [k, v.quota]))
  const assigned = Object.fromEntries(Object.entries(data.totals).map(([k, v]) => [k, v.assigned]))
  const available = Object.fromEntries(
    Object.entries(data.totals).map(([k, v]) => [k, v.available]),
  )
  const totalQuota = Object.values(data.totals).reduce((sum, row) => sum + row.quota, 0)
  const totalAvailable = totalQuota - data.participants_total
  const burnRate = totalQuota === 0 ? 0 : Math.round((data.participants_total / totalQuota) * 100)

  return (
    <div className="space-y-7">
      {header(
        `${data.event.name} · ${DATE.format(new Date(data.event.starts_on))} al ${DATE.format(new Date(data.event.ends_on))}`,
      )}

      {data.exhibitors_total === 0 ? (
        <EmptyState
          title="Todavía no hay expositores"
          description="Registre la primera empresa para que su representante reciba el acceso y pueda acreditar a su personal."
          action={
            <Link to="/admin/expositores/nuevo">
              <Button>Registrar expositor</Button>
            </Link>
          }
        />
      ) : (
        <>
          <StatRow>
            <Stat label="Expositores" value={data.exhibitors_total} note="Empresas registradas" />
            <Stat label="Metraje" value={`${data.total_m2} m²`} note="Área contratada" />
            <Stat
              label="Credenciales"
              value={data.participants_total}
              note={`de ${totalQuota} cupos`}
            />
            <Stat label="Disponibles" value={totalAvailable} note={`${burnRate}% utilizado`} />
          </StatRow>

          <section>
            <SectionHeading
              title="Credenciales por categoría"
              meta={`${data.participants_total} de ${totalQuota} emitidas`}
            />
            <QuotaTable
              categories={categories}
              quota={quota}
              assigned={assigned}
              available={available}
            />
          </section>

          <section>
            <SectionHeading
              title="Stands por categoría de metraje"
              meta={
                <Link
                  to="/admin/expositores"
                  className="text-ink-soft underline decoration-line-strong underline-offset-2 transition-colors duration-[120ms] hover:text-ink hover:decoration-ink"
                >
                  Ver listado
                </Link>
              }
            />

            <Table>
              <thead>
                <tr>
                  <TH>Categoría</TH>
                  <TH>Rango</TH>
                  <TH className="text-right">Stands</TH>
                  <TH className="w-40">Proporción</TH>
                </tr>
              </thead>
              <TBody>
                {data.stand_categories.map((row) => {
                  const percentage =
                    data.exhibitors_total === 0
                      ? 0
                      : Math.round((row.exhibitors / data.exhibitors_total) * 100)

                  return (
                    <TR key={row.label}>
                      <TD className="font-medium">{row.label}</TD>
                      <TD label="Rango" className="tnum text-ink-soft">
                        {row.min_m2} – {row.max_m2} m²
                      </TD>
                      <TD label="Stands" className="tnum text-right font-medium sm:text-right">
                        {row.exhibitors}
                      </TD>
                      <TD label="Proporción" className="cell-wide">
                        <div className="flex items-center gap-2">
                          <Meter
                            used={row.exhibitors}
                            total={data.exhibitors_total}
                            label={`Stands ${row.label}`}
                            className="flex-1"
                          />
                          <span className="tnum w-8 text-right text-[11px] text-ink-faint">
                            {percentage}%
                          </span>
                        </div>
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>

            <p className="mt-2 text-[11px] text-ink-faint">
              Rangos y cuotas leídos de configuración (<code>stand_size_rules</code> y{' '}
              <code>credential_rules</code>), no del código.
            </p>
          </section>
        </>
      )}
    </div>
  )
}
