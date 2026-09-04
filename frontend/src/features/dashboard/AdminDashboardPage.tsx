import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Building2, Maximize2, IdCard, Ticket } from 'lucide-react'

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

const DATE = new Intl.DateTimeFormat('es-EC', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

export function AdminDashboardPage() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: () => api.get<AdminDashboard>('/dashboard/admin'),
  })

  if (isPending) return <Loading label="Cargando el panel" />
  if (isError) {
    return (
      <Notice
        title={error instanceof ApiError ? error.message : 'No se pudo cargar el panel.'}
      />
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
  const overallBurnRate =
    totalQuota === 0 ? 0 : Math.round((data.participants_total / totalQuota) * 100)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Panel general"
        subtitle={`${data.event.name} · ${DATE.format(new Date(data.event.starts_on))} al ${DATE.format(new Date(data.event.ends_on))}`}
        actions={
          <div className="flex items-center gap-2">
            <DownloadReportButton />
            <Link to="/admin/expositores/nuevo">
              <Button>Nuevo expositor</Button>
            </Link>
          </div>
        }
      />

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
          {/* Métricas clave */}
          <StatRow>
            <Stat
              label="Expositores"
              value={data.exhibitors_total}
              icon={Building2}
              note="Empresas registradas"
            />
            <Stat
              label="Metraje total"
              value={`${data.total_m2} m²`}
              icon={Maximize2}
              note="Área de exposición"
            />
            <Stat
              label="Credenciales"
              value={data.participants_total}
              icon={IdCard}
              note={`de ${totalQuota} cupos (${overallBurnRate}%)`}
            />
            <Stat
              label="Disponibles"
              value={totalAvailable}
              icon={Ticket}
              note="Cupos sin asignar"
            />
          </StatRow>

          {/* Cuotas por categoría */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="label-caps">Credenciales por categoría</h2>
              <span className="text-[12px] text-ink-faint">
                {data.participants_total} de {totalQuota} emitidas
              </span>
            </div>
            <QuotaTable
              categories={categories}
              quota={quota}
              assigned={assigned}
              available={available}
            />
          </section>

          {/* Stands por categoría de metraje */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="label-caps">Stands por categoría de metraje</h2>
              <Link
                to="/admin/expositores"
                className="text-[12px] text-ink-soft hover:text-ink underline underline-offset-2"
              >
                Ver listado de stands
              </Link>
            </div>

            <div className="overflow-x-auto rounded-lg border border-line bg-surface">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-ink-faint">
                    <th className="label-caps px-4 py-2.5 font-medium">Categoría</th>
                    <th className="label-caps px-4 py-2.5 font-medium">Rango</th>
                    <th className="label-caps px-4 py-2.5 text-right font-medium">Stands</th>
                    <th className="label-caps px-4 py-2.5 text-right font-medium">Proporción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.stand_categories.map((row) => {
                    const percentage =
                      data.exhibitors_total === 0
                        ? 0
                        : Math.round((row.exhibitors / data.exhibitors_total) * 100)

                    return (
                      <tr key={row.label} className="hover:bg-fill/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-ink">{row.label}</td>
                        <td className="tnum px-4 py-3 text-ink-soft">
                          {row.min_m2} – {row.max_m2} m²
                        </td>
                        <td className="tnum px-4 py-3 text-right font-medium text-ink">
                          {row.exhibitors}
                        </td>
                        <td className="tnum px-4 py-3 text-right text-ink-soft">
                          {percentage}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-ink-faint">
              Rangos y cuotas leídos de configuración (<code className="font-mono">stand_size_rules</code> y <code className="font-mono">credential_rules</code>).
            </p>
          </section>
        </>
      )}
    </div>
  )
}
