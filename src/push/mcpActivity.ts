import type { PushMessage } from './messages'

// Pure mapping from a successful MCP write tool call to the push notification
// telling the user what the AI changed and where to look. Reads, deletes,
// reviews and folder moves return null — only new or edited content notifies.

interface Target {
  noun:   string                       // singular, shown in the title
  url:    (id?: number | string) => string
  label?: (item: Record<string, unknown>) => unknown
}

const TARGETS: Record<string, Target> = {
  language_vocab:    { noun: 'word',       url: id => `/learn/language/vocab${id !== undefined ? `?highlight=${id}` : ''}`,    label: i => i.word },
  language_sentence: { noun: 'sentence',   url: id => `/learn/language/sentence${id !== undefined ? `?highlight=${id}` : ''}`, label: i => i.source_text },
  language_scenario: { noun: 'scenario',   url: id => `/learn/language/scenario${id !== undefined ? `?highlight=${id}` : ''}`, label: i => i.title },
  notes:             { noun: 'note',       url: id => `/learn/notes${id !== undefined ? `?note=${id}` : ''}`,                 label: i => i.title },
  mindmap:           { noun: 'mind map',   url: id => `/learn/mindmap${id !== undefined ? `?map=${id}` : ''}`,                label: i => i.title },
  chains:            { noun: 'chain',      url: () => '/learn/chains',                                                       label: i => i.title },
  transcript:        { noun: 'transcript', url: () => '/learn/transcript',                                                   label: i => i.title },
  updates:           { noun: 'update',     url: () => '/updates',                                                            label: i => i.title },
}

const ACTIONS: Record<string, 'added' | 'updated'> = {
  add: 'added', bulk_add: 'added', create: 'added', publish: 'added', fetch: 'added',
  update: 'updated', set_mark: 'updated',
}

function splitTool(name: string): { group: string; action: string } | null {
  for (const action of Object.keys(ACTIONS).sort((a, b) => b.length - a.length)) {
    if (name.endsWith('_' + action)) return { group: name.slice(0, -(action.length + 1)), action }
  }
  return null
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function mcpWriteMessage(toolName: string, resultText: string): PushMessage | null {
  const parts = splitTool(toolName)
  const target = parts && TARGETS[parts.group]
  if (!parts || !target) return null

  let data: unknown
  try { data = JSON.parse(resultText) } catch { return null }
  if (data === null || (isRecord(data) && 'error' in data)) return null   // tool reported no-op / failure

  const verb = ACTIONS[parts.action]
  const key = `mcp:${parts.group}`   // also the notification tag — a burst of writes collapses per page

  if (Array.isArray(data)) {
    if (data.length === 0) return null
    const n = data.length
    return { key, title: `AI ${verb} ${n} ${target.noun}${n === 1 ? '' : 's'}`, body: '', url: target.url() }
  }
  if (!isRecord(data)) return null

  const id = typeof data.id === 'number' || typeof data.id === 'string' ? data.id : undefined
  const label = target.label?.(data)
  return {
    key,
    title: `AI ${verb} ${/^[aeiou]/.test(target.noun) ? 'an' : 'a'} ${target.noun}`,
    body:  typeof label === 'string' ? label.slice(0, 120) : '',
    url:   target.url(id),
  }
}
