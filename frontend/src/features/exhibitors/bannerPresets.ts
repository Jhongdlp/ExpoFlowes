export interface BannerPreset {
  id: string
  nameEs: string
  nameEn: string
  url: string
  thumbnailUrl: string
  tagEs: string
  tagEn: string
}

export const BANNER_PRESETS: BannerPreset[] = [
  {
    id: 'unsplash:roses-red',
    nameEs: 'Rosas Rojas Clásicas',
    nameEn: 'Classic Red Roses',
    tagEs: 'Rosas',
    tagEn: 'Roses',
    url: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1400&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=320&h=160&q=75',
  },
  {
    id: 'unsplash:roses-pink',
    nameEs: 'Rosas Rosadas & Pastel',
    nameEn: 'Blush & Pink Roses',
    tagEs: 'Rosas',
    tagEn: 'Roses',
    url: 'https://images.unsplash.com/photo-1559563458-527698bf5295?auto=format&fit=crop&w=1400&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1559563458-527698bf5295?auto=format&fit=crop&w=320&h=160&q=75',
  },
  {
    id: 'unsplash:tropical-blooms',
    nameEs: 'Flores Tropicales & Exóticas',
    nameEn: 'Tropical Exotic Blooms',
    tagEs: 'Tropical',
    tagEn: 'Tropical',
    url: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=1400&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=320&h=160&q=75',
  },
  {
    id: 'unsplash:flower-field',
    nameEs: 'Campo Floral Andino',
    nameEn: 'Sunlit Flower Valley',
    tagEs: 'Campo',
    tagEn: 'Field',
    url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1400&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=320&h=160&q=75',
  },
  {
    id: 'unsplash:sunflowers',
    nameEs: 'Girasoles Dorados',
    nameEn: 'Golden Sunflowers',
    tagEs: 'Girasoles',
    tagEn: 'Sunflowers',
    url: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=1400&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=320&h=160&q=75',
  },
  {
    id: 'unsplash:white-orchids',
    nameEs: 'Orquídeas & Flores Blancas',
    nameEn: 'White Orchids & Luxury',
    tagEs: 'Orquídeas',
    tagEn: 'Orchids',
    url: 'https://images.unsplash.com/photo-1508610048659-a06b669e3321?auto=format&fit=crop&w=1400&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1508610048659-a06b669e3321?auto=format&fit=crop&w=320&h=160&q=75',
  },
  {
    id: 'unsplash:white-roses',
    nameEs: 'Rosas Blancas & Crema',
    nameEn: 'White & Cream Roses',
    tagEs: 'Rosas',
    tagEn: 'Roses',
    url: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?auto=format&fit=crop&w=1400&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?auto=format&fit=crop&w=320&h=160&q=75',
  },
  {
    id: 'unsplash:spring-bouquet',
    nameEs: 'Jardín Floral Primavera',
    nameEn: 'Spring Flower Garden',
    tagEs: 'Variadas',
    tagEn: 'Bouquet',
    url: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&w=1400&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&w=320&h=160&q=75',
  },
]

export const DEFAULT_BANNER_ID = 'unsplash:roses-red'
export const DEFAULT_BANNER_URL = BANNER_PRESETS[0]!.url

/**
 * Resuelve la URL real de la imagen según el valor guardado (ID de preset, URL directa o fallback).
 */
export function resolveBannerUrl(value?: string | null): string {
  if (!value) return DEFAULT_BANNER_URL
  const preset = BANNER_PRESETS.find((p) => p.id === value)
  if (preset) return preset.url
  // Compatibilidad con presets anteriores
  if (value === 'preset:crimson-roses') return BANNER_PRESETS[0]!.url
  if (value === 'preset:tropical-orchids') return BANNER_PRESETS[2]!.url
  if (value === 'preset:golden-sunlight') return BANNER_PRESETS[3]!.url
  if (value === 'preset:lavender-mist') return BANNER_PRESETS[1]!.url
  if (value === 'preset:dark-botanical') return BANNER_PRESETS[5]!.url
  if (value === 'preset:spring-carnations') return BANNER_PRESETS[7]!.url
  return value
}

/**
 * Obtiene el preset correspondiente si existe.
 */
export function getBannerPreset(presetId?: string | null): BannerPreset | undefined {
  // 'preset:crimson-roses' es el id antiguo del primer tema; sigue en filas ya guardadas.
  if (!presetId || presetId === 'preset:crimson-roses') return BANNER_PRESETS[0]
  return BANNER_PRESETS.find((p) => p.id === presetId || p.url === presetId)
}
