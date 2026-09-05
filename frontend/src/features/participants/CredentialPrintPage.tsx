import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { api } from '../../api/client'
import type { BadgeArt, MyParticipantPage, MyQuota, Participant } from '../../api/types'
import { CATEGORY_BAR } from '../../components/CategoryBadge'
import { cn } from '../../lib/cn'
import { resolveBannerUrl } from '../exhibitors/bannerPresets'
import { EmptyState } from '../../components/EmptyState'
import { Loading } from '../../components/Loading'
import { ServerError } from '../../components/ServerError'
import { Button } from '../../components/ui/Button'
import { Notice } from '../../components/ui/Notice'
import { Select } from '../../components/ui/Select'
import { ACCEPTED_TYPES, BadgeImageError, prepareBadgeImage } from './badgeImage'
import { useTranslation } from '../i18n/LanguageContext'

const PAGE_SIZE = 100

/**
 * El valor de la URL es texto que el usuario ve y comparte, asi que va en español; la clase
 * CSS es codigo y va en ingles (§16). Este mapa es la unica costura entre los dos, y de
 * paso valida: cualquier `estilo` que alguien invente a mano cae en la variante por
 * defecto en vez de dejar la tarjeta sin estilo.
 */
const BADGE_STYLES = { banda: 'band', limpio: 'plain', foto: 'photo' } as const

type BadgeStyleKey = keyof typeof BADGE_STYLES

/** Todas las credenciales del stand. El listado pagina de 100 en 100 (§9.5). */
async function fetchAllParticipants(): Promise<Participant[]> {
  const all: Participant[] = []
  for (let page = 1; ; page += 1) {
    const chunk = await api.get<MyParticipantPage>(
      `/me/participants?page=${page}&page_size=${PAGE_SIZE}`,
    )
    all.push(...chunk.items)
    if (all.length >= chunk.total || chunk.items.length === 0) return all
  }
}

/**
 * Hoja de gafetes lista para imprimir.
 *
 * El navegador ya sabe paginar, escalar y mandar a la impresora: aqui solo se describe la
 * tarjeta en milimetros y se deja que `@media print` esconda el marco de la aplicacion. Sin
 * libreria de PDF, sin render en servidor.
 *
 * `ids` en la query es la seleccion de la lista. Sin `ids` se imprime el stand completo.
 * No es un filtro de seguridad: el listado ya viene acotado al `exhibitor_id` del token, asi
 * que un id ajeno simplemente no aparece.
 */
export function CredentialPrintPage() {
  const { t, lang } = useTranslation()
  const [params, setParams] = useSearchParams()

  /*
    La apariencia viaja en la misma URL que la seleccion: no hace falta columna nueva,
    endpoint nuevo ni almacenamiento local, y el enlace que se comparte ya lleva puesto
    como se imprime. Imprimir es un acto puntual, no una preferencia que haya que
    recordar entre sesiones.
  */
  const requested = params.get('estilo') ?? ''
  const style: BadgeStyleKey = requested in BADGE_STYLES ? (requested as BadgeStyleKey) : 'banda'
  const accent = params.get('color') ?? '#a83a63'

  const setLook = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    next.set(key, value)
    setParams(next, { replace: true })
  }

  const raw = params.get('ids')
  const selected =
    raw === null || raw.trim() === ''
      ? null
      : new Set(raw.split(',').map((value) => Number(value)).filter(Number.isInteger))

  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const stand = useQuery({ queryKey: ['me', 'quota'], queryFn: () => api.get<MyQuota>('/me/quota') })

  /*
    La imagen y su encuadre se guardan en el stand, no en la URL ni en el navegador: la
    sube el representante una vez y la ve cualquiera que imprima, desde cualquier equipo.
    El estilo y el color de acento si siguen en la URL, porque son la decision de esta
    impresion concreta, no la identidad del stand.
  */
  const art = stand.data?.badge_art ?? null

  const saveArt = useMutation({
    mutationFn: (next: BadgeArt) => api.put<BadgeArt>('/me/badge-art', next),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'quota'] }),
  })
  const clearArt = useMutation({
    mutationFn: () => api.delete<void>('/me/badge-art'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', 'quota'] }),
  })

  /** Reencuadra sin volver a subir la imagen: solo cambian los tres numeros. */
  const reframe = (patch: Partial<BadgeArt>) => {
    if (art === null) return
    saveArt.mutate({ ...art, ...patch })
  }

  async function onPickImage(file: File) {
    setUploadError(null)
    try {
      const image = await prepareBadgeImage(file)
      // Una imagen nueva entra centrada y sin zoom: el encuadre anterior era de otra foto.
      saveArt.mutate({ image, focus_x: 50, focus_y: 50, zoom: 100 })
    } catch (failure) {
      setUploadError(
        failure instanceof BadgeImageError
          ? failure.message
          : lang === 'en'
            ? 'The image could not be processed.'
            : 'No se pudo procesar la imagen.',
      )
    }
    if (fileRef.current !== null) fileRef.current.value = ''
  }
  const participants = useQuery({
    queryKey: ['me', 'participants', 'print'],
    queryFn: fetchAllParticipants,
  })

  // El titulo de la ventana es el nombre que propone el dialogo de impresion al guardar en PDF.
  useEffect(() => {
    const previous = document.title
    document.title = lang === 'en' ? 'Credentials' : 'Credenciales'
    return () => {
      document.title = previous
    }
  }, [lang])

  if (stand.isPending || participants.isPending) {
    return <Loading label={lang === 'en' ? 'Preparing badges…' : 'Preparando las credenciales'} />
  }
  if (stand.isError) return <ServerError error={stand.error} />
  if (participants.isError) return <ServerError error={participants.error} />

  const badges =
    selected === null
      ? participants.data
      : participants.data.filter((person) => selected.has(person.id))

  const backButton = (
    <Link to="/stand/credenciales">
      <Button variant="ghost">{t.bulk.viewCredentials}</Button>
    </Link>
  )

  if (badges.length === 0) {
    return (
      <EmptyState
        title={lang === 'en' ? 'No credentials to print' : 'No hay credenciales para imprimir'}
        description={
          lang === 'en'
            ? 'Register people in the stand, or select rows in the list before printing.'
            : 'Registre personas en el stand, o seleccione filas en la lista antes de imprimir.'
        }
        action={backButton}
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* Barra de control: existe solo en pantalla, nunca sale en el papel. */}
      <div className="print:hidden">
        <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[19px] leading-tight font-semibold tracking-tight text-ink">
              {lang === 'en' ? 'Print credentials' : 'Imprimir credenciales'}
            </h1>
            <p className="mt-1 text-[12px] text-ink-soft">
              {lang === 'en'
                ? `${badges.length} badge${badges.length === 1 ? '' : 's'} · 90 × 130 mm · four per A4 sheet`
                : `${badges.length} credencial${badges.length === 1 ? '' : 'es'} · 90 × 130 mm · cuatro por hoja A4`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {backButton}
            <Button onClick={() => window.print()}>
              {lang === 'en' ? 'Print' : 'Imprimir'}
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-56">
            <Select
              label={lang === 'en' ? 'Badge design' : 'Diseño de la credencial'}
              value={style}
              onChange={(event) => setLook('estilo', event.target.value)}
              options={[
                {
                  value: 'banda',
                  label: lang === 'en' ? 'Photo band (recommended)' : 'Banda con foto (recomendado)',
                },
                { value: 'limpio', label: lang === 'en' ? 'No photo' : 'Sin foto' },
                { value: 'foto', label: lang === 'en' ? 'Full photo' : 'Foto completa' },
              ]}
            />
          </div>

          {/* `input type=color` nativo: el selector del sistema operativo ya resuelve
              rueda, teclado y accesibilidad mejor que cualquier lista de tonos propia. */}
          <div className="space-y-1.5">
            <label htmlFor="acento" className="label-caps block">
              {lang === 'en' ? 'Accent' : 'Color de acento'}
            </label>
            <input
              id="acento"
              type="color"
              value={accent}
              onChange={(event) => setLook('color', event.target.value)}
              className="h-8 w-14 cursor-pointer rounded-md border border-line-strong bg-surface p-1"
            />
          </div>

          {/* Subir la foto propia. Si nadie sube nada, la credencial usa el banner del
              stand, que es lo que ya se ve en el panel. */}
          <div className="space-y-1.5">
            <span className="label-caps block">{lang === 'en' ? 'Image' : 'Imagen'}</span>
            <div className="flex items-center gap-2">
              <label
                htmlFor="foto-credencial"
                className={cn(
                  'inline-flex h-8 cursor-pointer items-center rounded-md border border-line-strong bg-surface px-3 text-[12px] font-medium text-ink',
                  'transition-colors duration-[120ms] hover:bg-fill active:translate-y-px',
                  saveArt.isPending ? 'pointer-events-none opacity-45' : '',
                )}
              >
                {art === null
                  ? lang === 'en' ? 'Upload photo' : 'Subir foto'
                  : lang === 'en' ? 'Replace' : 'Cambiar'}
              </label>
              <input
                id="foto-credencial"
                ref={fileRef}
                type="file"
                accept={ACCEPTED_TYPES}
                className="sr-only"
                onChange={(event) => {
                  const picked = event.target.files?.[0]
                  if (picked !== undefined) void onPickImage(picked)
                }}
              />
              {art === null ? null : (
                <Button
                  variant="ghost"
                  size="sm"
                  loading={clearArt.isPending}
                  onClick={() => clearArt.mutate()}
                >
                  {lang === 'en' ? 'Use stand banner' : 'Usar el banner'}
                </Button>
              )}
            </div>
          </div>

          <p className="min-w-[16rem] flex-1 text-[11px] text-ink-faint">
            {lang === 'en'
              ? 'The photo is the stand banner. In the print dialog choose A4, background graphics on, and no headers or footers.'
              : 'La foto es el banner de su stand. En el diálogo de impresión elija A4, gráficos de fondo activados y sin encabezados ni pies de página.'}
            {style === 'foto' ? (
              <span className="mt-1 block text-alert">
                {lang === 'en'
                  ? 'Full photo uses a lot of ink on an office printer; it is meant for professional printing.'
                  : 'La foto completa gasta mucha tinta en una impresora de oficina; está pensada para imprenta.'}
              </span>
            ) : null}
          </p>
        </div>

        {uploadError === null ? null : (
          <div className="mt-3">
            <Notice tone="error" title={uploadError} onDismiss={() => setUploadError(null)} />
          </div>
        )}

        {/* El encuadre no recorta: mueve el punto de interes y el zoom, y las tres
            variantes se reencuadran solas. Se usan `input type=range` nativos porque ya
            traen teclado, lectores de pantalla y gesto tactil resueltos. */}
        {art === null ? null : (
          <div className="mt-3 grid gap-3 rounded-lg border border-line bg-fill/40 p-3 sm:grid-cols-3">
            {([
              ['focus_x', lang === 'en' ? 'Horizontal' : 'Horizontal', 0, 100],
              ['focus_y', lang === 'en' ? 'Vertical' : 'Vertical', 0, 100],
              ['zoom', lang === 'en' ? 'Zoom' : 'Acercamiento', 100, 300],
            ] as const).map(([key, label, min, max]) => (
              <label key={key} className="block text-[12px] text-ink-soft">
                <span className="mb-1 flex items-baseline justify-between">
                  <span className="label-caps">{label}</span>
                  <span className="tnum text-[11px] text-ink-faint">{art[key]}%</span>
                </span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={art[key]}
                  className="w-full accent-brand"
                  onChange={(event) => reframe({ [key]: Number(event.target.value) })}
                />
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="badge-sheet">
        {badges.map((person) => (
          <article
            key={person.id}
            className={`badge badge--${BADGE_STYLES[style]}`}
            style={{ '--badge-accent': accent } as React.CSSProperties}
          >
            {/* `alt` vacio a proposito: es decoracion de marca, y el nombre del stand ya
                esta escrito justo debajo. Un lector de pantalla no gana nada leyendolo. */}
            {style === 'limpio' ? null : (
              <div
                className="badge-media"
                style={
                  {
                    '--badge-focus-x': `${art?.focus_x ?? 50}%`,
                    '--badge-focus-y': `${art?.focus_y ?? 50}%`,
                    '--badge-zoom': (art?.zoom ?? 100) / 100,
                  } as React.CSSProperties
                }
              >
                <img src={art?.image ?? resolveBannerUrl(stand.data.banner_url)} alt="" />
              </div>
            )}
            <header className="badge-head">
              <p className="badge-event">{stand.data.event_name}</p>
              <p className="badge-stand">{stand.data.stand_name}</p>
            </header>

            <div className="badge-body">
              <p className="badge-name">
                {person.first_name}
                <br />
                {person.last_name}
              </p>
              <p className="badge-position">{person.position}</p>
              {person.provider_company === null || person.provider_company === undefined ? null : (
                <p className="badge-provider">{person.provider_company}</p>
              )}
            </div>

            <footer className="badge-foot">
              {/*
                La categoria se lee de lejos por el color, pero va tambien escrita: en una
                fotocopia en blanco y negro la credencial tiene que seguir siendo valida.
              */}
              <span className="badge-category">
                <span
                  aria-hidden="true"
                  className={`badge-dot ${CATEGORY_BAR[person.category] ?? 'bg-ink-faint'}`}
                />
                {(t.categories as Record<string, string>)[person.category] ?? person.category}
              </span>
              <span className="badge-id tnum">{person.identification}</span>
            </footer>
          </article>
        ))}
      </div>
    </div>
  )
}
