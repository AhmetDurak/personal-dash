import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { isTouch } from './ItemFolderTree'

const MIN_WIDTH = 140
const MAX_WIDTH = 420

// A fixed-width sidebar column (the folder-tree and item-list columns across
// Notes/Vocab/Sentence/Scenario/Palace/Reading) that can be dragged wider/
// narrower from its right edge, remembering the chosen width per storageKey.
// Resizing only ever applies at the md breakpoint and up (via a CSS variable
// + `md:w-[var(--rs-width)]`, so it never fights a caller's own mobile layout
// (e.g. a list column that's `w-full` on phone and fixed-width on desktop).
// `mobileClassName` controls what the column does below md — default 'hidden'
// matches the folder-tree columns, which get their own overlay drawer on
// mobile instead.
export function ResizableSidebar({ storageKey, defaultWidth, className = '', mobileClassName = 'hidden', children }: {
  storageKey: string
  defaultWidth: number
  className?: string
  mobileClassName?: string
  children: ReactNode
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const [width, setWidth] = useState(() => {
    const stored = Number(localStorage.getItem(storageKey))
    return stored >= MIN_WIDTH && stored <= MAX_WIDTH ? stored : defaultWidth
  })

  useEffect(() => {
    if (isTouch) return
    function onMove(e: MouseEvent) {
      if (!draggingRef.current || !containerRef.current) return
      const left = containerRef.current.getBoundingClientRect().left
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX - left)))
    }
    function onUp() {
      if (!draggingRef.current) return
      draggingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(storageKey, String(width))
  }, [storageKey, width])

  return (
    <div
      ref={containerRef}
      className={`${mobileClassName} md:flex md:w-[var(--rs-width)] flex-shrink-0 flex-col relative ${className}`}
      style={{ '--rs-width': `${width}px` } as CSSProperties}
    >
      {children}
      <div
        onMouseDown={e => {
          e.preventDefault()
          draggingRef.current = true
          document.body.style.cursor = 'col-resize'
          document.body.style.userSelect = 'none'
        }}
        onDoubleClick={() => setWidth(defaultWidth)}
        title="Drag to resize, double-click to reset"
        className="hidden md:flex absolute top-0 -right-1.5 w-3 h-full cursor-col-resize z-10 group items-center justify-center"
      >
        <div className="w-px h-full bg-transparent group-hover:bg-xero-green/50 group-active:bg-xero-green/70 transition-colors" />
      </div>
    </div>
  )
}
