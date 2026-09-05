import { describe, expect, it } from 'vitest'

import { identificationError } from './identification'

/**
 * R16 en el cliente. Los casos son EXACTAMENTE los de
 * `backend/tests/unit/test_identification.py`: son dos implementaciones del mismo
 * algoritmo, y este archivo existe para que no se separen sin que nadie se entere.
 *
 * Identificaciones ficticias: válidas por algoritmo, generadas, de nadie.
 */

const VALID_CEDULAS = ['1712345675', '0923456784', '0109876540', '1710000017', '1300000070']

const VALID_RUCS = [
  '1791234561001', // jurídica privada (tercer dígito 9)
  '0992345675001',
  '0198765430001',
  '1712345675001', // persona natural: cédula válida + establecimiento
  '1760012320001', // entidad pública (tercer dígito 6)
]

describe('cédula: módulo 10', () => {
  it.each(VALID_CEDULAS)('acepta %s', (value) => {
    expect(identificationError(value, 'CEDULA')).toBeUndefined()
  })

  it.each([
    ['1712345674', 'verificador'], // último dígito alterado
    ['1712345670', 'verificador'],
    ['2512345675', 'provincia'], // la provincia 25 no existe
    ['1762345675', 'tercer dígito'], // tercer dígito 6: no es persona natural
    ['171234567', '10 dígitos'], // corta
    ['17123456755', '10 dígitos'], // larga
    ['17123A5675', '10 dígitos'], // no numérica
  ])('rechaza %s por %s', (value, reason) => {
    expect(identificationError(value, 'CEDULA')).toContain(reason)
  })
})

describe('RUC: módulo 11 según el tercer dígito', () => {
  it.each(VALID_RUCS)('acepta %s', (value) => {
    expect(identificationError(value, 'RUC')).toBeUndefined()
  })

  it.each([
    ['1791234562001', 'verificador'], // jurídica con verificador alterado
    ['1760012310001', 'verificador'], // pública con verificador alterado
    ['1712345674001', 'verificador'], // natural sobre cédula inválida
    ['1771234561001', 'tercer dígito'], // tercer dígito 7: no existe ese contribuyente
    ['1791234561000', 'establecimiento'], // establecimiento 000
    ['179123456100', '13 dígitos'],
    ['17912345610011', '13 dígitos'],
  ])('rechaza %s por %s', (value, reason) => {
    expect(identificationError(value, 'RUC')).toContain(reason)
  })
})

describe('documentos extranjeros: sin algoritmo, solo formato', () => {
  it.each([
    ['AB1234567', 'PASSPORT'],
    ['X4839201', 'FOREIGN_ID'],
    ['123456789012345', 'PASSPORT'],
  ] as const)('acepta %s', (value, type) => {
    expect(identificationError(value, type)).toBeUndefined()
  })

  it.each(['AB1', 'AB 123456', 'A'.repeat(21)])('rechaza %s', (value) => {
    expect(identificationError(value, 'PASSPORT')).toBeDefined()
  })
})

/**
 * Única divergencia deliberada con el servidor: el vacío no se marca aquí.
 *
 * En el backend un string vacío es una identificación inválida. En un formulario, en
 * cambio, "aún no ha escrito nada" no es "escribió un número mal": el mensaje que toca es
 * el de campo obligatorio, y lo pone el propio campo. Marcar las dos cosas a la vez
 * pintaría "el dígito verificador no coincide" sobre un input en blanco.
 */
it('deja el campo vacío al mensaje de obligatorio, no al del algoritmo', () => {
  expect(identificationError('', 'CEDULA')).toBeUndefined()
  expect(identificationError('   ', 'RUC')).toBeUndefined()
})
