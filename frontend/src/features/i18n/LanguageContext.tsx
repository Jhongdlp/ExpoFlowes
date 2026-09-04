import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  LANGUAGES,
  translations,
  type Language,
  type TranslationTree,
} from './translations'

const STORAGE_KEY = 'expoflores.lang'

interface LanguageContextValue {
  lang: Language
  setLang: (lang: Language) => void
  toggleLang: () => void
  t: TranslationTree
  languages: typeof LANGUAGES
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'es' || stored === 'en') {
        return stored
      }
    } catch {
      // Ignorar errores en localStorage
    }
    return 'es'
  })

  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // Ignorar excepciones de storage
    }
  }, [lang])

  const setLang = (nextLang: Language) => {
    setLangState(nextLang)
  }

  const toggleLang = () => {
    setLangState((prev) => (prev === 'es' ? 'en' : 'es'))
  }

  const t = translations[lang]

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang,
        toggleLang,
        t,
        languages: LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext)
  if (context === null) {
    throw new Error('useLanguage debe usarse dentro de LanguageProvider')
  }
  return context
}

export function useTranslation(): LanguageContextValue {
  return useLanguage()
}
