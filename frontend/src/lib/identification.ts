/**
 * Dígito verificador de cédula y RUC ecuatorianos, en el cliente.
 *
 * Es el mismo algoritmo que `app/domain/identification.py`, y esa duplicación es
 * deliberada. El resto de reglas —cupo, duplicados, rangos de metraje— NO se replican
 * aquí: dependen de estado que el navegador no tiene (cuántas credenciales quedan, quién
 * más registró esa cédula) o de tablas parametrizadas que pueden cambiar sin redeploy, así
 * que copiarlas garantizaría desincronización. El módulo 10 / módulo 11 no está en ninguna
 * de las dos categorías: lo fija el registro civil, no la feria, y no cambia entre eventos.
 *
 * El servidor sigue siendo la validación autoritativa. Esto solo evita que alguien llene
 * ocho campos y descubra un dedazo en el noveno dígito al pulsar guardar.
 */

const CEDULA_COEFFICIENTS = [2, 1, 2, 1, 2, 1, 2, 1, 2]
const RUC_PRIVATE_COEFFICIENTS = [4, 3, 2, 7, 6, 5, 4, 3, 2]
const RUC_PUBLIC_COEFFICIENTS = [3, 2, 7, 6, 5, 4, 3, 2]

/** 1–24 son las provincias; 30 son los ecuatorianos registrados en el exterior. */
function hasValidProvince(value: string): boolean {
  const province = Number(value.slice(0, 2))
  return (province >= 1 && province <= 24) || province === 30
}

const isDigits = (value: string, length: number) =>
  value.length === length && /^\d+$/.test(value)

/** Módulo 10: los productos mayores que 9 se reducen restando 9, no sumando sus cifras. */
function modulo10Digit(firstNine: string): number {
  let total = 0
  for (let index = 0; index < 9; index += 1) {
    // El coeficiente existe: el bucle recorre exactamente los 9 del arreglo.
    const product = Number(firstNine[index]) * (CEDULA_COEFFICIENTS[index] ?? 0)
    total += product > 9 ? product - 9 : product
  }
  return (10 - (total % 10)) % 10
}

function modulo11Digit(digits: string, coefficients: number[]): number {
  let total = 0
  for (let index = 0; index < coefficients.length; index += 1) {
    total += Number(digits[index]) * (coefficients[index] ?? 0)
  }
  const remainder = total % 11
  return remainder === 0 ? 0 : 11 - remainder
}

function checkCedula(value: string): string | undefined {
  if (!isDigits(value, 10)) return 'La cédula debe tener 10 dígitos numéricos.'
  if (!hasValidProvince(value)) return 'El código de provincia no existe.'
  if (Number(value[2]) > 5) return 'El tercer dígito no corresponde a una persona natural.'
  if (modulo10Digit(value.slice(0, 9)) !== Number(value[9])) {
    return 'El dígito verificador no coincide. Revise el número.'
  }
  return undefined
}

/** El tercer dígito decide el algoritmo: 0–5 natural, 6 pública, 9 jurídica. */
function checkRuc(value: string): string | undefined {
  if (!isDigits(value, 13)) return 'El RUC debe tener 13 dígitos numéricos.'

  const kind = Number(value[2])

  if (kind <= 5) {
    const failure = checkCedula(value.slice(0, 10))
    if (failure !== undefined) return failure
    return value.slice(10) === '000'
      ? 'El código de establecimiento no puede ser 000.'
      : undefined
  }

  if (!hasValidProvince(value)) return 'El código de provincia no existe.'

  if (kind === 6) {
    if (modulo11Digit(value.slice(0, 8), RUC_PUBLIC_COEFFICIENTS) !== Number(value[8])) {
      return 'El dígito verificador no coincide. Revise el número.'
    }
    return value.slice(9) === '0000'
      ? 'El código de establecimiento no puede ser 0000.'
      : undefined
  }

  if (kind === 9) {
    if (modulo11Digit(value.slice(0, 9), RUC_PRIVATE_COEFFICIENTS) !== Number(value[9])) {
      return 'El dígito verificador no coincide. Revise el número.'
    }
    return value.slice(10) === '000'
      ? 'El código de establecimiento no puede ser 000.'
      : undefined
  }

  return 'El tercer dígito no corresponde a ningún tipo de contribuyente.'
}

/**
 * Devuelve el mensaje del fallo, o `undefined` si la identificación es válida.
 *
 * PASSPORT y FOREIGN_ID no tienen algoritmo universal: solo formato razonable, igual que
 * en el servidor.
 */
export function identificationError(
  value: string,
  type: 'CEDULA' | 'RUC' | 'PASSPORT' | 'FOREIGN_ID',
): string | undefined {
  const trimmed = value.trim()
  if (trimmed === '') return undefined // el "requerido" lo dice el propio campo

  if (type === 'CEDULA') return checkCedula(trimmed)
  if (type === 'RUC') return checkRuc(trimmed)

  return /^[a-zA-Z0-9]{5,20}$/.test(trimmed)
    ? undefined
    : 'Debe ser alfanumérico, de entre 5 y 20 caracteres.'
}
