// Capturas para el PDF de presentacion (docs/capturas/*.png).
// Uso: node scripts/capturas.mjs [baseUrl]   (por defecto el dev server en 5174)
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const BASE = process.argv[2] ?? 'http://localhost:5174'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'docs/capturas')

const ADMIN = ['admin@expoflores.demo', 'admin']
const REP = ['mariana.cevallos@rosascotopaxi.demo', 'admin']

const DESKTOP = { width: 1440, height: 900 }
const MOBILE = { width: 390, height: 844 }

const browser = await chromium.launch()

const shot = async (page, name, opts = {}) => {
  await page.waitForTimeout(700)
  await page.screenshot({ path: path.join(OUT, `${name}.png`), ...opts })
  console.log('✓', name)
}

const login = async (page, [email, password]) => {
  await page.goto(`${BASE}/login`)
  // La guia de bienvenida arranca sola la primera vez por rol y taparia la captura.
  await page.evaluate(() => {
    localStorage.setItem('expoflores.tour.seen.admin', '1')
    localStorage.setItem('expoflores.tour.seen.representative', '1')
  })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  try {
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 15000 })
  } catch {
    // El login esta limitado a 5 intentos por minuto por IP: al reejecutar el script se topa.
    console.log('  login rate-limited, reintentando en 65 s...')
    await page.waitForTimeout(65000)
    await page.click('button[type="submit"]')
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 15000 })
  }
}

const newPage = async (viewport, scale = 2) => {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: scale, locale: 'es-EC' })
  return ctx.newPage()
}

// ─────────────────────────────── ESCRITORIO · ADMIN ───────────────────────────
{
  const page = await newPage(DESKTOP)

  await page.goto(`${BASE}/login`)
  await shot(page, 'login')

  await login(page, ADMIN)
  await page.goto(`${BASE}/admin`)
  await shot(page, 'admin-dashboard')

  await page.goto(`${BASE}/admin/expositores`)
  await shot(page, 'exhibitor-list')

  await page.goto(`${BASE}/admin/reglas`)
  await shot(page, 'reglas')

  await page.goto(`${BASE}/admin/expositores/nuevo`)
  await page.fill('input[name="legal_name"]', 'Hacienda La Compañía S.A.')
  await page.fill('input[name="stand_name"]', 'La Compañía Roses')
  await page.fill('input[name="tax_id"]', '1791234561001')
  await page.fill('input[name="address"]', 'Panamericana Sur km 30, Cayambe')
  await page.fill('input[name="requested_m2"]', '28')
  await page.click('h1')
  await shot(page, 'exhibitor-form')

  // Dialogo de accesibilidad, desde el popup de opciones de la barra lateral. Se recorta al
  // propio dialogo: en el PDF va pequeño y el fondo atenuado lo dejaria ilegible.
  await page.click('button[aria-label="Opciones"]')
  await page.click('button:has-text("Accesibilidad")')
  await page.waitForTimeout(800)
  await page.locator('dialog[open]').first().screenshot({
    path: path.join(OUT, 'accesibilidad.png'),
  })
  console.log('✓ accesibilidad')

  await page.context().close()
}

// ───────────────────────── ESCRITORIO · REPRESENTANTE ─────────────────────────
{
  const page = await newPage(DESKTOP)
  await login(page, REP)

  await page.goto(`${BASE}/stand`)
  await shot(page, 'rep-dashboard')

  await page.goto(`${BASE}/stand/credenciales`)
  await shot(page, 'my-credentials')

  // Duplicado: identificacion ya acreditada por Flores del Valle (seed)
  await page.goto(`${BASE}/stand/credenciales/nueva`)
  await page.fill('input[name="first_name"]', 'Karla')
  await page.fill('input[name="last_name"]', 'Mena')
  await page.fill('input[name="identification"]', '1800000042')
  await page.fill('input[name="phone"]', '0992000002')
  await page.fill('input[name="position"]', 'Asistente de stand')
  await page.selectOption('select[name="category"]', 'Exhibitor')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(1500)
  await shot(page, 'error-duplicado')

  // Carga masiva: archivo con filas invalidas -> reporte fila por fila
  await page.goto(`${BASE}/stand/credenciales/carga`)
  await page.setInputFiles(
    'input#archivo',
    path.join(ROOT, 'datos_de_mocks/07_prueba_errores_de_validacion_filas.xlsx'),
  )
  await page.waitForTimeout(3000)
  await shot(page, 'carga-masiva')

  await page.context().close()
}

// ── Hoja de gafetes ──────────────────────────────────────────────────────────
// Apaisada (1440x700) para que entren cabecera, controles y una fila de tarjetas:
// asi la captura entra legible en la columna del PDF. El color de acento viaja en la
// URL; el encuadre de la imagen esta guardado en el propio badge art.
{
  const page = await newPage({ width: 1440, height: 700 })
  await login(page, REP)
  await page.goto(`${BASE}/stand/credenciales/imprimir?color=%233584e4`)
  await page.waitForTimeout(3500)
  await shot(page, 'imprimir-credenciales')
  await page.context().close()
}

// ─────────────────────────────── MOVIL (390 px) ───────────────────────────────
{
  const page = await newPage(MOBILE, 3)
  await login(page, REP)

  await page.goto(`${BASE}/stand`)
  await shot(page, 'movil-panel')

  await page.goto(`${BASE}/stand/credenciales`)
  await shot(page, 'movil-credenciales')

  await page.goto(`${BASE}/stand/credenciales/nueva`)
  await shot(page, 'movil-nueva-credencial')

  await page.context().close()
}

await browser.close()
