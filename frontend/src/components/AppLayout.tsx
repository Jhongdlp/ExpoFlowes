import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode, type SVGProps } from 'react'
import { useIsFetching } from '@tanstack/react-query'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

import { useSession } from '../features/auth/session'
import { useAccessibility } from '../features/accessibility/AccessibilityContext'
import { AccessibilityDialog } from '../features/accessibility/AccessibilityDialog'
import { useTranslation } from '../features/i18n/LanguageContext'
import { TourOverlay } from '../features/tour/TourOverlay'
import { useTourGuide } from '../features/tour/useTourGuide'
import type { Role } from '../api/types'
import { cn } from '../lib/cn'

/* Iconos en linea (24px, trazo 1.5). Ocho glifos no justifican una dependencia. */
function Icon({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-[18px] w-[18px]"
      {...props}
    >
      {children}
    </svg>
  )
}

const ICONS = {
  panel: (
    <Icon>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </Icon>
  ),
  exhibitors: (
    <Icon>
      <path d="M4 9h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M4 9l1.4-4.3A1 1 0 0 1 6.3 4h11.4a1 1 0 0 1 .95.7L20 9" />
      <path d="M10 20v-5h4v5" />
    </Icon>
  ),
  credentials: (
    <Icon>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="11" r="2" />
      <path d="M6 16c.6-1.3 1.7-2 3-2s2.4.7 3 2M15 10h3M15 13.5h3" />
    </Icon>
  ),
  rules: (
    <Icon>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </Icon>
  ),
  upload: (
    <Icon>
      <path d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </Icon>
  ),
  docs: (
    <Icon>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M9 7h6M9 11h6" />
    </Icon>
  ),
  options: (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Icon>
  ),
  accessibility: (
    <Icon>
      <circle cx="12" cy="4.5" r="2" />
      <path d="M5 9.5l7 1.5 7-1.5" />
      <path d="M12 11v5" />
      <path d="M8 21l4-5 4 5" />
    </Icon>
  ),
  tour: (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 5 .5c0 1.7-2.5 1.8-2.5 3.5" />
      <path d="M12 17h.01" />
    </Icon>
  ),
  language: (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.6 9h16.8M3.6 15h16.8" />
      <path d="M11.5 3a17 17 0 0 0 0 18M12.5 3a17 17 0 0 1 0 18" />
    </Icon>
  ),
  signOut: (
    <Icon>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M11 16l4-4-4-4M15 12H4" />
    </Icon>
  ),
} satisfies Record<string, ReactNode>

/** Panel lateral con la punta hacia donde va a moverse el rail. */
function ExpandIcon({ open }: { open: boolean }) {
  return (
    <Icon>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9.5 4v16" />
      <path d={open ? 'M16 10l-2 2 2 2' : 'M14 10l2 2-2 2'} />
    </Icon>
  )
}

/** Aviso permanente del demo. Vive en el marco negro, nunca se cierra. */
export function DemoBanner() {
  const { t } = useTranslation()
  return (
    <p className="shrink-0 px-3 py-1.5 text-center text-[10px] font-medium tracking-[0.1em] text-balance text-white/45 uppercase">
      {t.nav.demoBanner}
    </p>
  )
}

/**
 * Geometria compartida de las filas del rail. El icono queda siempre en el mismo centro
 * horizontal (28px), abierto o cerrado, asi que expandir solo descubre el texto: el icono
 * no salta de sitio.
 */
const ROW = 'group relative flex h-10 w-full items-center gap-3 rounded-full px-[11px] transition-colors'
const ROW_IDLE = 'text-white/45 hover:bg-white/8 hover:text-white'

/** Etiqueta que aparece al expandir. Cerrada mide 0 y se recorta; nunca desborda el rail. */
function RowLabel({
  expanded,
  title,
  meta,
}: {
  expanded: boolean
  title: string
  meta?: string
}) {
  return (
    <span
      className={cn(
        'block overflow-hidden text-left whitespace-nowrap transition-[width,opacity] duration-200',
        expanded ? 'w-full opacity-100 delay-75' : 'w-0 opacity-0',
      )}
    >
      <span className="block text-[13px] leading-tight font-medium">{title}</span>
      {meta === undefined ? null : (
        <span className="block truncate text-[11px] leading-tight text-white/40">{meta}</span>
      )}
    </span>
  )
}

/**
 * Boton del rail: misma fila que un enlace. Sin texto visible la tarjeta es la unica
 * etiqueta, asi que el nombre accesible va tambien en aria-label.
 */
function RailButton({
  label,
  expanded,
  icon,
  className,
  ...props
}: {
  label: string
  expanded: boolean
  icon: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" aria-label={label} className={cn(ROW, className)} {...props}>
      <span className="shrink-0">{icon}</span>
      <RowLabel expanded={expanded} title={label} />
      {expanded ? null : <RailCard label={label} />}
    </button>
  )
}

/**
 * Tarjeta que sale del icono cuando el rail esta cerrado. El "morph" va en CSS: arranca
 * pegada al icono y redonda, y termina cuadrada. El texto apenas escala (0.94) a proposito:
 * animar una escala grande lo rasteriza al tamaño pequeño y se ve borroso.
 */
function RailCard({ label }: { label: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute top-1/2 left-full z-30 ml-2 w-max -translate-y-1/2 bg-white px-3 py-1.5 text-[13px] leading-tight font-semibold whitespace-nowrap text-ink shadow-[0_8px_28px_-6px_rgba(0,0,0,0.55)]',
        'origin-left scale-[0.94] rounded-full opacity-0',
        'transition-[opacity,transform,border-radius,margin] duration-200 ease-out',
        'group-hover:ml-2.5 group-hover:scale-100 group-hover:rounded-[10px] group-hover:opacity-100 group-hover:delay-100',
        'group-focus-visible:ml-2.5 group-focus-visible:scale-100 group-focus-visible:rounded-[10px] group-focus-visible:opacity-100',
      )}
    >
      {/* Punta hacia el icono: un cuadrado girado del mismo blanco, sin SVG aparte. */}
      <span className="absolute top-1/2 -left-1 h-2 w-2 -translate-y-1/2 rotate-45 rounded-[1px] bg-white" />
      {label}
    </span>
  )
}

const RAIL_KEY = 'expoflores.rail'

/**
 * Hilo de actividad: 2px en el borde superior del panel mientras hay alguna consulta en
 * vuelo. Es el unico indicador global de la aplicacion; sustituye a cualquier spinner
 * centrado que tape el contenido que el usuario ya esta leyendo.
 */
function ActivityLine() {
  const fetching = useIsFetching()

  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute top-0 inset-x-0 z-20 h-0.5 overflow-hidden transition-opacity duration-200',
        fetching > 0 ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div className="animate-progress h-full w-1/4 rounded-full bg-ink/70" />
    </div>
  )
}

export function AppLayout() {
  const location = useLocation()
  const isFullBleed = location.pathname === '/stand' || location.pathname === '/stand/'
  const { user, signOut } = useSession()
  const { openDialog: openAccessibilityDialog } = useAccessibility()
  const { lang, setLang, t, languages } = useTranslation()
  const tour = useTourGuide(user?.role ?? 'representative')

  // Preferencia del usuario, no del dispositivo: se recuerda entre visitas.
  const [expanded, setExpanded] = useState(() => localStorage.getItem(RAIL_KEY) === '1')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  const toggle = () => {
    setExpanded((open) => {
      localStorage.setItem(RAIL_KEY, open ? '0' : '1')
      return !open
    })
  }

  /** En movil el rail tapa el panel: navegar lo cierra, como haria cualquier cajon. */
  const closeOnMobile = () => {
    if (window.matchMedia('(width < 40rem)').matches) setExpanded(false)
  }

  if (user === null) return null

  const initials = user.email.slice(0, 2).toUpperCase()

  const navItems: Record<Role, { to: string; label: string; icon: keyof typeof ICONS }[]> = {
    admin: [
      { to: '/admin', label: t.nav.panel, icon: 'panel' },
      { to: '/admin/expositores', label: t.nav.exhibitors, icon: 'exhibitors' },
      { to: '/admin/credenciales', label: t.nav.credentials, icon: 'credentials' },
      { to: '/admin/reglas', label: t.nav.rules, icon: 'rules' },
    ],
    representative: [
      { to: '/stand', label: t.nav.panel, icon: 'panel' },
      { to: '/stand/credenciales', label: t.nav.credentials, icon: 'credentials' },
      { to: '/stand/credenciales/carga', label: t.nav.bulkUpload, icon: 'upload' },
    ],
  }

  return (
    // Marco fijo a la altura de la ventana: el rail no se mueve y solo desplaza el panel.
    <div className="flex h-dvh flex-col bg-ink">
      <DemoBanner />

      <div className="flex min-h-0 flex-1">
        <div
          className={cn(
            'relative z-30 flex shrink-0 flex-col px-2 pb-2 transition-[width] duration-200 ease-out',
            // En una pantalla de 360px, un rail abierto de 240px no deja panel que mirar:
            // ahi se superpone (y se cierra al navegar) en vez de empujar el contenido.
            expanded ? 'w-60 max-sm:absolute max-sm:inset-y-0 max-sm:left-0 max-sm:bg-ink' : 'w-14',
          )}
        >
          <div className="flex h-10 w-full items-center gap-3 px-[11px] text-white">
            <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-brand text-[10px] font-semibold text-white">
              E
            </span>
            <RowLabel expanded={expanded} title={t.nav.appTitle} meta={t.nav.appMeta} />
          </div>

          <RailButton
            label={expanded ? t.nav.collapseMenu : t.nav.expandMenu}
            expanded={expanded}
            icon={<ExpandIcon open={expanded} />}
            onClick={toggle}
            aria-expanded={expanded}
            className={cn('mt-1', ROW_IDLE)}
          />

          <nav aria-label={t.nav.panel} className="mt-3 flex flex-col gap-1">
            {navItems[user.role].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to.split('/').length === 2}
                aria-label={item.label}
                data-tour={`nav-${item.icon}`}
                onClick={closeOnMobile}
                className={({ isActive }) =>
                  cn(ROW, isActive ? 'bg-white/12 text-white' : ROW_IDLE)
                }
              >
                <span className="shrink-0">{ICONS[item.icon]}</span>
                <RowLabel expanded={expanded} title={item.label} />
                {expanded ? null : <RailCard label={item.label} />}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-1">
            {/* Pop-up de Opciones: Documentación, Accesibilidad e Idioma */}
            <div ref={menuRef} className="relative" data-tour="nav-options">
              <RailButton
                label={t.nav.options}
                expanded={expanded}
                icon={ICONS.options}
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="dialog"
                aria-expanded={menuOpen}
                className={cn(ROW_IDLE, menuOpen && 'bg-white/12 text-white')}
              />

              {menuOpen && (
                <div
                  role="region"
                  aria-label={t.nav.options}
                  className={cn(
                    'animate-rise absolute z-50 rounded-xl border border-white/15 bg-[#142e26] p-2 text-white shadow-[0_12px_36px_-6px_rgba(0,0,0,0.6)] backdrop-blur-md',
                    expanded
                      ? 'bottom-full left-0 mb-1.5 w-full'
                      : 'bottom-0 left-full ml-2.5 w-60',
                  )}
                >
                  <div className="px-2 py-0.5 text-[10px] font-semibold tracking-wider text-white/40 uppercase">
                    {t.nav.options}
                  </div>

                  <div className="mt-1 flex flex-col gap-1">
                    {/* Documentación (movida desde el navbar principal) */}
                    <NavLink
                      to={user.role === 'admin' ? '/admin/documentacion' : '/stand/documentacion'}
                      onClick={() => {
                        setMenuOpen(false)
                        closeOnMobile()
                      }}
                      className={({ isActive }) =>
                        cn(
                          'group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium transition-colors',
                          isActive
                            ? 'bg-white/15 text-white font-semibold'
                            : 'text-white/80 hover:bg-white/10 hover:text-white',
                        )
                      }
                    >
                      <span className="shrink-0 text-white/70 group-hover:text-white">
                        {ICONS.docs}
                      </span>
                      <span className="flex-1">{t.nav.documentation}</span>
                    </NavLink>

                    {/* Accesibilidad */}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        openAccessibilityDialog()
                      }}
                      className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <span className="shrink-0 text-white/70 group-hover:text-white">
                        {ICONS.accessibility}
                      </span>
                      <span className="flex-1">{t.nav.accessibility}</span>
                    </button>

                    {/* Volver a ver el tutorial de bienvenida */}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        tour.start()
                      }}
                      className="group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <span className="shrink-0 text-white/70 group-hover:text-white">
                        {ICONS.tour}
                      </span>
                      <span className="flex-1">{t.tour.restart}</span>
                    </button>

                    {/* Selector de Idioma (Español / English) */}
                    <div className="mt-1 rounded-lg border border-white/10 bg-black/25 p-1.5">
                      <div className="mb-1.5 flex items-center justify-between px-1 text-[11px] font-medium text-white/70">
                        <span className="flex items-center gap-1.5">
                          <span className="shrink-0 text-white/70">{ICONS.language}</span>
                          <span>{t.nav.language}</span>
                        </span>
                        <span className="rounded bg-white/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white uppercase">
                          {lang}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {languages.map((item) => (
                          <button
                            key={item.code}
                            type="button"
                            onClick={() => setLang(item.code)}
                            className={cn(
                              'flex items-center justify-center rounded-md px-2 py-1.5 text-[11px] font-medium transition-all',
                              lang === item.code
                                ? 'bg-white/20 font-semibold text-white shadow-xs ring-1 ring-white/25'
                                : 'text-white/60 hover:bg-white/10 hover:text-white',
                            )}
                          >
                            <span>{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <RailButton
              label={t.nav.signOut}
              expanded={expanded}
              icon={ICONS.signOut}
              onClick={signOut}
              className={ROW_IDLE}
            />

            {/* La cuenta no es un menu: la tarjeta ya muestra rol y correo, y salir es la fila de arriba. */}
            <div
              className={cn(ROW, 'text-white/70')}
              tabIndex={0}
              aria-label={`${t.nav.roles[user.role]}: ${user.email}`}
            >
              <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-white/85 text-[9px] font-semibold text-ink">
                {initials}
              </span>
              <RowLabel expanded={expanded} title={t.nav.roles[user.role]} meta={user.email} />
              {expanded ? null : <RailCard label={user.email} />}
            </div>
          </div>
        </div>

        <main className="relative mr-1 mb-1 min-w-0 flex-1 overflow-x-hidden overflow-y-auto rounded-xl bg-canvas text-ink isolate sm:mr-1.5 sm:mb-1.5">
          <ActivityLine />
          {isFullBleed ? (
            <Outlet />
          ) : (
            <div className="mx-auto max-w-5xl px-4 py-6 sm:px-5 sm:py-8 md:px-10">
              <Outlet />
            </div>
          )}
        </main>
      </div>

      <AccessibilityDialog />

      {tour.stepIndex !== null ? (
        <TourOverlay
          steps={tour.steps}
          stepIndex={tour.stepIndex}
          onNext={tour.next}
          onPrev={tour.prev}
          onSkip={tour.skip}
        />
      ) : null}
    </div>
  )
}
