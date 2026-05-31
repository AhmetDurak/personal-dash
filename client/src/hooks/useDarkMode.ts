import { useEffect, useState } from 'react'

export type Theme =
  | 'light'
  | 'dark'
  | 'nord'
  | 'dracula'
  | 'solarized'
  | 'tokyo'
  | 'catppuccin'

const DARK_THEMES = new Set<Theme>(['dark', 'nord', 'dracula', 'tokyo', 'catppuccin'])

export interface ThemeMeta {
  id:         Theme
  label:      string
  isDark:     boolean
  /** Color shown as the page/card background in the swatch */
  swatchBg:   string
  /** Color shown as the top strip in the swatch */
  swatchTop:  string
  /** Accent dot color */
  accent:     string
  /** Label text color on the swatch */
  labelColor: string
}

export const THEMES: ThemeMeta[] = [
  { id: 'light',      label: 'Light',       isDark: false, swatchBg: '#F5F6FA', swatchTop: '#FFFFFF',  accent: '#00B087', labelColor: '#374151' },
  { id: 'dark',       label: 'Dark',        isDark: true,  swatchBg: '#0F172A', swatchTop: '#1E293B',  accent: '#00B087', labelColor: '#94A3B8' },
  { id: 'nord',       label: 'Nord',        isDark: true,  swatchBg: '#2E3440', swatchTop: '#3B4252',  accent: '#88C0D0', labelColor: '#D8DEE9' },
  { id: 'dracula',    label: 'Dracula',     isDark: true,  swatchBg: '#282A36', swatchTop: '#44475A',  accent: '#BD93F9', labelColor: '#F8F8F2' },
  { id: 'solarized',  label: 'Solarized',   isDark: false, swatchBg: '#EEE8D5', swatchTop: '#FDF6E3',  accent: '#268BD2', labelColor: '#073642' },
  { id: 'tokyo',      label: 'Tokyo Night', isDark: true,  swatchBg: '#1A1B2E', swatchTop: '#1F2335',  accent: '#7AA2F7', labelColor: '#C0CAF5' },
  { id: 'catppuccin', label: 'Catppuccin',  isDark: true,  swatchBg: '#1E1E2E', swatchTop: '#313244',  accent: '#CBA6F7', labelColor: '#CDD6F4' },
]

function applyTheme(t: Theme) {
  const root = document.documentElement
  DARK_THEMES.has(t) ? root.classList.add('dark') : root.classList.remove('dark')
  root.setAttribute('data-theme', t)
}

function readStored(): Theme {
  try {
    const raw = localStorage.getItem('fd:theme') as Theme | null
    if (raw && THEMES.some(t => t.id === raw)) return raw
    // legacy: migrate from boolean fd:dark
    const legacyDark = localStorage.getItem('fd:dark')
    if (legacyDark === 'true') return 'dark'
  } catch { /* ignore */ }
  return 'light'
}

export function useDarkMode() {
  const [theme, setThemeState] = useState<Theme>(readStored)

  // Apply on first render (handles page reload without flash)
  useEffect(() => { applyTheme(readStored()) }, [])

  useEffect(() => { applyTheme(theme) }, [theme])

  function setTheme(t: Theme) {
    setThemeState(t)
    try { localStorage.setItem('fd:theme', t) } catch { /* ignore */ }
  }

  // Legacy toggle: switches between light ↔ dark (two-state flip for the
  // TopBar toggle button; theme picker uses setTheme directly)
  function toggle() { setTheme(DARK_THEMES.has(theme) ? 'light' : 'dark') }

  return {
    theme,
    setTheme,
    dark: DARK_THEMES.has(theme),
    toggle,
  }
}
