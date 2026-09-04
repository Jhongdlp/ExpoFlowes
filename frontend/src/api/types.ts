/**
 * Alias sobre el esquema OpenAPI generado (`npm run gen:api`).
 *
 * Ni un solo tipo de la API se escribe a mano (§13): si el backend cambia un campo, el
 * `tsc -b` de CI lo detecta aqui antes que un usuario en produccion.
 */

import type { components } from './schema'

type Schemas = components['schemas']

export type Me = Schemas['MeResponse']
export type Token = Schemas['TokenResponse']
export type Role = Me['role']

export type AdminDashboard = Schemas['AdminDashboard']
export type MyQuota = Schemas['MyQuota']
export type StandSizeRule = Schemas['StandSizeRuleRead']
export type CredentialRule = Schemas['CredentialRuleRead']
export type Exhibitor = Schemas['ExhibitorRead']
export type ExhibitorDetail = Schemas['ExhibitorDetail']
export type Participant = Schemas['ParticipantRead']
export type ExhibitorPage = Schemas['Page_ExhibitorRead_']
export type ParticipantPage = Schemas['Page_ParticipantWithExhibitor_']
export type ParticipantWithExhibitor = Schemas['ParticipantWithExhibitor']
