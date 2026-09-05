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
import { StandHeroBanner } from './StandHeroBanner'
import { useTranslation } from '../i18n/LanguageContext'

export function StandDashboardPage() {
  const { t, lang } = useTranslation()
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['me', 'quota'],
    queryFn: () => api.get<MyQuota>('/me/quota'),
  })

  if (isPending) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-5 sm:py-8 md:px-10">
        <PageHeader title={t.dashboard.standTitle} />
        <Loading label={lang === 'en' ? 'Loading stand…' : 'Cargando su stand'} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-5 sm:py-8 md:px-10">
        <PageHeader title={t.dashboard.standTitle} />
        <Notice
          tone="error"
          title={error instanceof ApiError ? error.message : t.common.tryAgain}
        >
          {t.common.tryAgain}
        </Notice>
      </div>
    )
  }

  const totalQuota = Object.values(data.quota).reduce((sum, value) => sum + value, 0)
  const totalAvailable = totalQuota - data.participants_total
  const burnRate = totalQuota === 0 ? 0 : Math.round((data.participants_total / totalQuota) * 100)

  const standCategoryName = (t.standSizes as Record<string, string>)[data.stand_category] ?? data.stand_category

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Banner Principal del Stand: Full bleed horizontal y pegado al tope sin espacios en blanco */}
      <StandHeroBanner data={data} />

      {/* Contenido principal del panel general dentro del contenedor centrado */}
      <div className="mx-auto max-w-5xl px-4 pb-8 sm:px-5 md:px-10 space-y-7">
        {/* Fila de contexto y acciones del Stand */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-ink-soft">
              {data.legal_name} · <span className="font-semibold text-ink">Stand {standCategoryName}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link to="/stand/credenciales/carga">
              <Button variant="secondary">
                {t.dashboard.bulkUpload}
              </Button>
            </Link>
            <Link to="/stand/credenciales/nueva">
              <Button>
                {t.dashboard.newCredential}
              </Button>
            </Link>
          </div>
        </div>

        <div data-tour="dashboard-stats">
          <StatRow>
            <Stat label={t.tables.standSize} value={`${data.requested_m2} m²`} note={`Stand ${standCategoryName}`} />
            <Stat label={t.common.totalQuota} value={totalQuota} note={t.dashboard.allCategories} />
            <Stat label={t.common.assigned} value={data.participants_total} note={t.dashboard.usedRate.replace('{percent}', String(burnRate))} />
            <Stat label={t.common.available} value={totalAvailable} note={t.dashboard.freeQuotas} />
          </StatRow>
        </div>

        {data.participants_without_email > 0 ? (
          <Notice title={t.dashboard.noEmailTitle}>
            {data.participants_without_email} {t.dashboard.ofQuota.replace('{total}', String(data.participants_total))} {t.dashboard.noEmailNotice}{' '}
            {/* Al filtro, no a la lista entera: el aviso dice cuantas faltan, el enlace
                tiene que dejarlas a la vista. */}
            <Link
              to="/stand/credenciales?sin_correo=1"
              className="font-medium text-ink underline underline-offset-2"
            >
              {t.dashboard.completeInList}
            </Link>
            .
          </Notice>
        ) : null}

        <section data-tour="dashboard-quota">
          <div className="mb-2.5 flex items-baseline justify-between gap-3">
            <h2 className="label-caps">{t.dashboard.quotaByCategory}</h2>
            <span className="tnum text-[11px] text-ink-faint">
              {data.participants_total} {t.common.of} {totalQuota} {t.common.assigned}
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
    </div>
  )
}
