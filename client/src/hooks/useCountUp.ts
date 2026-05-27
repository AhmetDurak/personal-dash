import { useState, useEffect, useRef } from 'react'

export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0)
  const startRef = useRef<number | null>(null)
  const rafRef   = useRef<number | null>(null)
  const prevTarget = useRef<number>(target)

  useEffect(() => {
    const from = prevTarget.current === target ? 0 : value
    prevTarget.current = target
    startRef.current = null

    function step(ts: number) {
      if (!startRef.current) startRef.current = ts
      const progress = Math.min((ts - startRef.current) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(from + (target - from) * eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration])

  return value
}
