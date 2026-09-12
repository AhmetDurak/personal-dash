import { useEffect, useRef, type TextareaHTMLAttributes } from 'react'

// A <textarea> that grows to fit its content instead of clipping at a fixed
// `rows` count. Height is recalculated from scrollHeight whenever `value`
// changes, so it works for typing, pasting, and programmatic updates alike.
export function AutoGrowTextarea({ value, className, minRows = 2, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      rows={minRows}
      className={className}
      style={{ overflow: 'hidden' }}
      {...rest}
    />
  )
}
