import { useState, useRef, type ChangeEvent, type SVGProps } from 'react'
import {
  BANNER_PRESETS,
  DEFAULT_BANNER_ID,
  resolveBannerUrl,
  getBannerPreset,
  type BannerPreset,
} from './bannerPresets'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { useTranslation } from '../i18n/LanguageContext'
import { cn } from '../../lib/cn'

/* Iconos SVG minimalistas (trazo uniforme 1.5) */
function Icon({ children, className, ...props }: SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('h-4 w-4 shrink-0', className)}
      {...props}
    >
      {children}
    </svg>
  )
}

const ICONS = {
  image: (
    <Icon>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </Icon>
  ),
  sparkles: (
    <Icon>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </Icon>
  ),
  upload: (
    <Icon>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </Icon>
  ),
  uploadCloud: (
    <Icon className="h-6 w-6">
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M12 12v9" />
      <path d="m16 16-4-4-4 4" />
    </Icon>
  ),
  check: (
    <Icon className="h-3 w-3 stroke-2">
      <polyline points="20 6 9 17 4 12" />
    </Icon>
  ),
  chevronDown: (
    <Icon className="h-3.5 w-3.5">
      <path d="m6 9 6 6 6-6" />
    </Icon>
  ),
  chevronUp: (
    <Icon className="h-3.5 w-3.5">
      <path d="m18 15-6-6-6 6" />
    </Icon>
  ),
  reset: (
    <Icon className="h-3.5 w-3.5">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </Icon>
  ),
}

interface Props {
  value?: string | null
  onChange: (value: string) => void
  standName?: string
  legalName?: string
  taxId?: string
  requestedM2?: number
  standCategory?: string
  className?: string
  defaultOpen?: boolean
}

export function BannerSelector({
  value = DEFAULT_BANNER_ID,
  onChange,
  standName = '',
  legalName = '',
  taxId = '',
  requestedM2 = 0,
  standCategory,
  className,
  defaultOpen = false,
}: Props) {
  const { t, lang } = useTranslation()
  const activeValue = value || DEFAULT_BANNER_ID
  const currentImageUrl = resolveBannerUrl(activeValue)
  const currentPreset = getBannerPreset(activeValue)

  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [tab, setTab] = useState<'unsplash' | 'custom'>('unsplash')
  const [customUrlInput, setCustomUrlInput] = useState(() => (currentPreset ? '' : activeValue))
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSelectPreset = (preset: BannerPreset) => {
    onChange(preset.id)
    setUploadError(null)
  }

  const handleApplyCustomUrl = (url: string) => {
    setCustomUrlInput(url)
    if (url.trim()) {
      onChange(url.trim())
      setUploadError(null)
    }
  }

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    setUploadError(null)
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setUploadError(
        lang === 'en'
          ? 'Please select a valid image (PNG, JPG, WebP).'
          : 'Seleccione una imagen válida (PNG, JPG, WebP).',
      )
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      setUploadError(
        lang === 'en'
          ? 'Image exceeds 4 MB. Please choose a smaller file.'
          : 'La imagen supera 4 MB. Elija un archivo más ligero.',
      )
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      if (result) {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const maxW = 1200
          const maxH = 400
          let width = img.width
          let height = img.height

          if (width > maxW) {
            height = Math.round((height * maxW) / width)
            width = maxW
          }
          if (height > maxH) {
            width = Math.round((width * maxH) / height)
            height = maxH
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height)
            const optimized = canvas.toDataURL('image/webp', 0.85)
            onChange(optimized)
            setCustomUrlInput('')
          } else {
            onChange(result)
          }
        }
        img.src = result
      }
    }
    reader.readAsDataURL(file)
  }

  const displayCategory =
    standCategory ||
    (requestedM2 >= 31
      ? 'Grande'
      : requestedM2 >= 13
      ? 'Mediano'
      : requestedM2 >= 5
      ? 'Pequeño'
      : 'Stand')
  const localizedCategory =
    (t.standSizes as Record<string, string>)[displayCategory] ?? displayCategory

  return (
    <div className={cn('space-y-3', className)}>
      {/* BARRA MINIMALISTA DE ESTADO / BOTÓN DE EXPANDIR */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3 transition-all">
        <div className="flex items-center gap-3">
          {/* Mini thumbnail del banner actual */}
          <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded-lg border border-line/80 shadow-xs">
            <img
              src={currentImageUrl}
              alt="Banner actual"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/20" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-semibold text-ink">
                {lang === 'en' ? 'Stand Banner' : 'Banner del stand'}
              </span>
              <span className="rounded bg-brand/10 px-1.5 py-0.2 text-[10px] font-semibold text-brand">
                {currentPreset
                  ? lang === 'en'
                    ? currentPreset.tagEn
                    : currentPreset.tagEs
                  : lang === 'en'
                  ? 'Custom'
                  : 'Personalizado'}
              </span>
            </div>
            <p className="text-[11px] text-ink-soft">
              {currentPreset
                ? lang === 'en'
                  ? currentPreset.nameEn
                  : currentPreset.nameEs
                : lang === 'en'
                ? 'Custom image loaded'
                : 'Imagen personalizada activa'}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant={isOpen ? 'secondary' : 'primary'}
          size="sm"
          onClick={() => setIsOpen((prev) => !prev)}
          className="gap-2"
        >
          {isOpen ? (
            <>
              {ICONS.chevronUp}
              <span>{lang === 'en' ? 'Collapse' : 'Cerrar selector'}</span>
            </>
          ) : (
            <>
              {ICONS.image}
              <span>{lang === 'en' ? 'Customize banner' : 'Personalizar banner'}</span>
            </>
          )}
        </Button>
      </div>

      {/* SECCIÓN EXPANDIBLE */}
      {isOpen && (
        <div className="animate-rise space-y-4 rounded-xl border border-line/90 bg-canvas p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTab('unsplash')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all',
                  tab === 'unsplash'
                    ? 'bg-ink text-white shadow-xs'
                    : 'text-ink-soft hover:bg-surface hover:text-ink',
                )}
              >
                {ICONS.sparkles}
                <span>{lang === 'en' ? 'Floral Gallery (Unsplash)' : 'Galería floral (Unsplash)'}</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('custom')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all',
                  tab === 'custom'
                    ? 'bg-ink text-white shadow-xs'
                    : 'text-ink-soft hover:bg-surface hover:text-ink',
                )}
              >
                {ICONS.upload}
                <span>{lang === 'en' ? 'Upload file / URL' : 'Subir archivo / URL'}</span>
              </button>
            </div>

            <span className="text-[11px] text-ink-faint">
              {lang === 'en' ? 'High definition floral photography' : 'Fotografía floral de alta definición'}
            </span>
          </div>

          {/* TAB 1: PRESETS DE UNPSLASH */}
          {tab === 'unsplash' ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {BANNER_PRESETS.map((preset) => {
                const isSelected = activeValue === preset.id || activeValue === preset.url
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={cn(
                      'group relative flex flex-col overflow-hidden rounded-xl border text-left transition-all',
                      isSelected
                        ? 'border-brand bg-brand/5 shadow-xs ring-2 ring-brand'
                        : 'border-line bg-surface hover:border-ink/30 hover:shadow-xs',
                    )}
                  >
                    {/* Imagen de Unsplash */}
                    <div className="relative h-20 w-full overflow-hidden bg-zinc-800">
                      <img
                        src={preset.thumbnailUrl}
                        alt={preset.nameEs}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                      {/* Badge de categoría floral */}
                      <span className="absolute top-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white/90 backdrop-blur-xs">
                        {lang === 'en' ? preset.tagEn : preset.tagEs}
                      </span>

                      {isSelected && (
                        <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-white shadow-xs">
                          {ICONS.check}
                        </span>
                      )}
                    </div>

                    <div className="p-2">
                      <span className="line-clamp-1 block text-[11px] font-semibold text-ink">
                        {lang === 'en' ? preset.nameEn : preset.nameEs}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            /* TAB 2: PERSONALIZADO */
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="label-caps block text-[11px] text-ink">
                  {lang === 'en' ? 'Upload Custom Image' : 'Subir imagen desde equipo'}
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-line bg-surface px-3 py-4 text-center transition-colors hover:border-brand hover:bg-brand/5"
                >
                  <span className="text-ink-soft">{ICONS.uploadCloud}</span>
                  <span className="mt-1.5 text-[12px] font-medium text-ink">
                    {lang === 'en' ? 'Select or drop image' : 'Seleccionar imagen'}
                  </span>
                  <span className="text-[10px] text-ink-soft">
                    PNG, JPG, WebP · Max 4 MB
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Field
                  label={lang === 'en' ? 'Or Paste Direct Image URL' : 'O pegue URL directa'}
                  placeholder="https://images.unsplash.com/..."
                  value={customUrlInput}
                  onChange={(e) => handleApplyCustomUrl(e.target.value)}
                  hint={lang === 'en' ? 'Link to any direct image URL.' : 'Enlace directo a imagen.'}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onChange(DEFAULT_BANNER_ID)
                    setCustomUrlInput('')
                    setTab('unsplash')
                  }}
                  className="gap-1.5"
                >
                  {ICONS.reset}
                  <span>{lang === 'en' ? 'Reset to Default Red Roses' : 'Restablecer a Rosas Rojas'}</span>
                </Button>
              </div>
            </div>
          )}

          {uploadError && (
            <div className="rounded-lg bg-rose-50 px-3 py-1.5 text-[11px] font-medium text-rose-700">
              {uploadError}
            </div>
          )}

          {/* VISTA PREVIA COMPACTA Y MINIMALISTA */}
          <div className="overflow-hidden rounded-xl border border-line/80 bg-ink shadow-xs">
            <div className="relative min-h-[90px] overflow-hidden p-4 sm:p-5">
              <img
                src={currentImageUrl}
                alt="Banner preview"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/35" />

              <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 text-white">
                <div>
                  <span className="inline-block text-[10px] font-semibold tracking-wider text-white/70 uppercase">
                    {lang === 'en' ? 'Stand Header Preview' : 'Vista previa de cabecera'}
                  </span>
                  <h4 className="text-base font-bold text-white drop-shadow-xs sm:text-lg">
                    {standName.trim() || (lang === 'en' ? 'Stand Trade Name' : 'Nombre Comercial del Stand')}
                  </h4>
                  <p className="text-[11px] text-white/80">
                    {legalName.trim() || (lang === 'en' ? 'Company Name' : 'Razón Social')}
                    {taxId.trim() ? ` · ${taxId}` : ''}
                  </p>
                </div>

                <span className="rounded-md border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs">
                  Stand {localizedCategory} · {requestedM2 > 0 ? `${requestedM2} m²` : 'm²'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
