import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

export type TextSize = 'normal' | 'large' | 'xlarge'

export interface AccessibilitySettings {
  textSize: TextSize
  highContrast: boolean
  reducedMotion: boolean
  enhancedFocus: boolean
  wideSpacing: boolean
  readableFont: boolean
}

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  textSize: 'normal',
  highContrast: false,
  reducedMotion: false,
  enhancedFocus: false,
  wideSpacing: false,
  readableFont: false,
}

const STORAGE_KEY = 'expoflores.accessibility'

interface AccessibilityContextValue {
  settings: AccessibilitySettings
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K],
  ) => void
  resetDefaults: () => void
  isDialogOpen: boolean
  openDialog: () => void
  closeDialog: () => void
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null)

function applySettingsToDom(settings: AccessibilitySettings) {
  const root = document.documentElement
  root.setAttribute('data-text-size', settings.textSize)
  root.setAttribute('data-contrast', settings.highContrast ? 'high' : 'normal')
  root.setAttribute('data-reduced-motion', settings.reducedMotion ? 'true' : 'false')
  root.setAttribute('data-focus-ring', settings.enhancedFocus ? 'enhanced' : 'normal')
  root.setAttribute('data-spacing', settings.wideSpacing ? 'wide' : 'normal')
  root.setAttribute('data-font', settings.readableFont ? 'readable' : 'default')
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) {
        return { ...DEFAULT_ACCESSIBILITY_SETTINGS, ...JSON.parse(stored) }
      }
    } catch {
      // Ignorar errores de parseo
    }
    return DEFAULT_ACCESSIBILITY_SETTINGS
  })

  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    applySettingsToDom(settings)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // Ignorar excepciones de storage
    }
  }, [settings])

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const resetDefaults = () => {
    setSettings(DEFAULT_ACCESSIBILITY_SETTINGS)
  }

  return (
    <AccessibilityContext.Provider
      value={{
        settings,
        updateSetting,
        resetDefaults,
        isDialogOpen,
        openDialog: () => setIsDialogOpen(true),
        closeDialog: () => setIsDialogOpen(false),
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility(): AccessibilityContextValue {
  const context = useContext(AccessibilityContext)
  if (context === null) {
    throw new Error('useAccessibility debe usarse dentro de AccessibilityProvider')
  }
  return context
}
