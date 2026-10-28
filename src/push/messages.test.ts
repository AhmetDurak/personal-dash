import { buildMessages, localClock, isValidTimeZone, DIGEST_HOUR, VOCAB_THRESHOLD, type DueSnapshot } from './messages'

function snapshot(overrides: Partial<DueSnapshot> = {}): DueSnapshot {
  return { reminders: [], vocabDue: 0, sentencesDue: 0, scenariosDue: 0, missedCheckpoints: [], ...overrides }
}

describe('buildMessages', () => {
  it('returns nothing when nothing is due', () => {
    expect(buildMessages(snapshot(), '2026-10-28', 12)).toEqual([])
  })

  it('keys reminders by id and local date', () => {
    const msgs = buildMessages(snapshot({ reminders: [{ id: 7, title: 'Pay rent', note: null }] }), '2026-10-28', 3)
    expect(msgs).toEqual([{ key: 'reminder:7:2026-10-28', title: 'Reminder: Pay rent', body: '', url: '/reminders' }])
  })

  it('holds daily digests before the digest hour but still sends reminders', () => {
    const d = snapshot({
      reminders: [{ id: 1, title: 'x', note: 'n' }],
      sentencesDue: 2, vocabDue: VOCAB_THRESHOLD,
      missedCheckpoints: [{ id: 'c1', challenge: 'Run', label: '5k', target_date: '2026-10-20' }],
    })
    expect(buildMessages(d, '2026-10-28', DIGEST_HOUR - 1).map(m => m.key)).toEqual(['reminder:1:2026-10-28'])
    expect(buildMessages(d, '2026-10-28', DIGEST_HOUR).map(m => m.key)).toEqual([
      'reminder:1:2026-10-28', 'challenge:c1:2026-10-28', 'language:due:2026-10-28', 'vocab:2026-10-28',
    ])
  })

  it('summarises language items with correct plurals', () => {
    const [m] = buildMessages(snapshot({ sentencesDue: 1, scenariosDue: 2 }), '2026-10-28', 9)
    expect(m.body).toBe('3 items to review (1 sentence, 2 scenarios).')
  })

  it('skips vocab below the threshold', () => {
    expect(buildMessages(snapshot({ vocabDue: VOCAB_THRESHOLD - 1 }), '2026-10-28', 9)).toEqual([])
  })
})

describe('localClock', () => {
  it('converts to the given timezone', () => {
    // 23:30 UTC on Oct 28 is 00:30 on Oct 29 in Berlin (CET, UTC+1)
    expect(localClock('Europe/Berlin', new Date('2026-10-28T23:30:00Z'))).toEqual({ date: '2026-10-29', hour: 0 })
    expect(localClock('UTC', new Date('2026-10-28T23:30:00Z'))).toEqual({ date: '2026-10-28', hour: 23 })
  })
})

describe('isValidTimeZone', () => {
  it('accepts IANA zones and rejects junk', () => {
    expect(isValidTimeZone('Europe/Berlin')).toBe(true)
    expect(isValidTimeZone('Not/AZone')).toBe(false)
  })
})
