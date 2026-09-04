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
import { useTranslation } from '../i18n/LanguageContext'

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
  const { t, lang } = useTranslation()

  const dateFormatter = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-EC', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: () => api.get<AdminDashboard>('/dashboard/admin'),
  })

  const header = (subtitle?: string) => (
    <PageHeader
      title={t.dashboard.adminTitle}
      subtitle={subtitle}
      actions={
        <>
          <DownloadReportButton />
          <Link to="/admin/expositores/nuevo">
            <Button>{t.dashboard.newExhibitor}</Button>
          </Link>
        </>
      }
    />
  )

  if (isPending) {
    return (
      <>
        {header()}
        <Loading label={lang === 'en' ? 'Loading dashboard…' : 'Cargando el panel'} />
      </>
    )
  }

  if (isError) {
    return (
      <>
        {header()}
        <Notice
          tone="error"
          title={error instanceof ApiError ? error.message : t.common.tryAgain}
        >
          {t.common.tryAgain}
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

  const dateRangeSubtitle = `${data.event.name} · ${dateFormatter.format(new Date(data.event.starts_on))} ${t.common.to} ${dateFormatter.format(new Date(data.event.ends_on))}`

  return (
    <div className="space-y-7">
      {header(dateRangeSubtitle)}

      {data.exhibitors_total === 0 ? (
        <EmptyState
          title={t.dashboard.emptyExhibitorsTitle}
          description={t.dashboard.emptyExhibitorsDesc}
          action={
            <Link to="/admin/expositores/nuevo">
              <Button>{t.dashboard.registerExhibitor}</Button>
            </Link>
          }
        />
      ) : (
        <>
          <StatRow>
            <Stat label={t.dashboard.exhibitors} value={data.exhibitors_total} note={t.dashboard.registeredCompanies} />
            <Stat label={t.tables.standSize} value={`${data.total_m2} m²`} note={t.dashboard.standArea} />
            <Stat
              label={t.participants.title}
              value={data.participants_total}
              note={t.dashboard.ofQuota.replace('{total}', String(totalQuota))}
            />
            <Stat label={t.common.available} value={totalAvailable} note={t.dashboard.usedRate.replace('{percent}', String(burnRate))} />
          </StatRow>

          <section>
            <SectionHeading
              title={t.dashboard.quotaByCategory}
              meta={`${data.participants_total} ${t.common.of} ${totalQuota} ${t.dashboard.credentialsIssued}`}
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
              title={t.dashboard.standsBySize}
              meta={
                <Link
                  to="/admin/expositores"
                  className="text-ink-soft underline decoration-line-strong underline-offset-2 transition-colors duration-[120ms] hover:text-ink hover:decoration-ink"
                >
                  {t.dashboard.viewList}
                </Link>
              }
            />

            <Table>
              <thead>
                <tr>
                  <TH>{t.tables.category}</TH>
                  <TH>{t.tables.range}</TH>
                  <TH className="text-right">{t.tables.stands}</TH>
                  <TH className="w-40">{t.tables.proportion}</TH>
                </tr>
              </thead>
              <TBody>
                {data.stand_categories.map((row) => {
                  const percentage =
                    data.exhibitors_total === 0
                      ? 0
                      : Math.round((row.exhibitors / data.exhibitors_total) * 100)

                  const label = (t.standSizes as Record<string, string>)[row.label] ?? row.label
                  return (
                    <TR key={row.label}>
                      <TD className="font-medium">{label}</TD>
                      <TD label={t.tables.range} className="tnum text-ink-soft">
                        {row.min_m2} – {row.max_m2} m²
                      </TD>
                      <TD label={t.tables.stands} className="tnum text-right font-medium sm:text-right">
                        {row.exhibitors}
                      </TD>
                      <TD label={t.tables.proportion} className="cell-wide">
                        <div className="flex items-center gap-2">
                          <Meter
                            used={row.exhibitors}
                            total={data.exhibitors_total}
                            label={`${t.tables.stands} ${label}`}
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
              {t.dashboard.rulesFootnote}
            </p>
          </section>
        </>
      )}
    </div>
  )
}
