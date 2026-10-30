import { parseReminderPatch } from './reminders'

describe('parseReminderPatch', () => {
  it('accepts partial updates and trims text', () => {
    expect(parseReminderPatch({ title: '  Pay rent ' })).toEqual({ title: 'Pay rent' })
    expect(parseReminderPatch({ due_at: '2026-11-01T08:00:00.000Z', repeat: 'monthly' }))
      .toEqual({ due_at: '2026-11-01T08:00:00.000Z', repeat: 'monthly' })
  })

  it('allows clearing the note and the date', () => {
    expect(parseReminderPatch({ note: '  ', due_at: null })).toEqual({ note: null, due_at: null })
  })

  it('rejects empty titles, bad dates, unknown repeats and empty patches', () => {
    expect(parseReminderPatch({ title: ' ' })).toBeNull()
    expect(parseReminderPatch({ due_at: 'soon' })).toBeNull()
    expect(parseReminderPatch({ repeat: 'hourly' })).toBeNull()
    expect(parseReminderPatch({})).toBeNull()
    expect(parseReminderPatch(null)).toBeNull()
  })
})
