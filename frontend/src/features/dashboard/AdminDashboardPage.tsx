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
import { QuotaTable } from './QuotaTable'

const DATE = new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'long', timeZone: 'UTC' })

export function AdminDashboardPage() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: () => api.get<AdminDashboard>('/dashboard/admin'),
  })

  if (isPending) return <Loading label="Cargando el panel" />
  if (isError) {
    return (
      <Notice title={error instanceof ApiError ? error.message : 'No se pudo cargar el panel.'} />
    )
  }

  const categories = Object.keys(data.totals)
  const quota = Object.fromEntries(Object.entries(data.totals).map(([k, v]) => [k, v.quota]))
  const assigned = Object.fromEntries(Object.entries(data.totals).map(([k, v]) => [k, v.assigned]))
  const available = Object.fromEntries(
    Object.entries(data.totals).map(([k, v]) => [k, v.available]),
  )
  const totalQuota = Object.values(data.totals).reduce((sum, row) => sum + row.quota, 0)

  return (
    <>
      <PageHeader
        title="Panel general"
        subtitle={`${data.event.name} · ${DATE.format(new Date(data.event.starts_on))} al ${DATE.format(new Date(data.event.ends_on))}`}
        actions={<DownloadReportButton />}
      />

      {data.exhibitors_total === 0 ? (
        <EmptyState
          title="Todavía no hay expositores"
          description="Registre la primera empresa para que su representante reciba el acceso y pueda acreditar a su personal."
          action={
            <Link to="/admin/expositores">
              <Button variant="secondary">Ir a expositores</Button>
            </Link>
          }
        />
      ) : (
        <>
          <StatRow>
            <Stat label="Expositores" value={data.exhibitors_total} />
            <Stat label="Metraje contratado" value={`${data.total_m2} m²`} />
            <Stat
              label="Credenciales asignadas"
              value={data.participants_total}
              note={`de ${totalQuota} disponibles`}
            />
            <Stat label="Sin asignar" value={totalQuota - data.participants_total} />
          </StatRow>

          <section className="mt-10">
            <h2 className="label-caps">Credenciales por categoría</h2>
            <div className="mt-3">
              <QuotaTable
                categories={categories}
                quota={quota}
                assigned={assigned}
                available={available}
              />
            </div>
          </section>

          <section className="mt-10">
            <h2 className="label-caps">Stands por categoría de metraje</h2>
            <table className="mt-3 w-full border-y border-line text-[13px]">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="label-caps py-2 font-medium">Categoría</th>
                  <th className="label-caps py-2 font-medium">Rango</th>
                  <th className="label-caps py-2 text-right font-medium">Stands</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.stand_categories.map((row) => (
                  <tr key={row.label}>
                    <td className="py-2.5 font-medium">{row.label}</td>
                    <td className="tnum py-2.5 text-ink-soft">
                      {row.min_m2} – {row.max_m2} m²
                    </td>
                    <td className="tnum py-2.5 text-right">{row.exhibitors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[12px] text-ink-faint">
              Los rangos se leen de la configuración de la feria; no están fijados en el código.
            </p>

            <div className="mt-6">
              <Link to="/admin/expositores">
                <Button variant="secondary">Ver el detalle por stand</Button>
              </Link>
            </div>
          </section>
        </>
      )}
    </>
  )
}
