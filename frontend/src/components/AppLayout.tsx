import { NavLink, Outlet } from 'react-router-dom'

import { useSession } from '../features/auth/session'
import type { Role } from '../api/types'
import { cn } from '../lib/cn'
import { Button } from './ui/Button'

interface NavItem {
  to: string
  label: string
}

const NAV: Record<Role, NavItem[]> = {
  admin: [
    { to: '/admin', label: 'Panel' },
    { to: '/admin/expositores', label: 'Expositores' },
    { to: '/admin/credenciales', label: 'Credenciales' },
  ],
  representative: [
    { to: '/stand', label: 'Panel' },
    { to: '/stand/credenciales', label: 'Credenciales' },
  ],
}

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Organización',
  representative: 'Representante de stand',
}

/** Aviso permanente del demo (§14.5). Fijo arriba, nunca se cierra. */
export function DemoBanner() {
  return (
    <div className="bg-ink px-4 py-1.5 text-center text-[11px] font-medium tracking-[0.08em] text-white uppercase">
      Demo técnico · datos ficticios · no afiliado a Expoflores
    </div>
  )
}

function NavItems({ items, className }: { items: NavItem[]; className?: string }) {
  return (
    <nav className={className}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to.split('/').length === 2}
          className={({ isActive }) =>
            cn(
              'flex h-8 items-center border-l-2 px-3 text-[13px] transition-colors',
              isActive
                ? 'border-l-ink font-medium text-ink'
                : 'border-l-transparent text-ink-soft hover:bg-fill hover:text-ink',
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

export function AppLayout() {
  const { user, signOut } = useSession()
  if (user === null) return null
  const items = NAV[user.role]

  return (
    <div className="min-h-dvh bg-canvas">
      <DemoBanner />
      <div className="flex min-h-[calc(100dvh-30px)]">
        <aside className="hidden w-56 shrink-0 flex-col border-r border-line bg-surface md:flex">
          <div className="border-b border-line px-4 py-4">
            <p className="text-[13px] leading-tight font-semibold">Expo Flor Ecuador</p>
            <p className="label-caps mt-0.5">Acreditaciones 2026</p>
          </div>

          <NavItems items={items} className="flex flex-col py-3" />

          <div className="mt-auto border-t border-line px-4 py-3">
            <p className="label-caps">{ROLE_LABEL[user.role]}</p>
            <p className="mt-0.5 truncate text-[13px]" title={user.email}>
              {user.email}
            </p>
            <Button variant="ghost" size="sm" className="mt-2 -ml-3" onClick={signOut}>
              Cerrar sesión
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* En pantallas pequeñas la navegacion pasa a una fila; no hay menu oculto. */}
          <header className="flex items-center justify-between gap-4 border-b border-line bg-surface px-4 py-2 md:hidden">
            <p className="text-[13px] font-semibold">Expo Flor Ecuador</p>
            <Button variant="ghost" size="sm" onClick={signOut}>
              Salir
            </Button>
          </header>
          <NavItems
            items={items}
            className="flex overflow-x-auto border-b border-line bg-surface md:hidden"
          />

          <main className="min-w-0 flex-1 px-4 py-8 md:px-10">
            <div className="mx-auto max-w-5xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
