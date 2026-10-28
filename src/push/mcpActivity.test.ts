import { mcpWriteMessage } from './mcpActivity'

describe('mcpWriteMessage', () => {
  it('deep-links a single added scenario', () => {
    expect(mcpWriteMessage('language_scenario_add', JSON.stringify({ id: 42, title: 'At the café' }))).toEqual({
      key: 'mcp:language_scenario', title: 'AI added a scenario', body: 'At the café', url: '/learn/language/scenario?highlight=42',
    })
  })

  it('summarises bulk adds with a plural and links the list page', () => {
    const m = mcpWriteMessage('language_vocab_bulk_add', JSON.stringify([{ id: 1 }, { id: 2 }, { id: 3 }]))
    expect(m).toMatchObject({ title: 'AI added 3 words', url: '/learn/language/vocab' })
  })

  it('reports updates with the item label', () => {
    expect(mcpWriteMessage('notes_update', JSON.stringify({ id: 'abc', title: 'Plan' })))
      .toMatchObject({ title: 'AI updated a note', body: 'Plan', url: '/learn/notes?note=abc' })
  })

  it('ignores reads, deletes, reviews and folder moves', () => {
    for (const t of ['notes_list', 'notes_delete', 'language_vocab_review', 'mindmap_move_folder', 'updates_mark_read']) {
      expect(mcpWriteMessage(t, JSON.stringify({ id: 1 }))).toBeNull()
    }
  })

  it('ignores null / error results and empty bulk adds', () => {
    expect(mcpWriteMessage('mindmap_update', 'null')).toBeNull()
    expect(mcpWriteMessage('transcript_fetch', JSON.stringify({ error: 'no captions' }))).toBeNull()
    expect(mcpWriteMessage('language_sentence_bulk_add', '[]')).toBeNull()
  })
})
