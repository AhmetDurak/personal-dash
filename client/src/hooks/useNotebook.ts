import useSWR, { mutate as globalMutate } from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export interface Note {
  id: number | string // string when the Obsidian vault backend is enabled (UUIDs), number otherwise
  title: string
  content: string
  folder: string | null
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
  fromSide?: 'left' | 'right'
  toSide?: 'left' | 'right'
}

export interface MindmapMeta {
  id: number
  title: string
  folder: string | null
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
  folder: string | null
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

// ─── Language ─────────────────────────────────────────────────────────────────

export interface WordLink {
  vocab_id: number
  word:     string  // display text at time of linking
  start:    number  // char offset in source_text / content (inclusive)
  end:      number  // char offset (exclusive)
  // extensible: note?, color?, confidence? — add without breaking existing data
}

export interface LanguageSentence {
  id:            number
  user_id:       number
  source_text:   string
  translation:   string | null
  source_lang:   string
  target_lang:   string
  word_links:    WordLink[]
  interval:      number
  repetitions:   number
  ease_factor:   number
  due_at:        string   // ISO date YYYY-MM-DD
  memory_palace: string | null
  image_url:     string | null
  folder:        string | null
  created_at:    string
  updated_at:    string
}

export interface LanguageScenario {
  id:            number
  user_id:       number
  title:         string
  content:       string
  source_lang:   string
  target_lang:   string
  word_links:    WordLink[]
  interval:      number
  repetitions:   number
  ease_factor:   number
  due_at:        string
  memory_palace: string | null
  folder:        string | null
  created_at:    string
  updated_at:    string
}

// ─── Memory Palace ──────────────────────────────────────────────────────────

export type PalaceContentType = 'vocab' | 'sentence' | 'scenario'
export type PalaceMediaType = 'image' | 'gif' | 'emoji'
export type PalaceSide = 'top' | 'bottom' | 'left' | 'right'

export interface PalaceCheckpoint {
  id: string
  label: string
  x?: number
  y?: number
  content?: { type: PalaceContentType; id: number } | null
  media?: { type: PalaceMediaType; value: string } | null
}

export interface PalaceConnection {
  id: string
  from: string
  to: string
  bidirectional?: boolean
  fromSide?: PalaceSide
  toSide?: PalaceSide
}

export interface MemoryPalaceMeta {
  id: number
  title: string
  folder: string | null
  created_at: string
  updated_at: string
}

export interface MemoryPalace extends MemoryPalaceMeta {
  checkpoints: PalaceCheckpoint[]
  connections: PalaceConnection[]
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export function useNotes() {
  const { data, mutate, isLoading } = useSWR<Note[]>('/api/notebook/notes', fetcher)

  async function createNote(folder?: string | null): Promise<Note> {
    const res = await fetch('/api/notebook/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Untitled', content: '', folder: folder ?? null }),
    })
    const note = await res.json() as Note
    await mutate()
    return note
  }

  async function saveNote(id: number | string, title: string, content: string) {
    await fetch(`/api/notebook/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    })
    await mutate()
  }

  async function moveNoteToFolder(id: number | string, folder: string | null) {
    await fetch(`/api/notebook/notes/${id}/folder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder }),
    })
    await mutate()
  }

  async function deleteNote(id: number | string) {
    await fetch(`/api/notebook/notes/${id}`, { method: 'DELETE' })
    await mutate()
  }

  async function renameFolder(oldPath: string, newPath: string) {
    await fetch('/api/notebook/notes/folder-rename', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath, newPath }),
    })
    await mutate()
  }

  async function deleteFolder(path: string) {
    await fetch(`/api/notebook/notes/folder?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
    await mutate()
  }

  return { notes: data ?? [], isLoading, createNote, saveNote, moveNoteToFolder, deleteNote, renameFolder, deleteFolder }
}

// ─── Mindmap ──────────────────────────────────────────────────────────────────

export function useMindmapList() {
  const { data, mutate, isLoading } = useSWR<MindmapMeta[]>('/api/notebook/mindmaps', fetcher)

  async function createMindmap(title = 'New Map', folder?: string | null): Promise<Mindmap> {
    const res = await fetch('/api/notebook/mindmaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, folder: folder ?? null }),
    })
    const m = await res.json() as Mindmap
    await mutate()
    return m
  }

  async function moveMindmapToFolder(id: number, folder: string | null) {
    await fetch(`/api/notebook/mindmaps/${id}/folder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder }),
    })
    await mutate()
  }

  async function deleteMindmap(id: number) {
    await fetch(`/api/notebook/mindmaps/${id}`, { method: 'DELETE' })
    await mutate()
  }

  return { mindmaps: data ?? [], isLoading, createMindmap, moveMindmapToFolder, deleteMindmap }
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

// ─── Memory Palace list + document ─────────────────────────────────────────────

export function useMemoryPalaceList() {
  const { data, mutate, isLoading } = useSWR<MemoryPalaceMeta[]>('/api/notebook/memory-palaces', fetcher)

  async function createPalace(title = 'New Memory Palace', folder?: string | null): Promise<MemoryPalace> {
    const res = await fetch('/api/notebook/memory-palaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, folder: folder ?? null }),
    })
    const p = await res.json() as MemoryPalace
    await mutate()
    return p
  }

  async function movePalaceToFolder(id: number, folder: string | null) {
    await fetch(`/api/notebook/memory-palaces/${id}/folder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder }),
    })
    await mutate()
  }

  async function renamePalaceFolder(oldPath: string, newPath: string) {
    await fetch('/api/notebook/memory-palaces/folder-rename', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath, newPath }),
    })
    await mutate()
  }

  async function deletePalaceFolder(path: string) {
    await fetch(`/api/notebook/memory-palaces/folder?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
    await mutate()
  }

  async function deletePalace(id: number) {
    await fetch(`/api/notebook/memory-palaces/${id}`, { method: 'DELETE' })
    await mutate()
  }

  return { palaces: data ?? [], isLoading, createPalace, movePalaceToFolder, renamePalaceFolder, deletePalaceFolder, deletePalace }
}

export function useMemoryPalace(id: number) {
  const { data, mutate } = useSWR<MemoryPalace | null>(`/api/notebook/memory-palaces/${id}`, fetcher)

  async function savePalace(title: string, checkpoints: PalaceCheckpoint[], connections: PalaceConnection[] = []) {
    await fetch(`/api/notebook/memory-palaces/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, checkpoints, connections }),
    })
    await mutate()
    await globalMutate('/api/notebook/memory-palaces')
  }

  return { palace: data, savePalace }
}

// ─── Vocabulary ───────────────────────────────────────────────────────────────

export function useVocabulary() {
  const { data, mutate, isLoading } = useSWR<VocabCard[]>('/api/notebook/vocabulary', fetcher)

  async function addWord(payload: { word: string; translation: string; language: string; translation_language?: string; example?: string }): Promise<VocabCard> {
    const res = await fetch('/api/notebook/vocabulary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const card = await res.json() as VocabCard
    await mutate()
    return card
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

  async function moveVocabToFolder(id: number, folder: string | null) {
    await fetch(`/api/notebook/vocabulary/${id}/folder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder }),
    })
    await mutate()
  }

  async function renameVocabFolder(oldPath: string, newPath: string) {
    await fetch('/api/notebook/vocabulary/folder-rename', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath, newPath }),
    })
    await mutate()
  }

  async function deleteVocabFolder(path: string) {
    await fetch(`/api/notebook/vocabulary/folder?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
    await mutate()
  }

  return { vocab: data ?? [], isLoading, addWord, deleteWord, review, bulkImport, updateWord, bulkMove, moveVocabToFolder, renameVocabFolder, deleteVocabFolder }
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

// ─── Language Sentences ───────────────────────────────────────────────────────

export function useLanguageSentences() {
  const { data, mutate, isLoading } = useSWR<LanguageSentence[]>('/api/notebook/language/sentences', fetcher)

  async function createSentence(): Promise<LanguageSentence> {
    const res = await fetch('/api/notebook/language/sentences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const s = await res.json() as LanguageSentence
    await mutate()
    return s
  }

  async function saveSentence(id: number, payload: Partial<LanguageSentence>) {
    const current = (data ?? []).find(s => s.id === id)
    const merged = { ...current, ...payload }
    await fetch(`/api/notebook/language/sentences/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    })
    await mutate()
  }

  async function reviewSentence(id: number, quality: number) {
    await fetch(`/api/notebook/language/sentences/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quality }),
    })
    await mutate()
  }

  async function deleteSentence(id: number) {
    await fetch(`/api/notebook/language/sentences/${id}`, { method: 'DELETE' })
    await mutate()
  }

  async function bulkImportSentences(items: { source_text: string; translation?: string; source_lang?: string; target_lang?: string }[]): Promise<number> {
    const res = await fetch('/api/notebook/language/sentences/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    const { inserted } = await res.json() as { inserted: number }
    await mutate()
    return inserted
  }

  async function moveSentenceToFolder(id: number, folder: string | null) {
    await fetch(`/api/notebook/language/sentences/${id}/folder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder }),
    })
    await mutate()
  }

  async function renameSentenceFolder(oldPath: string, newPath: string) {
    await fetch('/api/notebook/language/sentences/folder-rename', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath, newPath }),
    })
    await mutate()
  }

  async function deleteSentenceFolder(path: string) {
    await fetch(`/api/notebook/language/sentences/folder?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
    await mutate()
  }

  return { sentences: data ?? [], isLoading, createSentence, saveSentence, reviewSentence, deleteSentence, bulkImportSentences, moveSentenceToFolder, renameSentenceFolder, deleteSentenceFolder }
}

// ─── Language Scenarios ───────────────────────────────────────────────────────

export function useLanguageScenarios() {
  const { data, mutate, isLoading } = useSWR<LanguageScenario[]>('/api/notebook/language/scenarios', fetcher)

  async function createScenario(): Promise<LanguageScenario> {
    const res = await fetch('/api/notebook/language/scenarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const s = await res.json() as LanguageScenario
    await mutate()
    return s
  }

  async function saveScenario(id: number, payload: Partial<LanguageScenario>) {
    const current = (data ?? []).find(s => s.id === id)
    const merged = { ...current, ...payload }
    await fetch(`/api/notebook/language/scenarios/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    })
    await mutate()
  }

  async function reviewScenario(id: number, quality: number) {
    await fetch(`/api/notebook/language/scenarios/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quality }),
    })
    await mutate()
  }

  async function deleteScenario(id: number) {
    await fetch(`/api/notebook/language/scenarios/${id}`, { method: 'DELETE' })
    await mutate()
  }

  async function bulkImportScenarios(items: { title: string; content?: string; source_lang?: string; target_lang?: string }[]): Promise<number> {
    const res = await fetch('/api/notebook/language/scenarios/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    const { inserted } = await res.json() as { inserted: number }
    await mutate()
    return inserted
  }

  async function moveScenarioToFolder(id: number, folder: string | null) {
    await fetch(`/api/notebook/language/scenarios/${id}/folder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder }),
    })
    await mutate()
  }

  async function renameScenarioFolder(oldPath: string, newPath: string) {
    await fetch('/api/notebook/language/scenarios/folder-rename', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath, newPath }),
    })
    await mutate()
  }

  async function deleteScenarioFolder(path: string) {
    await fetch(`/api/notebook/language/scenarios/folder?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
    await mutate()
  }

  return { scenarios: data ?? [], isLoading, createScenario, saveScenario, reviewScenario, deleteScenario, bulkImportScenarios, moveScenarioToFolder, renameScenarioFolder, deleteScenarioFolder }
}
