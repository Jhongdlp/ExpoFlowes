import { useQuery } from '@tanstack/react-query'

import { api } from '../api/client'
import type { CredentialRule, StandSizeRule } from '../api/types'

/**
 * Reglas parametrizadas, leidas del servidor (§7.1.3 / punto extra E3).
 *
 * Ninguna pantalla escribe un numero de negocio: los rangos, los bloques y las credenciales
 * por bloque llegan de `credential_rules` y `stand_size_rules`. Si el organizador corre el
 * UPDATE del README, los rotulos cambian con las cifras y no se quedan mintiendo.
 *
 * `staleTime: Infinity` es por sesion, no una cache de proceso: recargar la pagina vuelve a
 * leerlas. Cachearlas mas alla de eso romperia E3.
 */
export function useCredentialRules() {
  return useQuery({
    queryKey: ['rules', 'credentials'],
    queryFn: () => api.get<CredentialRule[]>('/rules/credentials'),
    staleTime: Infinity,
  })
}

export function useStandSizeRules() {
  return useQuery({
    queryKey: ['rules', 'stand-sizes'],
    queryFn: () => api.get<StandSizeRule[]>('/rules/stand-sizes'),
    staleTime: Infinity,
  })
}

/** "2 por cada 5 m²" / "2 per each 5 m²" derivado de la fila, con soporte de idioma. */
export function ruleLabel(rule: CredentialRule, lang: 'es' | 'en' = 'es'): string {
  if (lang === 'en') {
    return `${rule.credentials_per_block} per each ${rule.block_m2} m²`
  }
  return `${rule.credentials_per_block} por cada ${rule.block_m2} m²`
}
