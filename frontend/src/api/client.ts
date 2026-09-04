/**
 * Cliente HTTP unico.
 *
 * Todo error del backend llega con la forma {code, message, details} (§9.4) y sale de aqui
 * como `ApiError`, para que ninguna pantalla tenga que mirar `response.ok` ni adivinar.
 */

import { ERROR_MESSAGES, FALLBACK_MESSAGE } from '../lib/errors'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'
const TOKEN_KEY = 'expoflores.token'

/** El cliente no conoce el router. Avisa, y la sesion decide a donde llevar al usuario. */
export const SESSION_EXPIRED_EVENT = 'expoflores:session-expired'

export type ErrorDetails = Record<string, unknown>

export class ApiError extends Error {
  readonly code: string
  readonly details: ErrorDetails
  readonly status: number
  /** Texto tal cual lo envio el servidor. Solo para diagnostico, no para la UI. */
  readonly serverMessage: string

  constructor(code: string, details: ErrorDetails, status: number, serverMessage: string) {
    super(ERROR_MESSAGES[code] ?? FALLBACK_MESSAGE)
    this.name = 'ApiError'
    this.code = code
    this.details = details
    this.status = status
    this.serverMessage = serverMessage
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

type Body = Record<string, unknown> | undefined

async function toApiError(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null)
  if (body !== null && typeof body === 'object' && 'code' in body) {
    const parsed = body as { code: string; message?: string; details?: ErrorDetails }
    return new ApiError(parsed.code, parsed.details ?? {}, response.status, parsed.message ?? '')
  }
  return new ApiError('INTERNAL_ERROR', {}, response.status, '')
}

async function request<T>(method: string, path: string, body?: Body): Promise<T> {
  const token = getToken()
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('NETWORK_ERROR', {}, 0, '')
  }

  if (response.status === 401) {
    // Token ausente, caducado o revocado: se limpia y se avisa una sola vez (§13).
    clearToken()
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
    throw await toApiError(response)
  }
  if (!response.ok) throw await toApiError(response)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export const api = {
  get: <T,>(path: string) => request<T>('GET', path),
  post: <T,>(path: string, body?: Body) => request<T>('POST', path, body),
  patch: <T,>(path: string, body: Body) => request<T>('PATCH', path, body),
  delete: <T,>(path: string) => request<T>('DELETE', path),
}

/** Descarga autenticada: un <a href> no lleva la cabecera Authorization. */
export async function download(path: string, filename: string): Promise<void> {
  const token = getToken()
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: token === null ? {} : { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw await toApiError(response)

  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
