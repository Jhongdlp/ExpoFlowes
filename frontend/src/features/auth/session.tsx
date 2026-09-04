import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react'

import { api, ApiError, clearToken, getToken, setToken, SESSION_EXPIRED_EVENT } from '../../api/client'
import type { Me, Token } from '../../api/types'

type Status = 'loading' | 'anonymous' | 'authenticated' | 'error'

interface SessionValue {
  status: Status
  user: Me | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => void
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken())
  const queryClient = useQueryClient()

  const forget = useCallback(() => {
    clearToken()
    setTokenState(null)
    queryClient.clear()
  }, [queryClient])

  // El cliente HTTP avisa del 401 sin conocer el router; aqui se traduce a "sin sesion" y
  // las guardas se encargan de llevar al login. Nunca una pantalla en blanco.
  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, forget)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, forget)
  }, [forget])

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['me', token],
    queryFn: () => api.get<Me>('/auth/me'),
    enabled: token !== null,
    retry: (attempt, failure) => attempt < 1 && !(failure instanceof ApiError && failure.status === 401),
    staleTime: Infinity,
  })

  const signIn = useCallback(
    async (email: string, password: string) => {
      const issued = await api.post<Token>('/auth/login', { email, password })
      setToken(issued.access_token)
      setTokenState(issued.access_token)
    },
    [],
  )

  // Un backend caido NO es una sesion invalida: cerrar sesion por un 502 obligaria a volver
  // a escribir la clave por un corte de red. Solo el 401 desautentica.
  const rejected = error instanceof ApiError && error.status === 401
  const status: Status =
    token === null || (isError && rejected)
      ? 'anonymous'
      : isError
        ? 'error'
        : isPending
          ? 'loading'
          : 'authenticated'

  return (
    <SessionContext value={{ status, user: data ?? null, signIn, signOut: forget }}>
      {children}
    </SessionContext>
  )
}

export function useSession(): SessionValue {
  const value = use(SessionContext)
  if (value === null) throw new Error('useSession fuera de <SessionProvider>')
  return value
}
