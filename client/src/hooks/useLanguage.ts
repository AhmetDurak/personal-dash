import { createContext, useContext, useState, useCallback } from 'react'
import { TRANSLATIONS } from '../i18n/translations'
import type { Lang, Translations } from '../i18n/translations'

export type { Lang }

interface LanguageCtx {
  lang: Lang
  t: Translations
  setLang: (l: Lang) => void
}

export const LanguageContext = createContext<LanguageCtx>({
  lang: 'en',
  t: TRANSLATIONS.en,
  setLang: () => {},
})

export function useLanguage(): LanguageCtx {
  return useContext(LanguageContext)
}

export function useLanguageState(): LanguageCtx {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem('fd:lang')
    return (stored === 'en' || stored === 'de' || stored === 'tr') ? stored : 'en'
  })

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    localStorage.setItem('fd:lang', l)
  }, [])

  return { lang, t: TRANSLATIONS[lang], setLang }
}
