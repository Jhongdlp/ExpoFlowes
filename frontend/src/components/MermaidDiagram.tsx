import { useEffect, useId, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { cn } from '../lib/cn'

// Configuración de tema minimalista y profesional
mermaid.initialize({
  startOnLoad: false,
  suppressErrorRendering: true,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
  flowchart: {
    useMaxWidth: false,
    htmlLabels: true,
    curve: 'basis',
  },
  sequence: {
    useMaxWidth: false,
    showSequenceNumbers: true,
    actorMargin: 50,
    messageMargin: 35,
    boxMargin: 10,
    wrap: true,
  },
  er: {
    useMaxWidth: false,
  },
  themeVariables: {
    background: '#ffffff',
    primaryColor: '#edf3f0',
    primaryTextColor: '#1b3a30',
    primaryBorderColor: '#86988f',
    lineColor: '#4c635b',
    secondaryColor: '#fbf1f5',
    tertiaryColor: '#f6f9f7',
    edgeLabelBackground: '#ffffff',
    actorBkg: '#edf3f0',
    actorBorder: '#1b3a30',
    actorTextColor: '#1b3a30',
    actorLineColor: '#86988f',
    signalColor: '#1b3a30',
    signalTextColor: '#1b3a30',
    labelBoxBkgColor: '#f6f9f7',
    labelBoxBorderColor: '#86988f',
    labelTextColor: '#1b3a30',
    loopTextColor: '#1b3a30',
  },
})

interface MermaidDiagramProps {
  chart: string
  title?: string
  subtitle?: string
  className?: string
}

export function MermaidDiagram({ chart, title, subtitle, className }: MermaidDiagramProps) {
  const uniqueId = useId().replace(/:/g, '_')
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<boolean>(false)
  const [isOpenModal, setIsOpenModal] = useState<boolean>(false)

  // Estado de Zoom y Arrastre (Pan)
  const [zoom, setZoom] = useState<number>(1)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const initialPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const touchDistRef = useRef<number | null>(null)

  // Renderizado del diagrama
  useEffect(() => {
    let isMounted = true
    async function renderChart() {
      try {
        setError(null)
        const id = `mermaid_${uniqueId}`
        const { svg: renderedSvg } = await mermaid.render(id, chart)
        if (isMounted) {
          setSvg(renderedSvg)
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error al renderizar el gráfico')
        }
      }
    }

    renderChart()
    return () => {
      isMounted = false
    }
  }, [chart, uniqueId])

  const copyCode = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(chart)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadSvg = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!svg) return
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(title || 'diagrama').toLowerCase().replace(/\s+/g, '-')}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  // Zoom con la Ruedita del Ratón
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const factor = e.deltaY < 0 ? 1.15 : 0.88
    setZoom((prev) => {
      const next = Math.max(0.3, Math.min(5.0, prev * factor))
      return Number(next.toFixed(2))
    })
  }

  // Manejadores de Arrastre con el Ratón (Mouse Drag)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    initialPanRef.current = { ...pan }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    setPan({
      x: initialPanRef.current.x + dx,
      y: initialPanRef.current.y + dy,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Soporte Táctil (Pan y Pinch-to-Zoom en móvil/tablet)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0]
      if (!t) return
      setIsDragging(true)
      dragStartRef.current = { x: t.clientX, y: t.clientY }
      initialPanRef.current = { ...pan }
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      if (t1 && t2) {
        touchDistRef.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const t = e.touches[0]
      if (!t) return
      const dx = t.clientX - dragStartRef.current.x
      const dy = t.clientY - dragStartRef.current.y
      setPan({
        x: initialPanRef.current.x + dx,
        y: initialPanRef.current.y + dy,
      })
    } else if (e.touches.length === 2 && touchDistRef.current) {
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      if (t1 && t2) {
        const newDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
        const factor = newDist / touchDistRef.current
        setZoom((prev) => Math.max(0.3, Math.min(5.0, Number((prev * factor).toFixed(2)))))
        touchDistRef.current = newDist
      }
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    touchDistRef.current = null
  }

  return (
    <>
      {/* Tarjeta de Gráfico en la Página */}
      <div
        className={cn(
          'group relative surface overflow-hidden transition-all duration-150 hover:border-line-strong',
          className,
        )}
      >
        {/* Barra superior */}
        <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-2.5">
          <div className="min-w-0 pr-2">
            {title && <h4 className="text-[13px] font-semibold text-ink truncate">{title}</h4>}
            {subtitle && <p className="text-[11px] text-ink-faint truncate">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={copyCode}
              className="rounded px-2 py-1 text-[11px] font-medium text-ink-soft hover:bg-fill hover:text-ink transition-colors"
              title="Copiar código Mermaid"
            >
              {copied ? '✓ Copiado' : 'Código'}
            </button>
            <button
              type="button"
              onClick={downloadSvg}
              className="rounded px-2 py-1 text-[11px] font-medium text-ink-soft hover:bg-fill hover:text-ink transition-colors"
              title="Descargar imagen SVG"
            >
              SVG
            </button>
            <button
              type="button"
              onClick={() => {
                handleReset()
                setIsOpenModal(true)
              }}
              className="flex items-center gap-1 rounded bg-fill px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-sage transition-colors border border-line"
              title="Expandir a pantalla completa interactiva"
            >
              <span>⛶</span> Expandir & Zoom
            </button>
          </div>
        </div>

        {/* Vista previa tipo imagen con click para expandir */}
        <div
          onClick={() => {
            handleReset()
            setIsOpenModal(true)
          }}
          className="relative flex min-h-[220px] max-h-[460px] cursor-pointer items-center justify-center overflow-hidden bg-white p-6 transition-colors hover:bg-[#fafcfb]"
          title="Haz clic para abrir el visor interactivo (rueda para zoom, arrastre para mover)"
        >
          {error ? (
            <div className="max-w-md rounded border border-alert bg-alert-soft p-3 text-alert text-[11px]">
              <p className="font-semibold">Error de sintaxis</p>
              <pre className="mt-1 font-mono opacity-80 whitespace-pre-wrap">{error}</pre>
            </div>
          ) : svg ? (
            <div
              className="w-full flex items-center justify-center [&>svg]:max-h-[380px] [&>svg]:w-auto [&>svg]:max-w-full pointer-events-none select-none"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <div className="flex items-center gap-2 text-[12px] text-ink-faint">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              <span>Cargando gráfico...</span>
            </div>
          )}

          {/* Hint sutil */}
          <div className="pointer-events-none absolute bottom-2 right-3 rounded bg-surface/90 border border-line px-2 py-1 text-[10px] text-ink-faint shadow-xs opacity-0 group-hover:opacity-100 transition-opacity">
            🔍 Clic para ampliar, zoom y arrastre
          </div>
        </div>
      </div>

      {/* Modal / Lightbox Interactivo con Zoom y Arrastre */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-ink/80 backdrop-blur-xs p-2 sm:p-5 animate-fade">
          <div className="flex h-full w-full flex-col surface overflow-hidden shadow-2xl rounded-xl">
            {/* Cabecera del Visor */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-fill px-4 py-2.5">
              <div>
                <h3 className="text-[13px] font-bold text-ink">{title || 'Diagrama Interactivo'}</h3>
                {subtitle && <p className="text-[11px] text-ink-faint">{subtitle}</p>}
              </div>

              {/* Barra de Controles */}
              <div className="flex items-center gap-2">
                {/* Control de Zoom Manual */}
                <div className="flex items-center rounded-md border border-line bg-surface p-0.5 text-[12px]">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(0.3, Number((z - 0.2).toFixed(1))))}
                    className="px-2.5 py-1 text-ink hover:bg-fill rounded font-bold"
                    title="Alejar zoom (-)"
                  >
                    -
                  </button>
                  <span className="px-2 font-mono text-[11px] text-ink min-w-[50px] text-center font-semibold">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(5.0, Number((z + 0.2).toFixed(1))))}
                    className="px-2.5 py-1 text-ink hover:bg-fill rounded font-bold"
                    title="Acercar zoom (+)"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="border-l border-line px-2 py-1 text-[11px] text-ink-faint hover:text-ink font-medium"
                    title="Restablecer posición y zoom (100%)"
                  >
                    ↺ Restablecer
                  </button>
                </div>

                <button
                  type="button"
                  onClick={downloadSvg}
                  className="rounded border border-line bg-surface px-2.5 py-1.5 text-[11px] font-medium text-ink hover:bg-fill transition-colors"
                >
                  Descargar SVG
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsOpenModal(false)
                    handleReset()
                  }}
                  className="rounded bg-ink px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-ink/85 transition-colors"
                >
                  ✕ Cerrar
                </button>
              </div>
            </div>

            {/* Barra de Ayuda / Instrucciones */}
            <div className="flex items-center justify-between border-b border-line/60 bg-surface px-4 py-1.5 text-[11px] text-ink-faint">
              <span>💡 <b>Ruedita del ratón:</b> Zoom dentro/fuera · <b>Clic y arrastre:</b> Mover diagrama</span>
              <span className="font-mono text-[10px]">Posición: X: {Math.round(pan.x)}px, Y: {Math.round(pan.y)}px</span>
            </div>

            {/* Lienzo Interactivo con Arrastre y Ruedita */}
            <div
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onDoubleClick={handleReset}
              className={cn(
                'flex-1 overflow-hidden bg-[#fafcfb] p-6 flex items-center justify-center select-none relative',
                isDragging ? 'cursor-grabbing' : 'cursor-grab',
              )}
            >
              {svg && (
                <div
                  className="transition-transform duration-75 origin-center will-change-transform"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  }}
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
