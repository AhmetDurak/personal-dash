import { useEffect, useRef } from 'react'

// Remembers a section's last selected item in this browser and reopens it when the
// section is shown again with nothing selected. Restores once per mount, after the
// items have loaded, so it never fights an explicit "back to list" or a deep link.
export function useRememberedSelection(
  storageKey: string,
  selectedId: number | string | null,
  ready: boolean,
  restore: (id: string) => void,
  exists: (id: string) => boolean,
) {
  useEffect(() => {
    if (selectedId === null) return
    try { localStorage.setItem(storageKey, String(selectedId)) } catch { /* storage unavailable */ }
  }, [storageKey, selectedId])

  const restored = useRef(false)
  useEffect(() => {
    if (restored.current || !ready) return
    restored.current = true
    if (selectedId !== null) return
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored && exists(stored)) restore(stored)
    } catch { /* storage unavailable */ }
  }, [ready]) // eslint-disable-line react-hooks/exhaustive-deps
}
