// docs/presentacion.html -> docs/presentacion.pdf (A4, 5 paginas, §14.2)
import { chromium } from 'playwright'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(pathToFileURL(path.join(ROOT, 'docs/presentacion.html')).href, {
  waitUntil: 'networkidle',
})
await page.pdf({
  path: path.join(ROOT, 'docs/presentacion.pdf'),
  printBackground: true,
  preferCSSPageSize: true,
})
await browser.close()
console.log('✓ docs/presentacion.pdf')
