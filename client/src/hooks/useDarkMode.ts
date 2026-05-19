import { useEffect, useState } from 'react'

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('fd:dark') === 'true' } catch { return false }
  })

  useEffect(() => {
    const root = document.documentElement
    dark ? root.classList.add('dark') : root.classList.remove('dark')
    try { localStorage.setItem('fd:dark', String(dark)) } catch {}
  }, [dark])

  return { dark, toggle: () => setDark(d => !d) }
}
