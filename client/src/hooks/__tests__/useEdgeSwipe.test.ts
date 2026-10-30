import { describe, it, expect } from 'vitest'
import { swipeAction } from '../useEdgeSwipe'

describe('swipeAction', () => {
  it('opens on a rightward swipe that starts at the left edge', () => {
    expect(swipeAction(false, { x: 5, y: 300 }, { x: 120, y: 310 })).toBe('open')
  })

  it('ignores rightward swipes that start away from the edge', () => {
    expect(swipeAction(false, { x: 100, y: 300 }, { x: 250, y: 300 })).toBeNull()
  })

  it('closes on a leftward swipe while open', () => {
    expect(swipeAction(true, { x: 200, y: 300 }, { x: 80, y: 290 })).toBe('close')
  })

  it('ignores short moves and vertical scrolling', () => {
    expect(swipeAction(false, { x: 5, y: 300 }, { x: 40, y: 300 })).toBeNull()
    expect(swipeAction(true, { x: 200, y: 100 }, { x: 120, y: 400 })).toBeNull()
  })
})
