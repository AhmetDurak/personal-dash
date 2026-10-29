import { sm2, SRS_CONFIG } from './srs'

const now = new Date('2026-10-30T12:00:00Z')

describe('sm2', () => {
  it('uses each kind\'s second interval', () => {
    expect(sm2('vocab', 1, 1, 2.5, 4, now).interval).toBe(6)
    expect(sm2('sentence', 1, 1, 2.3, 4, now).interval).toBe(4)
    expect(sm2('scenario', 1, 1, 2.1, 4, now).interval).toBe(3)
  })

  it('first success is 1 day, later ones multiply by ease', () => {
    expect(sm2('scenario', 1, 0, 2.1, 4, now)).toMatchObject({ interval: 1, repetitions: 1, dueAt: '2026-10-31' })
    expect(sm2('vocab', 6, 2, 2.5, 4, now).interval).toBe(15)
  })

  it('a failed recall resets to 1 day and lowers ease (never below 1.3)', () => {
    expect(sm2('sentence', 20, 4, 2.3, 2, now)).toMatchObject({ interval: 1, repetitions: 0 })
    expect(sm2('sentence', 20, 4, 2.3, 2, now).easeFactor).toBeCloseTo(1.98)
    expect(sm2('vocab', 5, 3, 1.3, 0, now).easeFactor).toBe(1.3)
  })

  it('longer item kinds start with a lower ease', () => {
    expect(SRS_CONFIG.vocab.startEase).toBeGreaterThan(SRS_CONFIG.sentence.startEase)
    expect(SRS_CONFIG.sentence.startEase).toBeGreaterThan(SRS_CONFIG.scenario.startEase)
  })
})
