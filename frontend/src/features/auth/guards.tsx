import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

import { FullPageLoading } from '../../components/Loading'
import { Button } from '../../components/ui/Button'
import { Notice } from '../../components/ui/Notice'
import type { Role } from '../../api/types'
import { useSession } from './session'

export const HOME_BY_ROLE: Record<Role, string> = {
  admin: '/admin',
  representative: '/stand',
}

/**
 * Guarda por rol. Un token caducado no deja pantalla en blanco: la sesion ya se limpio y
 * aqui se redirige al login recordando a donde iba el usuario.
 */
function Unreachable() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-sm">
        <Notice title="No se pudo contactar con el servidor">
          Su sesión sigue abierta. Vuelva a intentarlo en unos segundos.
        </Notice>
        <Button className="mt-4 w-full" onClick={() => window.location.reload()}>
          Reintentar
        </Button>
      </div>
    </div>
  )
}

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { status, user } = useSession()
  const location = useLocation()

  if (status === 'loading') return <FullPageLoading />
  if (status === 'error') return <Unreachable />
  if (status === 'anonymous' || user === null) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  // Un rol que no corresponde no ve un 403: aterriza en su propio panel.
  if (user.role !== role) return <Navigate to={HOME_BY_ROLE[user.role]} replace />
  return <>{children}</>
}

export function HomeRedirect() {
  const { status, user } = useSession()

  if (status === 'loading') return <FullPageLoading />
  if (status === 'error') return <Unreachable />
  if (user === null) return <Navigate to="/login" replace />
  return <Navigate to={HOME_BY_ROLE[user.role]} replace />
}
