import { useEffect } from 'react'

const EDGE = 24       // px from the left screen edge where an "open" swipe must start
const MIN_DIST = 60   // px of horizontal travel to count as a swipe

type Point = { x: number; y: number }

// Mobile panel gesture: swipe right from the left edge opens, swipe left closes.
// Mostly-vertical moves (scrolling) are ignored.
export function swipeAction(isOpen: boolean, start: Point, end: Point): 'open' | 'close' | null {
  const dx = end.x - start.x, dy = end.y - start.y
  if (Math.abs(dx) < MIN_DIST || Math.abs(dy) > Math.abs(dx)) return null
  if (!isOpen && dx > 0 && start.x <= EDGE) return 'open'
  if (isOpen && dx < 0) return 'close'
  return null
}

// Opens/closes a mobile slide-in panel (e.g. the folder tree) with edge swipes.
// Inactive on md+ screens, where the panel is always visible.
export function useEdgeSwipe(isOpen: boolean, setOpen: (open: boolean) => void) {
  useEffect(() => {
    if (window.matchMedia('(min-width: 768px)').matches) return
    let start: Point | null = null
    function onStart(e: TouchEvent) {
      start = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null
    }
    function onEnd(e: TouchEvent) {
      if (!start) return
      const t = e.changedTouches[0]
      const action = swipeAction(isOpen, start, { x: t.clientX, y: t.clientY })
      start = null
      if (action) setOpen(action === 'open')
    }
    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchend', onEnd)
    }
  }, [isOpen, setOpen])
}
