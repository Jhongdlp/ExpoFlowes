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
import { useTranslation } from '../i18n/LanguageContext'

export function StandDashboardPage() {
  const { t, lang } = useTranslation()
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['me', 'quota'],
    queryFn: () => api.get<MyQuota>('/me/quota'),
  })

  if (isPending) {
    return (
      <>
        <PageHeader title={t.dashboard.standTitle} />
        <Loading label={lang === 'en' ? 'Loading stand…' : 'Cargando su stand'} />
      </>
    )
  }

  if (isError) {
    return (
      <>
        <PageHeader title={t.dashboard.standTitle} />
        <Notice
          tone="error"
          title={error instanceof ApiError ? error.message : t.common.tryAgain}
        >
          {t.common.tryAgain}
        </Notice>
      </>
    )
  }

  const totalQuota = Object.values(data.quota).reduce((sum, value) => sum + value, 0)
  const totalAvailable = totalQuota - data.participants_total
  const burnRate = totalQuota === 0 ? 0 : Math.round((data.participants_total / totalQuota) * 100)

  const standCategoryName = (t.standSizes as Record<string, string>)[data.stand_category] ?? data.stand_category

  return (
    <div className="space-y-7">
      <PageHeader
        title={data.stand_name}
        subtitle={`${data.legal_name} · Stand ${standCategoryName} · ${data.requested_m2} m²`}
        actions={
          <>
            <Link to="/stand/credenciales/carga">
              <Button variant="secondary">{t.dashboard.bulkUpload}</Button>
            </Link>
            <Link to="/stand/credenciales/nueva">
              <Button>{t.dashboard.newCredential}</Button>
            </Link>
          </>
        }
      />

      <StatRow>
        <Stat label={t.tables.standSize} value={`${data.requested_m2} m²`} note={`Stand ${standCategoryName}`} />
        <Stat label={t.common.totalQuota} value={totalQuota} note={t.dashboard.allCategories} />
        <Stat label={t.common.assigned} value={data.participants_total} note={t.dashboard.usedRate.replace('{percent}', String(burnRate))} />
        <Stat label={t.common.available} value={totalAvailable} note={t.dashboard.freeQuotas} />
      </StatRow>

      {data.participants_without_email > 0 ? (
        <Notice title={t.dashboard.noEmailTitle}>
          {data.participants_without_email} {t.dashboard.ofQuota.replace('{total}', String(data.participants_total))} {t.dashboard.noEmailNotice}{' '}
          <Link
            to="/stand/credenciales"
            className="font-medium text-ink underline underline-offset-2"
          >
            {t.dashboard.completeInList}
          </Link>
          .
        </Notice>
      ) : null}

      <section>
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
  )
}
