// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: false,
  suppressErrorRendering: true,
  securityLevel: 'loose',
})

describe('DocumentationPage Mermaid Diagrams Syntax Verification', () => {
  const filePath = path.resolve(__dirname, 'DocumentationPage.tsx')
  const content = fs.readFileSync(filePath, 'utf8')
  const matches = [...content.matchAll(/const ([A-Z0-9_]+_CHART) = \`([\s\S]*?)\`/g)]

  it('should find all 17 diagrams', () => {
    expect(matches.length).toBe(17)
  })

  for (const match of matches) {
    const chartName = match[1] ?? 'UNKNOWN_CHART'
    const chartBody = match[2]?.trim() ?? ''

    it(`should parse diagram "${chartName}" without syntax errors`, async () => {
      let parseError: Error | null = null
      try {
        await mermaid.parse(chartBody)
      } catch (e: any) {
        parseError = e
      }
      expect(parseError, `Diagram ${chartName} had syntax error: ${parseError?.message}`).toBeNull()
    })
  }
})
