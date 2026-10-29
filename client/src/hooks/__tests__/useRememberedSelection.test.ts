import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRememberedSelection } from '../useRememberedSelection'

const KEY = 'test:lastSelected'
const exists = (id: string) => id === '7' || id === '9'

describe('useRememberedSelection', () => {
  beforeEach(() => localStorage.clear())

  it('remembers the selected item', () => {
    renderHook(() => useRememberedSelection(KEY, 9, true, vi.fn(), exists))
    expect(localStorage.getItem(KEY)).toBe('9')
  })

  it('restores once the items have loaded, when nothing is selected', () => {
    localStorage.setItem(KEY, '7')
    const restore = vi.fn()
    const { rerender } = renderHook(({ ready }) => useRememberedSelection(KEY, null, ready, restore, exists),
      { initialProps: { ready: false } })
    expect(restore).not.toHaveBeenCalled()
    rerender({ ready: true })
    rerender({ ready: true })
    expect(restore).toHaveBeenCalledTimes(1)
    expect(restore).toHaveBeenCalledWith('7')
  })

  it('does not override an existing selection or restore a deleted item', () => {
    localStorage.setItem(KEY, '7')
    const restore = vi.fn()
    renderHook(() => useRememberedSelection(KEY, 9, true, restore, exists))
    expect(restore).not.toHaveBeenCalled()

    localStorage.setItem(KEY, '42')
    const restore2 = vi.fn()
    renderHook(() => useRememberedSelection(KEY, null, true, restore2, exists))
    expect(restore2).not.toHaveBeenCalled()
  })
})
