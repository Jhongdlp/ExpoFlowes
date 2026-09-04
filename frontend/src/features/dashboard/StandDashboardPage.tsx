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

  if (isPending) return <Loading label="Cargando su stand" />
  if (isError) {
    return (
      <Notice title={error instanceof ApiError ? error.message : 'No se pudo cargar su stand.'} />
    )
  }

  const totalQuota = Object.values(data.quota).reduce((sum, value) => sum + value, 0)

  return (
    <>
      <PageHeader
        title={data.stand_name}
        subtitle={data.legal_name}
        actions={
          <>
            <Link to="/stand/credenciales">
              <Button variant="secondary">Ver credenciales</Button>
            </Link>
            <Link to="/stand/credenciales/nueva">
              <Button>Nueva credencial</Button>
            </Link>
          </>
        }
      />

      <StatRow>
        <Stat label="Metraje" value={`${data.requested_m2} m²`} note={data.stand_category} />
        <Stat label="Cupo total" value={totalQuota} />
        <Stat label="Asignadas" value={data.participants_total} />
        <Stat label="Disponibles" value={totalQuota - data.participants_total} />
      </StatRow>

      <section className="mt-10">
        <h2 className="label-caps">Cupo por categoría</h2>
        <div className="mt-3">
          <QuotaTable
            categories={Object.keys(data.quota)}
            quota={data.quota}
            assigned={data.assigned}
            available={data.available}
          />
        </div>
      </section>

      {data.participants_without_email > 0 ? (
        <Notice title="Hay credenciales sin correo de contacto" className="mt-8">
          {data.participants_without_email} de sus {data.participants_total} acreditados no
          tienen correo registrado, así que no reciben la confirmación de su credencial. Puede
          completarlo desde el{' '}
          <Link to="/stand/credenciales" className="underline underline-offset-2">
            listado de credenciales
          </Link>
          .
        </Notice>
      ) : null}
    </>
  )
}
