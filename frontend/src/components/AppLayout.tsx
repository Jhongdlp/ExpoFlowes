import { useState, type ButtonHTMLAttributes, type ReactNode, type SVGProps } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import { useSession } from '../features/auth/session'
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
  upload: (
    <Icon>
      <path d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
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

interface NavItem {
  to: string
  label: string
  icon: keyof typeof ICONS
}

const NAV: Record<Role, NavItem[]> = {
  admin: [
    { to: '/admin', label: 'Panel', icon: 'panel' },
    {
      to: '/admin/expositores',
      label: 'Expositores',
      icon: 'exhibitors',
    },
    {
      to: '/admin/credenciales',
      label: 'Credenciales',
      icon: 'credentials',
    },
  ],
  representative: [
    { to: '/stand', label: 'Panel', icon: 'panel' },
    {
      to: '/stand/credenciales',
      label: 'Credenciales',
      icon: 'credentials',
    },
    {
      to: '/stand/credenciales/carga',
      label: 'Carga masiva',
      icon: 'upload',
    },
  ],
}

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Organización',
  representative: 'Representante de stand',
}

/** Aviso permanente del demo (§14.5). Vive en el marco negro, nunca se cierra. */
export function DemoBanner() {
  return (
    <p className="shrink-0 py-1.5 text-center text-[10px] font-medium tracking-[0.1em] text-white/45 uppercase">
      Demo técnico · datos ficticios · no afiliado a Expoflores
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

export function AppLayout() {
  const { user, signOut } = useSession()
  // Preferencia del usuario, no del dispositivo: se recuerda entre visitas.
  const [expanded, setExpanded] = useState(() => localStorage.getItem(RAIL_KEY) === '1')

  const toggle = () => {
    setExpanded((open) => {
      localStorage.setItem(RAIL_KEY, open ? '0' : '1')
      return !open
    })
  }

  if (user === null) return null

  const initials = user.email.slice(0, 2).toUpperCase()

  return (
    // Marco fijo a la altura de la ventana: el rail no se mueve y solo desplaza el panel.
    <div className="flex h-dvh flex-col bg-ink">
      <DemoBanner />

      <div className="flex min-h-0 flex-1">
        <div
          className={cn(
            'relative z-10 flex shrink-0 flex-col px-2 pb-2 transition-[width] duration-200 ease-out',
            expanded ? 'w-60' : 'w-14',
          )}
        >
          <div className="flex h-10 w-full items-center gap-3 px-[11px] text-white">
            <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-white text-[10px] font-semibold text-ink">
              E
            </span>
            <RowLabel expanded={expanded} title="Expo Flor Ecuador" meta="Acreditaciones 2026" />
          </div>

          <RailButton
            label={expanded ? 'Contraer menú' : 'Expandir menú'}
            expanded={expanded}
            icon={<ExpandIcon open={expanded} />}
            onClick={toggle}
            aria-expanded={expanded}
            className={cn('mt-1', ROW_IDLE)}
          />

          <nav aria-label="Navegación principal" className="mt-3 flex flex-col gap-1">
            {NAV[user.role].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to.split('/').length === 2}
                aria-label={item.label}
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
            <RailButton
              label="Cerrar sesión"
              expanded={expanded}
              icon={ICONS.signOut}
              onClick={signOut}
              className={ROW_IDLE}
            />

            {/* La cuenta no es un menu: la tarjeta ya muestra rol y correo, y salir es la fila de arriba. */}
            <div
              className={cn(ROW, 'text-white/70')}
              tabIndex={0}
              aria-label={`${ROLE_LABEL[user.role]}: ${user.email}`}
            >
              <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-white/85 text-[9px] font-semibold text-ink">
                {initials}
              </span>
              <RowLabel expanded={expanded} title={ROLE_LABEL[user.role]} meta={user.email} />
              {expanded ? null : <RailCard label={user.email} />}
            </div>
          </div>
        </div>

        <main className="mr-1.5 mb-1.5 min-w-0 flex-1 overflow-y-auto rounded-xl bg-canvas text-ink">
          <div className="mx-auto max-w-5xl px-5 py-8 md:px-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
