import useSWR, { mutate as globalMutate } from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export interface Note {
  id: number
  title: string
  content: string
  created_at: string
  updated_at: string
}

export interface MMNode {
  id: string
  label: string
  back?: string
  parentId: string | null
  x?: number
  y?: number
}

export interface MMEdge {
  id: string
  from: string
  to: string
  bidirectional?: boolean
}

export interface MindmapMeta {
  id: number
  title: string
  created_at: string
  updated_at: string
}

export interface Mindmap extends MindmapMeta {
  nodes: MMNode[]
  edges: MMEdge[]
}

export interface VocabCard {
  id: number
  word: string
  translation: string
  language: string
  translation_language: string
  image_url: string | null
  example: string | null
  interval: number
  repetitions: number
  ease_factor: string
  due_at: string
  created_at: string
}

export interface Reminder {
  id: number
  title: string
  note: string | null
  due_at: string | null
  repeat: string
  done: boolean
  created_at: string
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export function useNotes() {
  const { data, mutate, isLoading } = useSWR<Note[]>('/api/notebook/notes', fetcher)

  async function createNote(): Promise<Note> {
    const res = await fetch('/api/notebook/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Untitled', content: '' }),
    })
    const note = await res.json() as Note
    await mutate()
    return note
  }

  async function saveNote(id: number, title: string, content: string) {
    await fetch(`/api/notebook/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    })
    await mutate()
  }

  async function deleteNote(id: number) {
    await fetch(`/api/notebook/notes/${id}`, { method: 'DELETE' })
    await mutate()
  }

  return { notes: data ?? [], isLoading, createNote, saveNote, deleteNote }
}

// ─── Mindmap ──────────────────────────────────────────────────────────────────

export function useMindmapList() {
  const { data, mutate, isLoading } = useSWR<MindmapMeta[]>('/api/notebook/mindmaps', fetcher)

  async function createMindmap(title = 'New Map'): Promise<Mindmap> {
    const res = await fetch('/api/notebook/mindmaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    const m = await res.json() as Mindmap
    await mutate()
    return m
  }

  async function deleteMindmap(id: number) {
    await fetch(`/api/notebook/mindmaps/${id}`, { method: 'DELETE' })
    await mutate()
  }

  return { mindmaps: data ?? [], isLoading, createMindmap, deleteMindmap }
}

export function useMindmap(id: number) {
  const { data, mutate } = useSWR<Mindmap | null>(`/api/notebook/mindmaps/${id}`, fetcher)

  async function saveMindmap(title: string, nodes: MMNode[], edges: MMEdge[] = []) {
    await fetch(`/api/notebook/mindmaps/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, nodes, edges }),
    })
    await mutate()
    await globalMutate('/api/notebook/mindmaps')
  }

  return { mindmap: data, saveMindmap }
}

// ─── Vocabulary ───────────────────────────────────────────────────────────────

export function useVocabulary() {
  const { data, mutate, isLoading } = useSWR<VocabCard[]>('/api/notebook/vocabulary', fetcher)

  async function addWord(payload: { word: string; translation: string; language: string; translation_language?: string; example?: string }) {
    await fetch('/api/notebook/vocabulary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    await mutate()
  }

  async function deleteWord(id: number) {
    await fetch(`/api/notebook/vocabulary/${id}`, { method: 'DELETE' })
    await mutate()
  }

  async function bulkImport(items: { word: string; translation: string; language?: string; example?: string }[]): Promise<number> {
    const res = await fetch('/api/notebook/vocabulary/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    const { inserted } = await res.json() as { inserted: number }
    await mutate()
    return inserted
  }

  async function review(id: number, quality: number) {
    await fetch(`/api/notebook/vocabulary/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quality }),
    })
    await mutate()
  }

  async function updateWord(id: number, payload: { word: string; translation: string; language: string; translation_language?: string; example?: string; image_url?: string }) {
    await fetch(`/api/notebook/vocabulary/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    await mutate()
  }

  async function bulkMove(ids: number[], language: string) {
    await fetch('/api/notebook/vocabulary/bulk-move', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, language }),
    })
    await mutate()
  }

  return { vocab: data ?? [], isLoading, addWord, deleteWord, review, bulkImport, updateWord, bulkMove }
}

// ─── All Reminders (notebook view — includes done) ────────────────────────────

export function useAllReminders() {
  const { data, mutate, isLoading } = useSWR<Reminder[]>('/api/notebook/reminders', fetcher)

  async function add(payload: { title: string; note?: string; due_at?: string; repeat?: string }) {
    await fetch('/api/notifications/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    await mutate()
  }

  async function toggle(id: number) {
    await fetch(`/api/notifications/reminders/${id}/done`, { method: 'PATCH' })
    await mutate()
  }

  async function remove(id: number) {
    await fetch(`/api/notifications/reminders/${id}`, { method: 'DELETE' })
    await mutate()
  }

  return { reminders: data ?? [], isLoading, add, toggle, remove }
}
