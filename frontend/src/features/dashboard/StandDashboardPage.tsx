import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { api, ApiError } from '../../api/client'
import type { MyQuota } from '../../api/types'
import { Loading } from '../../components/Loading'
import { PageHeader } from '../../components/PageHeader'
import { Stat, StatRow } from '../../components/Stat'
import { Button } from '../../components/ui/Button'
import { Notice } from '../../components/ui/Notice'
import { QuotaTable } from './QuotaTable'

export function StandDashboardPage() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['me', 'quota'],
    queryFn: () => api.get<MyQuota>('/me/quota'),
  })

  if (isPending) {
    return (
      <>
        <PageHeader title="Su stand" />
        <Loading label="Cargando su stand" />
      </>
    )
  }

  if (isError) {
    return (
      <>
        <PageHeader title="Su stand" />
        <Notice
          tone="error"
          title={error instanceof ApiError ? error.message : 'No se pudo cargar su stand.'}
        >
          Vuelva a intentarlo en unos segundos. Si el problema sigue, avise al organizador.
        </Notice>
      </>
    )
  }

  const totalQuota = Object.values(data.quota).reduce((sum, value) => sum + value, 0)
  const totalAvailable = totalQuota - data.participants_total
  const burnRate = totalQuota === 0 ? 0 : Math.round((data.participants_total / totalQuota) * 100)

  return (
    <div className="space-y-7">
      <PageHeader
        title={data.stand_name}
        subtitle={`${data.legal_name} · Stand ${data.stand_category} · ${data.requested_m2} m²`}
        actions={
          <>
            <Link to="/stand/credenciales/carga">
              <Button variant="secondary">Carga masiva</Button>
            </Link>
            <Link to="/stand/credenciales/nueva">
              <Button>Nueva credencial</Button>
            </Link>
          </>
        }
      />

      <StatRow>
        <Stat label="Metraje" value={`${data.requested_m2} m²`} note={`Stand ${data.stand_category}`} />
        <Stat label="Cupo total" value={totalQuota} note="Todas las categorías" />
        <Stat label="Asignadas" value={data.participants_total} note={`${burnRate}% utilizado`} />
        <Stat label="Disponibles" value={totalAvailable} note="Cupos libres" />
      </StatRow>

      {data.participants_without_email > 0 ? (
        <Notice title="Credenciales sin correo registrado">
          {data.participants_without_email} de sus {data.participants_total} acreditados no tienen
          correo, así que no recibirán la confirmación de su credencial.{' '}
          <Link
            to="/stand/credenciales"
            className="font-medium text-ink underline underline-offset-2"
          >
            Completar en el listado
          </Link>
          .
        </Notice>
      ) : null}

      <section>
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <h2 className="label-caps">Cupo por categoría</h2>
          <span className="tnum text-[11px] text-ink-faint">
            {data.participants_total} de {totalQuota} asignadas
          </span>
        </div>
        <QuotaTable
          categories={Object.keys(data.quota)}
          quota={data.quota}
          assigned={data.assigned}
          available={data.available}
        />
      </section>
    </div>
  )
}
