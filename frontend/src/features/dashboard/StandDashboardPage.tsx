import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Layers, Ticket, IdCard, CheckCircle2 } from 'lucide-react'

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

  if (isPending) return <Loading label="Cargando su stand" />
  if (isError) {
    return (
      <Notice
        title={error instanceof ApiError ? error.message : 'No se pudo cargar su stand.'}
      />
    )
  }

  const totalQuota = Object.values(data.quota).reduce((sum, value) => sum + value, 0)
  const totalAvailable = totalQuota - data.participants_total
  const burnRate = totalQuota === 0 ? 0 : Math.round((data.participants_total / totalQuota) * 100)

  return (
    <div className="space-y-8">
      <PageHeader
        title={data.stand_name}
        subtitle={`${data.legal_name} · Stand ${data.stand_category} (${data.requested_m2} m²)`}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/stand/credenciales">
              <Button variant="secondary">Ver credenciales</Button>
            </Link>
            <Link to="/stand/credenciales/carga">
              <Button variant="secondary">Carga masiva</Button>
            </Link>
            <Link to="/stand/credenciales/nueva">
              <Button>Nueva credencial</Button>
            </Link>
          </div>
        }
      />

      {/* Métricas clave */}
      <StatRow>
        <Stat
          label="Metraje"
          value={`${data.requested_m2} m²`}
          icon={Layers}
          note={`Stand ${data.stand_category}`}
        />
        <Stat
          label="Cupo total"
          value={totalQuota}
          icon={Ticket}
          note="3 categorías"
        />
        <Stat
          label="Asignadas"
          value={data.participants_total}
          icon={IdCard}
          note={`${burnRate}% utilizado`}
        />
        <Stat
          label="Disponibles"
          value={totalAvailable}
          icon={CheckCircle2}
          note="Cupos libres"
        />
      </StatRow>

      {/* Alerta de correos faltantes */}
      {data.participants_without_email > 0 ? (
        <Notice title="Credenciales sin correo registrado">
          {data.participants_without_email} de sus {data.participants_total} acreditados no tienen
          correo registrado, por lo que no recibirán la confirmación de su credencial.{' '}
          <Link to="/stand/credenciales" className="underline underline-offset-2 font-medium text-ink">
            Completar en el listado de credenciales
          </Link>
          .
        </Notice>
      ) : null}

      {/* Desglose por categoría */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="label-caps">Cupo por categoría</h2>
          <span className="text-[12px] text-ink-faint">
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
