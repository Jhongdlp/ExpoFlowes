import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { api, ApiError, download } from '../../api/client'
import type { AdminDashboard } from '../../api/types'
import { EmptyState } from '../../components/EmptyState'
import { Loading } from '../../components/Loading'
import { PageHeader } from '../../components/PageHeader'
import { Stat, StatRow } from '../../components/Stat'
import { Button } from '../../components/ui/Button'
import { Notice } from '../../components/ui/Notice'
import { QuotaTable } from './QuotaTable'

const DATE = new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'long' })

export function AdminDashboardPage() {
  const [reportError, setReportError] = useState<string | null>(null)
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

  const onDownload = async () => {
    setReportError(null)
    try {
      await download('/reports/exhibitors.xlsx', 'expositores.xlsx')
    } catch (failure) {
      setReportError(
        failure instanceof ApiError ? failure.message : 'No se pudo generar el reporte.',
      )
    }
  }

  return (
    <>
      <PageHeader
        title="Panel general"
        subtitle={`${data.event.name} · ${DATE.format(new Date(data.event.starts_on))} al ${DATE.format(new Date(data.event.ends_on))}`}
        actions={
          <Button variant="secondary" onClick={onDownload}>
            Descargar reporte
          </Button>
        }
      />

      {reportError !== null ? <Notice title={reportError} className="mb-6" /> : null}

      {data.exhibitors_total === 0 ? (
        <EmptyState
          title="Todavía no hay expositores"
          description="Registre la primera empresa para que su representante reciba el acceso y pueda acreditar a su personal."
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
          </section>
        </>
      )}
    </>
  )
}
