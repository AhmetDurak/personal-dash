import { useState, useRef, useEffect, useLayoutEffect, type ReactNode } from 'react'
import { IconClose, IconFolder, IconEdit, IconAdd, IconLink, IconCut, IconDelete,
  IconLog, IconMeal, IconWorkout, IconNote, IconMindmap, IconLanguage, IconPalace, IconImage, IconExternalLink,
  IconBook, IconMessage, IconLayers, IconMenu, IconChevronRight, IconChevronLeft, IconUpload } from '../lib/icons'
import { buildFolderTree, collectFolderPaths, getItemsInFolder } from '../lib/folderTree'
import { useSortFilter } from '../hooks/useSortFilter'
import { SortFilterBar } from '../components/web/SortFilterBar'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { hljs } from '../lib/highlight'
import { renderMermaid } from '../lib/mermaid'
import { NavLink, Routes, Route, Navigate, useLocation, useSearchParams, useNavigate } from 'react-router-dom'
import { useNotes, useMindmap, useMindmapList, useVocabulary, useAllReminders, useLanguageSentences, useLanguageScenarios,
  useMemoryPalaceList, useMemoryPalace } from '../hooks/useNotebook'
import { LogTab } from './LogTab'
import { MealTab } from './MealTab'
import { SportTab } from './SportTab'
import type { MMNode, MMEdge, VocabCard, LanguageSentence, LanguageScenario, WordLink, Note,
  PalaceCheckpoint, PalaceConnection, PalaceContentType, PalaceSide, MemoryPalaceMeta } from '../hooks/useNotebook'
import { ConfirmDialog } from '../components/web/ConfirmDialog'
import { ChainsView } from '../components/web/ChainsView'
import { ItemFolderTree, isTouch } from '../components/web/ItemFolderTree'
import { useLanguage } from '../hooks/useLanguage'
import { useDarkMode } from '../hooks/useDarkMode'
import { AreaChart, Area, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer } from 'recharts'

// ─── Mindmap helpers ──────────────────────────────────────────────────────────

const DEPTH_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']
const NODE_W = 140
const NODE_H = 36

function nodeColor(id: string): string {
  let h = 5381
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h) ^ id.charCodeAt(i)
  return DEPTH_COLORS[Math.abs(h) % DEPTH_COLORS.length]
}

function getDescendantIds(nodes: MMNode[], id: string): string[] {
  const children = nodes.filter(n => n.parentId === id)
  return [id, ...children.flatMap(c => getDescendantIds(nodes, c.id))]
}


// ─── Reminder helpers ──────────────────────────────────────────────────────────

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function isBeforeDay(a: Date, b: Date): boolean {
  const ad = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const bd = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  return ad < bd
}

function fmtTime(due: string): string {
  const d = new Date(due)
  if (d.getHours() === 0 && d.getMinutes() === 0) return ''
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function fmtDueLabel(due: string, group: 'overdue' | 'today' | 'upcoming'): string {
  const d   = new Date(due)
  const time = fmtTime(due)
  if (group === 'today') return time || 'All day'
  const date = d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
  return time ? `${date} · ${time}` : date
}

// ─── SwipeToDelete ────────────────────────────────────────────────────────────

const DELETE_BTN_W = 72

function SwipeToDelete({ onDelete, children, resetKey, contentBg = '' }: { onDelete: () => void; children: ReactNode; resetKey?: number; contentBg?: string }) {
  const [offset, setOffset] = useState(0)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const didDrag = useRef(false)

  useEffect(() => { setOffset(0) }, [resetKey])

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType !== 'touch') return
    startX.current = e.clientX
    didDrag.current = false
    isDragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDragging.current) return
    const dx = e.clientX - startX.current
    if (Math.abs(dx) > 4) didDrag.current = true
    if (dx >= 0) { setOffset(0); return }
    setOffset(Math.max(dx, -DELETE_BTN_W))
  }

  function onPointerUp() {
    if (!isDragging.current) return
    isDragging.current = false
    setOffset(prev => (prev < -DELETE_BTN_W / 2 ? -DELETE_BTN_W : 0))
  }

  return (
    <div className="relative">
      <div
        className="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-red-500 select-none"
        style={{ width: DELETE_BTN_W }}
        onClick={e => { e.stopPropagation(); setOffset(0); onDelete() }}
      >
        <span className="text-white text-xs font-bold">Delete</span>
      </div>
      <div
        className={contentBg}
        style={{ transform: `translateX(${offset}px)`, transition: isDragging.current ? 'none' : 'transform 0.2s ease', touchAction: 'pan-y' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={e => {
          if (offset < 0) { setOffset(0); e.stopPropagation(); return }
          if (didDrag.current) { e.stopPropagation(); didDrag.current = false }
        }}
      >
        {children}
      </div>
    </div>
  )
}

// ─── NotesView ────────────────────────────────────────────────────────────────

const LAST_NOTE_KEY = 'notes:lastSelected'

marked.use({ gfm: true, breaks: true })

function parseMarkdown(src: string): string {
  return DOMPurify.sanitize(marked.parse(src) as string, { ADD_ATTR: ['target'] })
}

function NotesView() {
  const { t } = useLanguage()
  const { dark } = useDarkMode()
  const { notes, isLoading, createNote, saveNote, moveNoteToFolder, deleteNote, renameFolder, deleteFolder } = useNotes()
  const [noteParams, setNoteParams] = useSearchParams()
  const selectedId = noteParams.get('note')
  function setSelectedId(id: string | null) {
    setNoteParams(p => { id !== null ? p.set('note', id) : p.delete('note'); return p })
    if (id !== null) { try { localStorage.setItem(LAST_NOTE_KEY, id) } catch { /* ignore */ } }
  }
  const [localTitle, setLocalTitle] = useState('')
  const [localContent, setLocalContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)
  const [folderPickerOpen, setFolderPickerOpen] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const previewRef  = useRef<HTMLDivElement>(null)
  const savedScroll = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const isTouch = typeof window !== 'undefined' && 'ontouchstart' in window

  async function uploadAndInsert(files: FileList | null) {
    if (!files?.length || selectedId === null) return
    setUploading(true)
    setUploadError(null)
    const failed: string[] = []
    for (const file of Array.from(files)) {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/notebook/attachments', { method: 'POST', body: form })
      if (!res.ok) { failed.push(file.name); continue }
      const { url, name, mime } = await res.json() as { url: string; name: string; mime: string }
      const snippet = mime.startsWith('image/') ? `![${name}](${url})` : `[${name}](${url})`
      const ta = textareaRef.current
      if (ta) {
        const start = ta.selectionStart ?? localContent.length
        const next = localContent.slice(0, start) + snippet + '\n' + localContent.slice(start)
        setLocalContent(next)
        scheduleSave(localTitle, next)
      } else {
        const next = localContent + '\n' + snippet + '\n'
        setLocalContent(next)
        scheduleSave(localTitle, next)
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
    setUploading(false)
    if (failed.length) setUploadError(`Failed: ${failed.join(', ')}`)
  }

  const [deletingFolderPath, setDeletingFolderPath] = useState<string | null>(null)

  const allFolderPaths = collectFolderPaths(buildFolderTree(notes))
  const folders = allFolderPaths
  const selectedNote = notes.find(n => String(n.id) === selectedId) ?? null

  const { query, setQuery, sortKey, setSortKey, result: filteredNotes, sortOptions } = useSortFilter(notes, {
    search: (n: Note) => n.title || 'Untitled',
    defaultSort: 'updated',
    sorts: [
      { value: 'updated',  label: 'Last edited',   compare: (a: Note, b: Note) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime() },
      { value: 'created',  label: 'Date created',   compare: (a: Note, b: Note) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime() },
      { value: 'az',       label: 'A → Z',          compare: (a: Note, b: Note) => (a.title || '').localeCompare(b.title || '') },
    ],
  })

  // Build tree from sorted notes so sort order takes effect in the sidebar
  const tree = buildFolderTree(query ? notes : filteredNotes)

  useLayoutEffect(() => {
    const el = preview ? previewRef.current : textareaRef.current
    if (el) el.scrollTop = savedScroll.current
  }, [preview])

  useEffect(() => {
    if (!preview || !previewRef.current) return
    const container = previewRef.current

    container.querySelectorAll<HTMLElement>('pre code').forEach(el => {
      const lang = Array.from(el.classList)
        .find(c => c.startsWith('language-'))
        ?.slice(9)
      if (lang === 'mermaid') return // rendered as a diagram below, not syntax-highlighted
      if (lang && hljs.getLanguage(lang)) {
        hljs.highlightElement(el)
      } else {
        el.classList.add('hljs')
      }
      const pre = el.parentElement
      if (pre && pre.tagName === 'PRE' && !pre.querySelector('.hljs-lang-badge')) {
        const badge = document.createElement('span')
        badge.className = 'hljs-lang-badge'
        badge.textContent = lang ?? 'plaintext'
        pre.prepend(badge)
      }
    })

    async function renderInto(wrapper: HTMLElement, source: string) {
      try {
        wrapper.innerHTML = await renderMermaid(source, dark)
        wrapper.dataset.dark = String(dark)
        // Mermaid sets width="100%" on the <svg>, which silently shrinks wide diagrams to fit
        // instead of letting them overflow into the wrapper's scroll area. Pin it to its
        // natural viewBox width instead so small diagrams stay centered and wide ones scroll.
        const svgEl = wrapper.querySelector('svg')
        const vbWidth = svgEl?.viewBox?.baseVal?.width
        if (svgEl && vbWidth) svgEl.style.width = `${vbWidth}px`
      } catch (err) {
        wrapper.innerHTML = `<pre class="text-xs text-red-400 whitespace-pre-wrap break-words">Mermaid error: ${(err as Error).message}</pre>`
      }
    }

    // Re-theme already-rendered diagrams if dark mode changed since they were drawn
    container.querySelectorAll<HTMLElement>('.mermaid-diagram').forEach(wrapper => {
      if (wrapper.dataset.dark !== String(dark)) renderInto(wrapper, wrapper.dataset.source ?? '')
    })

    // Convert freshly-parsed mermaid code fences into diagrams
    container.querySelectorAll<HTMLElement>('pre code.language-mermaid').forEach(code => {
      const pre = code.parentElement
      if (!pre) return
      const source = code.textContent ?? ''
      const wrapper = document.createElement('div')
      wrapper.className = 'mermaid-diagram'
      wrapper.dataset.source = source
      pre.replaceWith(wrapper)
      renderInto(wrapper, source)
    })
  }, [preview, localContent, dark])

  function togglePreview() {
    const el = preview ? previewRef.current : textareaRef.current
    savedScroll.current = el?.scrollTop ?? 0
    setPreview(p => !p)
  }

  // Tracks which note's content is currently reflected in localTitle/localContent. On a hard
  // reload, `notes` is still empty on the first pass (SWR hasn't fetched yet), so this effect
  // must retry once `notes` arrives instead of only running once on `selectedId` change —
  // otherwise the editor is stuck showing a blank title/content for the pre-selected note forever.
  const loadedNoteIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    if (selectedId === null) { loadedNoteIdRef.current = null; return }
    if (loadedNoteIdRef.current === selectedId) return // already loaded — don't clobber in-progress edits
    const note = notes.find(n => String(n.id) === selectedId)
    if (note) {
      setLocalTitle(note.title)
      setLocalContent(note.content)
      loadedNoteIdRef.current = selectedId
    }
  }, [selectedId, notes])

  // Reopen the last-viewed note when landing on Notes with nothing selected in the URL
  // (e.g. switching tabs and back, or opening the app fresh) — runs once per mount only,
  // so it never fights an explicit "back to list" (mobile back button, deleted note, etc.).
  const restoredLastNoteRef = useRef(false)
  useEffect(() => {
    if (restoredLastNoteRef.current || isLoading) return
    restoredLastNoteRef.current = true
    if (selectedId !== null) return
    try {
      const stored = localStorage.getItem(LAST_NOTE_KEY)
      if (stored && notes.some(n => String(n.id) === stored)) {
        setNoteParams(p => { p.set('note', stored); return p }, { replace: true })
      }
    } catch { /* ignore */ }
  }, [isLoading, notes]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [])

  function scheduleSave(title: string, content: string) {
    const id = selectedId
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!id) return
      setSaving(true)
      await saveNote(id, title, content)
      setSaving(false)
    }, 1000)
  }

  async function handleNew(folder: string | null = null) {
    const note = await createNote(folder)
    setSelectedId(String(note.id))
  }

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    await deleteNote(id)
    if (selectedId === id) setSelectedId(null)
  }

  return (
    <div className="flex h-full">
      {/* File tree sidebar */}
      <div className={`${selectedId !== null ? 'hidden md:flex' : 'flex'} w-full md:w-64 border-r border-gray-100 dark:border-slate-700 flex-col bg-gray-50 dark:bg-slate-900 flex-shrink-0`}>
        <SortFilterBar
          query={query} onQuery={setQuery}
          sortKey={sortKey} onSort={setSortKey}
          sorts={sortOptions}
          placeholder="Search notes…"
          className="border-b border-gray-100 dark:border-slate-700 flex-shrink-0"
        />
        {isLoading ? (
          <p className="text-xs text-gray-400 p-4">Loading…</p>
        ) : query ? (
          <div className="flex-1 overflow-y-auto py-1 px-1">
            {filteredNotes.length === 0
              ? <p className="text-xs text-gray-400 px-3 py-2">No notes found</p>
              : filteredNotes.map(n => (
                <div
                  key={n.id}
                  onClick={() => setSelectedId(String(n.id))}
                  className={`flex items-center gap-1.5 py-2 pr-1 pl-2 rounded-lg cursor-pointer ${String(n.id) === selectedId ? 'bg-xero-green/10 dark:bg-xero-green/20' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                >
                  <IconNote className="w-3.5 h-3.5 flex-shrink-0 text-gray-400 dark:text-slate-500" strokeWidth={1.75} />
                  <span className={`text-xs flex-1 truncate ${String(n.id) === selectedId ? 'text-xero-green font-medium' : 'text-gray-600 dark:text-slate-400'}`}>{n.title || 'Untitled'}</span>
                </div>
              ))}
          </div>
        ) : (
          <ItemFolderTree<Note>
            tree={tree}
            selectedId={selectedId}
            itemLabel={n => n.title || 'Untitled'}
            itemIcon={<IconNote className="w-3.5 h-3.5 flex-shrink-0 text-gray-400 dark:text-slate-500" strokeWidth={1.75} />}
            newItemLabel={`+ ${t.newNote}`}
            onSelectItem={n => setSelectedId(String(n.id))}
            onNewItem={handleNew}
            onDeleteItem={n => setConfirmDeleteId(String(n.id))}
            onRenameFolder={renameFolder}
            onDeleteFolder={path => setDeletingFolderPath(path)}
            onMoveItemToFolder={(id, folder) => moveNoteToFolder(id, folder)}
          />
        )}
      </div>

      {/* Editor — hidden on mobile when no note is open */}
      <div className={`${selectedId === null ? 'hidden md:flex' : 'flex'} flex-1 flex-col overflow-hidden`}>
        {selectedId === null ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="text-5xl mb-3">📓</p>
              <p className="text-sm">Select a note or create a new one</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-100 flex-shrink-0 bg-white gap-2">
              <button
                onClick={() => setSelectedId(null)}
                className="md:hidden flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-3 -ml-3 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Back to notes"
              >
                ←
              </button>
              <input
                value={localTitle}
                onChange={e => { setLocalTitle(e.target.value); scheduleSave(e.target.value, localContent) }}
                placeholder="Note title…"
                className="text-lg font-semibold text-gray-900 bg-transparent flex-1 outline-none placeholder-gray-300 min-w-0"
              />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx"
                className="hidden"
                onChange={e => uploadAndInsert(e.target.files)}
              />
              <div className="flex items-center gap-2 flex-shrink-0">
                {uploadError && <span className="text-xs text-red-400 truncate max-w-[120px]">{uploadError}</span>}
                {(saving || uploading) && !uploadError && <span className="text-xs text-gray-400">{uploading ? 'Uploading…' : t.saving}</span>}
                {/* Folder badge */}
                <div className="relative">
                  <button
                    onClick={() => setFolderPickerOpen(p => !p)}
                    className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors flex items-center gap-1"
                  >
                    <IconFolder className="w-3 h-3" strokeWidth={2} /> {selectedNote?.folder ?? 'No folder'}
                  </button>
                  {folderPickerOpen && (
                    <div className="absolute right-0 top-full mt-1 z-40 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[140px]">
                      <button
                        onClick={() => { if (selectedId) moveNoteToFolder(selectedId, null); setFolderPickerOpen(false) }}
                        className="w-full text-left text-xs px-3 py-1.5 hover:bg-gray-50 text-gray-500"
                      >No folder</button>
                      {folders.map(f => (
                        <button
                          key={f}
                          onClick={() => { if (selectedId) moveNoteToFolder(selectedId, f); setFolderPickerOpen(false) }}
                          className="w-full text-left text-xs px-3 py-1.5 hover:bg-gray-50 text-gray-700"
                        >{f}</button>
                      ))}
                      <div className="border-t border-gray-100 mt-1 pt-1 px-2">
                        <input
                          placeholder="New folder…"
                          className="w-full text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-xero-green"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const name = (e.target as HTMLInputElement).value.trim()
                              if (name && selectedId) { moveNoteToFolder(selectedId, name); setFolderPickerOpen(false) }
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  title="Attach file"
                  className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors p-2.5 rounded-lg disabled:opacity-40 min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <IconUpload className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
                <button
                  onClick={togglePreview}
                  className={`text-xs px-2.5 py-2 min-h-[44px] rounded-lg font-medium transition-colors ${preview ? 'bg-gray-900 text-white dark:bg-slate-200 dark:text-slate-900' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                >
                  {preview ? t.editMode : t.preview}
                </button>
                <button
                  onClick={() => setConfirmDeleteId(selectedId)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-2 min-h-[44px] flex items-center"
                >
                  {t.delete}
                </button>
                {confirmDeleteId !== null && (
                  <ConfirmDialog
                    message="This note will be permanently deleted."
                    confirmLabel={t.delete}
                    onConfirm={() => { handleDelete(confirmDeleteId); setConfirmDeleteId(null) }}
                    onCancel={() => setConfirmDeleteId(null)}
                  />
                )}
              </div>
            </div>
            {preview ? (
              <div
                ref={previewRef}
                className="flex-1 p-6 text-sm text-gray-700 bg-white overflow-y-auto note-prose"
                dangerouslySetInnerHTML={{ __html: localContent
                  ? parseMarkdown(localContent)
                  : '<span class="text-gray-300">Write your note here…</span>'
                }}
              />
            ) : (
              <textarea
                ref={textareaRef}
                value={localContent}
                onChange={e => { setLocalContent(e.target.value); scheduleSave(localTitle, e.target.value) }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); uploadAndInsert(e.dataTransfer.files) }}
                placeholder={isTouch ? 'Write your note here…' : 'Write your note here… (drag & drop files)'}
                className="flex-1 p-6 text-sm text-gray-700 bg-white resize-none outline-none placeholder-gray-300 overflow-y-auto"
              />
            )}
          </>
        )}
      </div>

      {/* Delete folder confirm */}
      {deletingFolderPath !== null && (
        <ConfirmDialog
          message={`Delete "${deletingFolderPath.split('/').pop()}" and all notes inside?`}
          confirmLabel="Delete"
          onConfirm={async () => { await deleteFolder(deletingFolderPath); setDeletingFolderPath(null); if (selectedId !== null && notes.find(n => String(n.id) === selectedId)?.folder?.startsWith(deletingFolderPath)) setSelectedId(null) }}
          onCancel={() => setDeletingFolderPath(null)}
        />
      )}
    </div>
  )
}

// ─── MindmapView ──────────────────────────────────────────────────────────────

interface DragState {
  id: string
  offsetX: number
  offsetY: number
  startSvgX: number
  startSvgY: number
  prevX: number
  prevY: number
  moved: boolean
  pointerType: string
}

interface CtxMenu { nodeId: string; screenX: number; screenY: number }

function computeLayout(raw: MMNode[]): MMNode[] {
  const root = raw.find(n => n.parentId === null)
  if (!root) return raw.map(n => ({ ...n, x: n.x ?? 0, y: n.y ?? 0 }))
  const childrenOf = new Map<string, MMNode[]>()
  raw.forEach(n => { if (n.parentId) { const l = childrenOf.get(n.parentId) ?? []; l.push(n); childrenOf.set(n.parentId, l) } })
  function leafCount(id: string): number { const ch = childrenOf.get(id) ?? []; return ch.length === 0 ? 1 : ch.reduce((s, c) => s + leafCount(c.id), 0) }
  const SLOT = 100  // vertical slot per leaf — larger avoids crowding
  const COL_W = 240 // horizontal spacing between depth levels
  const posMap = new Map<string, { x: number; y: number }>()
  const totalLeaves = leafCount(root.id)
  const startY = -(totalLeaves * SLOT) / 2
  function place(id: string, depth: number, yFrom: number, yTo: number) {
    const ch = childrenOf.get(id) ?? []
    const total = leafCount(id)
    // Place parent at boundary between top-half and bottom-half children.
    // For odd N, this avoids the middle child landing at exactly the same y as the parent.
    const topHalfLeaves = ch.slice(0, Math.floor(ch.length / 2)).reduce((s, c) => s + leafCount(c.id), 0)
    const parentY = ch.length === 0 ? (yFrom + yTo) / 2 : yFrom + (topHalfLeaves / total) * (yTo - yFrom)
    posMap.set(id, { x: 80 + depth * COL_W, y: parentY - NODE_H / 2 })
    let cursor = yFrom
    ch.forEach(c => { const sl = (leafCount(c.id) / total) * (yTo - yFrom); place(c.id, depth + 1, cursor, cursor + sl); cursor += sl })
  }
  place(root.id, 0, startY, startY + totalLeaves * SLOT)
  return raw.map(n => ({ ...n, x: posMap.get(n.id)?.x ?? 0, y: posMap.get(n.id)?.y ?? 0 }))
}

function initPositions(raw: MMNode[]): MMNode[] {
  if (raw.every(n => n.x !== undefined)) return raw
  const laid = computeLayout(raw)
  const laidMap = new Map(laid.map(n => [n.id, n]))
  return raw.map(n => ({ ...n, x: n.x ?? (laidMap.get(n.id)?.x ?? 0), y: n.y ?? (laidMap.get(n.id)?.y ?? 0) }))
}

function MindmapCanvas({ mapId }: { mapId: number }) {
  const { t } = useLanguage()
  const { dark } = useDarkMode()
  const { mindmap, saveMindmap } = useMindmap(mapId)
  const [nodes, setNodes] = useState<MMNode[]>([])
  const [mmTitle, setMmTitle] = useState('My Mindmap')
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null)
  const [renaming, setRenaming] = useState<{ id: string; label: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [edges, setEdges] = useState<MMEdge[]>([])
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedForConnect, setSelectedForConnect] = useState<string | null>(null)
  const [connectLine, setConnectLine] = useState<{ sourceId: string; x: number; y: number; targetId: string | null; fromLeft?: boolean } | null>(null)
  const [flippedNodes, setFlippedNodes] = useState<Set<string>>(new Set())
  const [editingBack, setEditingBack] = useState(false)
  const longPressTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressOpened  = useRef(false)  // flag: context menu opened by long-press, suppress pointerUp dismissal
  const [pan, setPan] = useState<{ x: number; y: number }>(() => {
    try {
      const raw = localStorage.getItem(`mindmap:pan:${mapId}`)
      if (raw) { const p = JSON.parse(raw); if (typeof p?.x === 'number') return p }
    } catch { /* ignore */ }
    return { x: 300, y: 300 }
  })
  const [scale, setScale] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const [importMmMsg, setImportMmMsg] = useState<string | null>(null)
  const [csvMmTooltipOpen, setCsvMmTooltipOpen] = useState(false)
  const csvMmInputRef = useRef<HTMLInputElement>(null)
  const csvMmTooltipRef = useRef<HTMLDivElement>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const selectedIdsRef = useRef<Set<string>>(new Set())
  const [selBox, setSelBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const selBoxRef = useRef<{ startX: number; startY: number } | null>(null)
  const initialized = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const connectRef = useRef<{ sourceId: string; x: number; y: number; targetId: string | null; fromLeft?: boolean } | null>(null)
  const panRef = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null)
  const panStateRef = useRef({ x: pan.x, y: pan.y })
  const scaleRef = useRef(1)
  const nodesRef = useRef<MMNode[]>([])
  const edgesRef = useRef<MMEdge[]>([])
  const titleRef = useRef(mmTitle)

  function findNodeAt(svgX: number, svgY: number, excludeId?: string): MMNode | null {
    return nodesRef.current.find(n =>
      n.id !== excludeId &&
      svgX >= (n.x ?? 0) && svgX <= (n.x ?? 0) + NODE_W &&
      svgY >= (n.y ?? 0) && svgY <= (n.y ?? 0) + NODE_H
    ) ?? null
  }

useEffect(() => { nodesRef.current = nodes }, [nodes])
  useEffect(() => { edgesRef.current = edges }, [edges])
  useEffect(() => { titleRef.current = mmTitle }, [mmTitle])
  useEffect(() => { scaleRef.current = scale }, [scale])
  useEffect(() => { selectedIdsRef.current = selectedIds }, [selectedIds])

  // Wheel zoom (desktop + trackpad) and two-finger pinch zoom (mobile)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function handleWheel(e: WheelEvent) {
      e.preventDefault()
      // ctrlKey = trackpad pinch (faster); otherwise mouse wheel (slower)
      const delta = e.ctrlKey ? -e.deltaY * 0.005 : -e.deltaY * 0.0015
      const factor = Math.exp(delta)
      const s = scaleRef.current
      const newScale = Math.max(0.15, Math.min(5, s * factor))
      const rect = svgRef.current!.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const newPan = {
        x: panStateRef.current.x + (cx - panStateRef.current.x) * (1 - newScale / s),
        y: panStateRef.current.y + (cy - panStateRef.current.y) * (1 - newScale / s),
      }
      scaleRef.current = newScale
      setScale(newScale)
      panStateRef.current = newPan
      setPan(newPan)
    }

    let pinchInitDist = 0
    let pinchInitScale = 1
    let pinchInitPan = { x: 0, y: 0 }
    let pinchMidX = 0
    let pinchMidY = 0

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        const [a, b] = [e.touches[0], e.touches[1]]
        pinchInitDist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY)
        pinchInitScale = scaleRef.current
        pinchInitPan = { ...panStateRef.current }
        const rect = svgRef.current!.getBoundingClientRect()
        pinchMidX = (a.clientX + b.clientX) / 2 - rect.left
        pinchMidY = (a.clientY + b.clientY) / 2 - rect.top
        panRef.current = null   // cancel single-finger pan
        dragRef.current = null  // cancel any active node drag
      }
    }

    function handleTouchMove(e: TouchEvent) {
      if (e.touches.length === 2) {
        e.preventDefault()
        const [a, b] = [e.touches[0], e.touches[1]]
        const newDist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY)
        const newScale = Math.max(0.15, Math.min(5, pinchInitScale * (newDist / pinchInitDist)))
        const ratio = newScale / pinchInitScale
        const newPan = {
          x: pinchInitPan.x + pinchMidX * (1 - ratio),
          y: pinchInitPan.y + pinchMidY * (1 - ratio),
        }
        scaleRef.current = newScale
        setScale(newScale)
        panStateRef.current = newPan
        setPan(newPan)
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    return () => {
      el.removeEventListener('wheel', handleWheel)
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
    }
  }, [])

  useEffect(() => {
    if (initialized.current || mindmap === undefined) return
    const raw = mindmap ? mindmap.nodes : [{ id: 'root', label: 'Finance Concepts', parentId: null }]
    const placed = initPositions(raw)
    setNodes(placed)
    if (mindmap) {
      setMmTitle(mindmap.title)
      setEdges(mindmap.edges ?? [])
    }
    initialized.current = true

    // Auto-center if no cached pan for this map
    const hasCached = !!localStorage.getItem(`mindmap:pan:${mapId}`)
    if (!hasCached && placed.length > 0) {
      const xs = placed.map(n => n.x ?? 0)
      const ys = placed.map(n => n.y ?? 0)
      const minX = Math.min(...xs), maxX = Math.max(...xs) + NODE_W
      const minY = Math.min(...ys), maxY = Math.max(...ys) + NODE_H
      const cx = (minX + maxX) / 2
      const cy = (minY + maxY) / 2
      const rect = containerRef.current?.getBoundingClientRect()
      const vw = rect?.width  ?? 800
      const vh = rect?.height ?? 600
      const centered = { x: vw / 2 - cx, y: vh / 2 - cy }
      setPan(centered)
      panStateRef.current = centered
    }
  }, [mindmap, mapId])

  function persist(newNodes: MMNode[], newEdges = edgesRef.current) {
    setNodes(newNodes)
    nodesRef.current = newNodes
    setEdges(newEdges)
    edgesRef.current = newEdges
    saveMindmap(titleRef.current, newNodes, newEdges)
  }

  function clientToSvg(clientX: number, clientY: number) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return { x: clientX, y: clientY }
    const p = panStateRef.current
    const s = scaleRef.current
    return { x: (clientX - rect.left - p.x) / s, y: (clientY - rect.top - p.y) / s }
  }

  function handleNodePointerDown(e: React.PointerEvent, id: string) {
    e.stopPropagation()
    if (e.button === 2) return
    // Ctrl/Meta+click: toggle this node in the multi-selection (no drag)
    if (e.ctrlKey || e.metaKey) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id); else next.add(id)
        selectedIdsRef.current = next
        return next
      })
      return
    }
    const node = nodesRef.current.find(n => n.id === id)
    if (!node) return
    const { x, y } = clientToSvg(e.clientX, e.clientY)
    dragRef.current = { id, offsetX: x - (node.x ?? 0), offsetY: y - (node.y ?? 0), startSvgX: x, startSvgY: y, prevX: x, prevY: y, moved: false, pointerType: e.pointerType }
    setCtxMenu(null)
    // Long-press → context menu (touch substitute for right-click)
    if (e.pointerType === 'touch') {
      if (longPressTimer.current) clearTimeout(longPressTimer.current)
      longPressOpened.current = false
      longPressTimer.current = setTimeout(() => {
        if (dragRef.current && !dragRef.current.moved) {
          dragRef.current = null
          longPressOpened.current = true   // tell pointerUp to NOT dismiss the menu
          setCtxMenu({ nodeId: id, screenX: e.clientX, screenY: e.clientY })
        }
      }, 500)
    }
  }

  function handleSvgPointerMove(e: React.PointerEvent) {
    if (longPressTimer.current) {
      const d = dragRef.current
      if (d) {
        const { x, y } = clientToSvg(e.clientX, e.clientY)
        if (Math.hypot(x - d.startSvgX, y - d.startSvgY) > 8) {
          clearTimeout(longPressTimer.current); longPressTimer.current = null
        }
      } else {
        clearTimeout(longPressTimer.current); longPressTimer.current = null
      }
    }
    // Selection box (desktop mouse drag on background)
    const sb = selBoxRef.current
    if (sb) {
      const { x, y } = clientToSvg(e.clientX, e.clientY)
      setSelBox({ x: Math.min(x, sb.startX), y: Math.min(y, sb.startY), w: Math.abs(x - sb.startX), h: Math.abs(y - sb.startY) })
      return
    }
    const p = panRef.current
    if (p) {
      const nx = p.tx + (e.clientX - p.startX)
      const ny = p.ty + (e.clientY - p.startY)
      panStateRef.current = { x: nx, y: ny }
      setPan({ x: nx, y: ny })
      setIsPanning(true)
      return
    }
    const { x, y } = clientToSvg(e.clientX, e.clientY)
    const d = dragRef.current
    if (d) {
      if (!d.moved && Math.hypot(x - d.startSvgX, y - d.startSvgY) > 4) dragRef.current = { ...d, moved: true }
      const dx = x - d.prevX
      const dy = y - d.prevY
      dragRef.current = { ...dragRef.current!, prevX: x, prevY: y }
      const sel = selectedIdsRef.current
      const isMultiDrag = sel.size > 1 && sel.has(d.id)
      const moved = nodesRef.current.map(n =>
        (n.id === d.id || (isMultiDrag && sel.has(n.id)))
          ? { ...n, x: (n.x ?? 0) + dx, y: (n.y ?? 0) + dy }
          : n
      )
      nodesRef.current = moved
      setNodes(moved)
      return
    }
    const c = connectRef.current
    if (c) {
      const target = findNodeAt(x, y, c.sourceId)
      const updated = { ...c, x, y, targetId: target?.id ?? null }
      connectRef.current = updated
      setConnectLine(updated)
    }
  }

  function handleSvgPointerUp(e: React.PointerEvent) {
    if (e.button === 2) { dragRef.current = null; return }
    // Finalize rubber-band selection (desktop)
    if (selBoxRef.current) {
      const box = selBox
      selBoxRef.current = null
      setSelBox(null)
      if (box && (box.w > 6 || box.h > 6)) {
        const hit = new Set(nodesRef.current.filter(n =>
          (n.x ?? 0) + NODE_W > box.x && (n.x ?? 0) < box.x + box.w &&
          (n.y ?? 0) + NODE_H > box.y && (n.y ?? 0) < box.y + box.h
        ).map(n => n.id))
        setSelectedIds(hit)
        selectedIdsRef.current = hit
      } else {
        // plain click on background = clear selection
        setSelectedIds(new Set())
        selectedIdsRef.current = new Set()
      }
      return
    }
    if (panRef.current) {
      panRef.current = null
      setIsPanning(false)
      localStorage.setItem(`mindmap:pan:${mapId}`, JSON.stringify(panStateRef.current))
      return
    }
    const d = dragRef.current
    if (d) {
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
      dragRef.current = null
      if (!d.moved) {
        const isMouseClick = d.pointerType === 'mouse'  // desktop: always flip on click
        const isSelected = selectedForConnect === d.id   // mobile: already tapped once
        if (isMouseClick || isSelected) {
          // Second interaction → flip face and deselect
          setFlippedNodes(prev => {
            const next = new Set(prev)
            if (next.has(d.id)) next.delete(d.id)
            else next.add(d.id)
            return next
          })
          setSelectedForConnect(null)
        } else {
          // First tap on mobile (no hover) → select to reveal pins
          setSelectedForConnect(d.id)
        }
        setCtxMenu(null)
      } else {
        setSelectedForConnect(null)
        saveMindmap(titleRef.current, nodesRef.current, edgesRef.current)
      }
      return
    }
    const c = connectRef.current
    if (c) {
      connectRef.current = null
      setConnectLine(null)
      setHoveredId(null)
      setSelectedForConnect(null)
      if (c.targetId && c.targetId !== c.sourceId) {
        const already = edgesRef.current.some(e =>
          (e.from === c.sourceId && e.to === c.targetId) ||
          (e.from === c.targetId && e.to === c.sourceId)
        )
        if (!already) {
          const fromSide: 'left' | 'right' = c.fromLeft ? 'left' : 'right'
          const tgt = nodesRef.current.find(n => n.id === c.targetId)
          const toSide: 'left' | 'right' = tgt && c.x <= (tgt.x ?? 0) + NODE_W / 2 ? 'left' : 'right'
          const newEdge: MMEdge = { id: `e${Date.now()}`, from: c.sourceId, to: c.targetId, bidirectional: true, fromSide, toSide }
          persist(nodesRef.current, [...edgesRef.current, newEdge])
        }
      }
      return
    }
    // Long-press just opened the context menu — don't dismiss it on finger lift
    if (longPressOpened.current) { longPressOpened.current = false; return }
    // Tapped SVG background with nothing active → deselect
    setSelectedForConnect(null)
    setCtxMenu(null)
  }

  function handlePinPointerDown(e: React.PointerEvent, sourceId: string, fromLeft = false) {
    e.stopPropagation()
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
    dragRef.current = null
    const { x, y } = clientToSvg(e.clientX, e.clientY)
    connectRef.current = { sourceId, x, y, targetId: null, fromLeft }
    setConnectLine(connectRef.current)
    setCtxMenu(null)
  }

  function handleAddChild() {
    if (!ctxMenu) return
    const parent = nodesRef.current.find(n => n.id === ctxMenu.nodeId)
    const newId = `n${Date.now()}`
    const newNode: MMNode = {
      id: newId, label: 'New Topic', parentId: ctxMenu.nodeId,
      x: (parent?.x ?? 200) + 240,
      y: (parent?.y ?? 200) + (Math.random() - 0.5) * 120,
    }
    const updated = [...nodesRef.current, newNode]
    persist(updated)
    setCtxMenu(null)
    setRenaming({ id: newId, label: 'New Topic' })
  }

  function handleRenameConfirm() {
    if (!renaming) return
    if (editingBack) {
      persist(nodesRef.current.map(n => n.id === renaming.id ? { ...n, back: renaming.label } : n))
    } else {
      persist(nodesRef.current.map(n => n.id === renaming.id ? { ...n, label: renaming.label } : n))
    }
    setRenaming(null)
    setEditingBack(false)
  }

  function handleDelete(id: string) {
    const toRemove = new Set(getDescendantIds(nodesRef.current, id))
    const newNodes = nodesRef.current.filter(n => !toRemove.has(n.id))
    const newEdges = edgesRef.current.filter(e => !toRemove.has(e.from) && !toRemove.has(e.to))
    persist(newNodes, newEdges)
    setConfirmDelete(null)
    setCtxMenu(null)
  }

  const ctxNode = ctxMenu ? nodes.find(n => n.id === ctxMenu.nodeId) ?? null : null

  useEffect(() => {
    if (!csvMmTooltipOpen) return
    function handleClick(e: MouseEvent) {
      if (!csvMmTooltipRef.current?.contains(e.target as Node)) setCsvMmTooltipOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [csvMmTooltipOpen])

  function handleMmCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    file.text().then(text => {
      const lines = text.trim().split('\n').filter(Boolean)
      const isHeader = /label|parent/i.test(lines[0] ?? '')
      const rows = isHeader ? lines.slice(1) : lines
      const parsed = rows.map(row => {
        const cols = parseCSVLine(row)
        return { label: cols[0] ?? '', parentLabel: cols[1] ?? '', back: cols[2] || undefined }
      }).filter(r => r.label)
      if (!parsed.length) { setImportMmMsg('No valid rows found.'); return }

      // Build nodes with stable IDs, resolve parent labels → IDs
      const idMap = new Map<string, string>()
      parsed.forEach(r => idMap.set(r.label, crypto.randomUUID()))
      const newNodes: MMNode[] = parsed.map(r => ({
        id: idMap.get(r.label)!,
        label: r.label,
        back: r.back,
        parentId: r.parentLabel ? (idMap.get(r.parentLabel) ?? null) : null,
      }))
      const placed = computeLayout(newNodes)
      persist(placed, [])
      setImportMmMsg(`Imported ${placed.length} node${placed.length !== 1 ? 's' : ''}.`)
      setTimeout(() => setImportMmMsg(null), 4000)
    })
    e.target.value = ''
  }

  return (
    <div className="flex-1 min-w-0 h-full relative overflow-hidden">
      {/* Canvas */}
      <div
        ref={containerRef}
        className={`h-full overflow-hidden ${dark ? 'bg-[#0F172A]' : 'bg-[#F8FAFC]'}`}
        style={{ cursor: isPanning ? 'grabbing' : 'default', touchAction: 'none' }}
        onPointerMove={handleSvgPointerMove}
        onPointerUp={handleSvgPointerUp}
        onPointerLeave={() => {
          // Only cancel pan on leave — do NOT clear selectedForConnect.
          // On mobile, pointerleave fires immediately after pointerup, which
          // would wipe out the just-set selectedForConnect if we ran the full handler.
          if (panRef.current) { panRef.current = null; setIsPanning(false) }
          if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
        }}
        onClick={() => setCtxMenu(null)}
        onContextMenu={e => e.preventDefault()}
      >
        <svg
          ref={svgRef}
          width="100%" height="100%"
          className="block select-none"
          style={{ touchAction: 'none' }}
          onContextMenu={e => e.preventDefault()}
        >
          {/* Dot grid + arrow markers */}
          <defs>
            <pattern id="dots" x={pan.x % (28 * scale)} y={pan.y % (28 * scale)} width={28 * scale} height={28 * scale} patternUnits="userSpaceOnUse">
              <circle cx={14 * scale} cy={14 * scale} r={Math.max(0.5, scale)} fill={dark ? '#334155' : '#CBD5E1'} />
            </pattern>
            <marker id="arrowEnd" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <polygon points="0 0, 7 3.5, 0 7" fill="#94A3B8" />
            </marker>
            <marker id="arrowStart" markerWidth="7" markerHeight="7" refX="1" refY="3.5" orient="auto-start-reverse">
              <polygon points="0 0, 7 3.5, 0 7" fill="#94A3B8" />
            </marker>
          </defs>
          {/* Background — full viewport, infinite feel */}
          <rect
            x="-10000" y="-10000" width="20000" height="20000" fill="url(#dots)"
            style={{ cursor: selBoxRef.current ? 'crosshair' : 'grab' }}
            onPointerDown={e => {
              if (dragRef.current || connectRef.current) return
              if (e.ctrlKey || e.metaKey) {
                // Ctrl+drag = rubber-band selection
                const { x, y } = clientToSvg(e.clientX, e.clientY)
                selBoxRef.current = { startX: x, startY: y }
                setSelBox({ x, y, w: 0, h: 0 })
                setCtxMenu(null)
              } else {
                // Plain drag (mouse or touch) = pan
                panRef.current = { startX: e.clientX, startY: e.clientY, tx: panStateRef.current.x, ty: panStateRef.current.y }
              }
            }}
          />
          {/* World transform — all content pans + zooms together */}
          <g transform={`translate(${pan.x},${pan.y}) scale(${scale})`}>

          {/* Parent-child connections — click to disconnect */}
          {nodes.map(n => {
            if (!n.parentId) return null
            const p = nodes.find(p => p.id === n.parentId)
            if (!p) return null
            const pRight = (p.x ?? 0) <= (n.x ?? 0)
            const x1 = pRight ? (p.x ?? 0) + NODE_W : (p.x ?? 0)
            const y1 = (p.y ?? 0) + NODE_H / 2
            const x2 = pRight ? (n.x ?? 0) : (n.x ?? 0) + NODE_W
            const y2 = (n.y ?? 0) + NODE_H / 2
            const t = Math.max(60, Math.abs(x2 - x1) * 0.45)
            const color = nodeColor(n.id)
            const d = `M ${x1} ${y1} C ${x1 + (pRight ? t : -t)} ${y1} ${x2 + (pRight ? -t : t)} ${y2} ${x2} ${y2}`
            return (
              <g key={`e-${n.id}`}>
                <path d={d} fill="none" stroke="transparent" strokeWidth={12}
                  style={{ cursor: 'pointer' }}
                  onClick={ev => { ev.stopPropagation(); persist(nodesRef.current.map(nd => nd.id === n.id ? { ...nd, parentId: null } : nd)) }}
                />
                <path d={d} fill="none" stroke={color} strokeWidth={2} strokeOpacity={0.35} strokeLinecap="round" style={{ pointerEvents: 'none' }} />
              </g>
            )
          })}

          {/* Extra edges (multi-connections via pin drag) — click to remove, right-click to toggle bidirectional */}
          {edges.map(e => {
            const from = nodes.find(n => n.id === e.from)
            const to   = nodes.find(n => n.id === e.to)
            if (!from || !to) return null
            const posRight = (from.x ?? 0) <= (to.x ?? 0)
            const fromSide = e.fromSide ?? (posRight ? 'right' : 'left')
            const toSide   = e.toSide   ?? (posRight ? 'left'  : 'right')
            const x1 = fromSide === 'right' ? (from.x ?? 0) + NODE_W : (from.x ?? 0)
            const y1 = (from.y ?? 0) + NODE_H / 2
            const x2 = toSide === 'right' ? (to.x ?? 0) + NODE_W : (to.x ?? 0)
            const y2 = (to.y ?? 0) + NODE_H / 2
            const t  = Math.max(60, Math.abs(x2 - x1) * 0.45)
            const fSign = fromSide === 'right' ? 1 : -1
            const tSign = toSide   === 'right' ? 1 : -1
            const color = nodeColor(e.from)
            const dPath = `M ${x1} ${y1} C ${x1 + fSign * t} ${y1} ${x2 + tSign * t} ${y2} ${x2} ${y2}`
            return (
              <g key={e.id}>
                <path d={dPath} fill="none" stroke="transparent" strokeWidth={12}
                  style={{ cursor: 'pointer' }}
                  onClick={ev => { ev.stopPropagation(); persist(nodesRef.current, edgesRef.current.filter(ex => ex.id !== e.id)) }}
                  onContextMenu={ev => { ev.preventDefault(); ev.stopPropagation(); persist(nodesRef.current, edgesRef.current.map(ex => ex.id === e.id ? { ...ex, bidirectional: !ex.bidirectional } : ex)) }}
                />
                <path
                  d={dPath} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="5 3" strokeOpacity={0.6} strokeLinecap="round"
                  markerEnd="url(#arrowEnd)"
                  markerStart={e.bidirectional ? 'url(#arrowStart)' : undefined}
                  style={{ pointerEvents: 'none' }}
                />
              </g>
            )
          })}

          {/* Temp connection wire while dragging a pin */}
          {connectLine && (() => {
            const src = nodes.find(n => n.id === connectLine.sourceId)
            if (!src) return null
            const x1 = connectLine.fromLeft ? (src.x ?? 0) : (src.x ?? 0) + NODE_W
            const y1 = (src.y ?? 0) + NODE_H / 2
            const sign = connectLine.fromLeft ? -1 : 1
            const t = Math.max(60, Math.abs(connectLine.x - x1) * 0.45)
            const color = nodeColor(connectLine.sourceId)
            return (
              <path
                d={`M ${x1} ${y1} C ${x1 + sign * t} ${y1} ${connectLine.x - sign * t} ${connectLine.y} ${connectLine.x} ${connectLine.y}`}
                fill="none" stroke={color} strokeWidth={2} strokeDasharray="6 4" strokeOpacity={0.8}
                style={{ pointerEvents: 'none' }}
              />
            )
          })()}

          {/* Rubber-band selection box */}
          {selBox && selBox.w + selBox.h > 2 && (
            <rect
              x={selBox.x} y={selBox.y} width={selBox.w} height={selBox.h}
              fill="rgba(59,130,246,0.08)" stroke="#3B82F6" strokeWidth={1 / scale}
              strokeDasharray={`${5 / scale},${3 / scale}`}
              style={{ pointerEvents: 'none' }}
            />
          )}

          {/* Nodes */}
          {nodes.map(n => {
            const x = n.x ?? 0, y = n.y ?? 0
            const color = nodeColor(n.id)
            const isRoot = n.parentId === null
            const isDragging = dragRef.current?.id === n.id
            const isRenaming = renaming?.id === n.id
            const isTarget = connectLine?.targetId === n.id
            const isSelected = selectedIds.has(n.id)
            const showPin = hoveredId === n.id || connectLine?.sourceId === n.id || selectedForConnect === n.id
            const isFlipped = flippedNodes.has(n.id)
            const displayText = isFlipped ? (n.back || '+ add notes') : n.label
            const truncated = displayText.length > 18 ? displayText.slice(0, 17) + '…' : displayText
            return (
              <g
                key={n.id}
                onPointerDown={e => handleNodePointerDown(e, n.id)}
                onPointerEnter={() => { if (!dragRef.current && !connectRef.current) setHoveredId(n.id) }}
                onPointerLeave={() => setHoveredId(null)}
                onDoubleClick={e => {
                  e.stopPropagation()
                  const editLabel = isFlipped ? (n.back ?? '') : n.label
                  setEditingBack(isFlipped)
                  setRenaming({ id: n.id, label: editLabel })
                  setCtxMenu(null)
                }}
                onContextMenu={e => {
                  e.preventDefault(); e.stopPropagation()
                  setCtxMenu({ nodeId: n.id, screenX: e.clientX, screenY: e.clientY })
                }}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              >
                {/* Shadow */}
                <rect x={x+2} y={y+2} width={NODE_W} height={NODE_H} rx={10} fill="rgba(0,0,0,0.06)" />
                {/* Target highlight ring */}
                {isTarget && <rect x={x-3} y={y-3} width={NODE_W+6} height={NODE_H+6} rx={13} fill="none" stroke={color} strokeWidth={2} strokeOpacity={0.6} strokeDasharray="4 3" />}
                {/* Selection ring */}
                {isSelected && <rect x={x-3} y={y-3} width={NODE_W+6} height={NODE_H+6} rx={13} fill="rgba(59,130,246,0.08)" stroke="#3B82F6" strokeWidth={1.5} />}
                {/* Card — slate tint on back face */}
                <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={10} fill={isFlipped ? (dark ? '#162032' : '#F1F5F9') : (dark ? '#1E293B' : 'white')} stroke={color} strokeWidth={isRoot ? 2 : 1.5} />
                {/* Color accent bar */}
                <rect x={x} y={y} width={5} height={NODE_H} rx={3} fill={color} />
                <rect x={x+2} y={y} width={3} height={NODE_H} fill={color} />
                {/* Flip indicator on back face */}
                {isFlipped && (
                  <text x={x + NODE_W - 8} y={y + 9} fontSize={8} fill={color} opacity={0.6} style={{ pointerEvents: 'none', userSelect: 'none' }}>↩</text>
                )}

                {isRenaming ? (
                  <foreignObject x={x + 12} y={y + 6} width={NODE_W - 20} height={NODE_H - 12}>
                    <input
                      autoFocus
                      value={renaming.label}
                      onChange={e => setRenaming(r => r ? { ...r, label: e.target.value } : r)}
                      onKeyDown={e => {
                        e.stopPropagation()
                        if (e.key === 'Enter') handleRenameConfirm()
                        if (e.key === 'Escape') { setRenaming(null); setEditingBack(false) }
                      }}
                      onBlur={handleRenameConfirm}
                      style={{ width: '100%', fontSize: 11, border: 'none', outline: 'none', background: 'transparent', fontWeight: isRoot && !editingBack ? 600 : 400, color: dark ? '#E2E8F0' : '#1E293B', fontStyle: editingBack ? 'italic' : 'normal' }}
                    />
                  </foreignObject>
                ) : (
                  <text
                    x={x + 14} y={y + NODE_H / 2}
                    dominantBaseline="middle"
                    fontSize={11}
                    fontWeight={isRoot && !isFlipped ? 700 : 400}
                    fontStyle={isFlipped ? 'italic' : 'normal'}
                    fill={isFlipped && !n.back ? (dark ? '#475569' : '#94A3B8') : (dark ? '#E2E8F0' : '#1E293B')}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {truncated}
                  </text>
                )}

                {/* Left-side connection pin — large invisible hit area for touch */}
                {showPin && (
                  <g onPointerDown={e => handlePinPointerDown(e, n.id, true)} style={{ cursor: 'crosshair' }}>
                    <circle cx={x} cy={y + NODE_H / 2} r={14} fill="transparent" />
                    <circle cx={x} cy={y + NODE_H / 2} r={5} fill={color} stroke="white" strokeWidth={2} style={{ pointerEvents: 'none' }} />
                  </g>
                )}
                {/* Right-side connection pin — large invisible hit area for touch */}
                {showPin && (
                  <g onPointerDown={e => handlePinPointerDown(e, n.id, false)} style={{ cursor: 'crosshair' }}>
                    <circle cx={x + NODE_W} cy={y + NODE_H / 2} r={14} fill="transparent" />
                    <circle cx={x + NODE_W} cy={y + NODE_H / 2} r={5} fill={color} stroke="white" strokeWidth={2} style={{ pointerEvents: 'none' }} />
                  </g>
                )}
              </g>
            )
          })}

          {/* Empty state */}
          {nodes.length === 0 && (
            <text x={0} y={0} textAnchor="middle" dominantBaseline="middle" fontSize={14} fill="#94A3B8"
              style={{ cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); persist([{ id: 'root', label: 'Finance Concepts', parentId: null, x: -NODE_W/2, y: -NODE_H/2 }]) }}
            >
              Click to create your first node
            </text>
          )}
          </g>
        </svg>
      </div>

      {/* Floating title */}
      <div className="absolute top-3 left-3 z-10" onClick={e => e.stopPropagation()}>
        <input
          value={mmTitle}
          onChange={e => { setMmTitle(e.target.value); saveMindmap(e.target.value, nodesRef.current, edgesRef.current) }}
          placeholder="Map title…"
          className="text-sm font-semibold bg-white/90 backdrop-blur border border-xero-border rounded-xl px-3 py-1.5 shadow-sm focus:outline-none focus:ring-1 focus:ring-xero-green w-44"
        />
      </div>

      {/* Floating CSV import — top-right */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2" onClick={e => e.stopPropagation()}>
        {importMmMsg && (
          <span className={`text-xs font-medium rounded-lg px-2.5 py-1.5 shadow-sm ${dark ? 'bg-slate-700 text-emerald-400' : 'bg-white/90 text-xero-green'}`}>{importMmMsg}</span>
        )}
        <button
          onClick={() => {
            const relaid = computeLayout(nodesRef.current)
            persist(relaid, edgesRef.current)
          }}
          className={`text-xs px-3 py-3 rounded-xl font-medium shadow-sm transition-colors border ${dark ? 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600' : 'bg-white/90 border-xero-border text-gray-600 hover:bg-white'}`}
          title="Re-layout all nodes"
        >
          Re-layout
        </button>
        <div className="relative" ref={csvMmTooltipRef}>
          <div className="flex items-center gap-1">
            <button
              onClick={() => csvMmInputRef.current?.click()}
              onMouseEnter={() => setCsvMmTooltipOpen(true)}
              onMouseLeave={() => setCsvMmTooltipOpen(false)}
              className={`text-xs px-3 py-3 rounded-xl font-medium shadow-sm transition-colors border ${dark ? 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600' : 'bg-white/90 border-xero-border text-gray-600 hover:bg-white'}`}
            >
              Import CSV
            </button>
            <button
              onClick={() => setCsvMmTooltipOpen(v => !v)}
              className={`w-11 h-11 rounded-full text-[10px] font-bold shadow-sm transition-colors border flex items-center justify-center flex-shrink-0 ${dark ? 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600' : 'bg-white/90 border-xero-border text-gray-500 hover:bg-white'}`}
              aria-label="CSV format info"
            >
              ?
            </button>
          </div>
          {csvMmTooltipOpen && (
            <div className="absolute top-full right-0 mt-2 z-50 w-72 max-w-[calc(100vw-2rem)] pointer-events-none">
              <div className="bg-gray-900 text-white rounded-xl shadow-2xl p-3 text-left">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">CSV Format</p>
                <code className="block bg-black/30 rounded-lg px-2.5 py-2 text-[11px] font-mono text-green-300 leading-relaxed whitespace-pre">{`label,parent,back\nFinance Concepts,,\nBudgeting,Finance Concepts,\nIncome,Budgeting,Money coming in\nSavings,Finance Concepts,`}</code>
                <div className="mt-2 space-y-0.5">
                  <p className="text-[10px] text-gray-300"><span className="text-white font-medium">label</span> — node text (required)</p>
                  <p className="text-[10px] text-gray-300"><span className="text-white font-medium">parent</span> — parent node label, empty = root</p>
                  <p className="text-[10px] text-gray-300"><span className="text-white font-medium">back</span> — flip-side text (optional)</p>
                </div>
                <div className="absolute bottom-full right-4 border-4 border-transparent border-b-gray-900" />
              </div>
            </div>
          )}
        </div>
        <input ref={csvMmInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleMmCsvImport} />
      </div>

      {/* Context menu — smart positioning, proper icons */}
      {ctxMenu && ctxNode && (() => {
        const ctxIsFlipped = flippedNodes.has(ctxNode.id)
        const vw = typeof window !== 'undefined' ? window.innerWidth  : 400
        const vh = typeof window !== 'undefined' ? window.innerHeight : 700
        // On narrow screens use more width; desktop cap at 180px
        const menuW = Math.min(180, vw - 24)
        const showAbove = ctxMenu.screenY > vh * 0.5
        // Clamp left edge so menu never bleeds off either side
        const rawLeft = ctxMenu.screenX - menuW / 2
        const clampedLeft = Math.max(8, Math.min(rawLeft, vw - menuW - 8))
        const maxMenuH = showAbove ? ctxMenu.screenY - 12 : vh - ctxMenu.screenY - 12
        return (
        <div
          className="fixed z-40 bg-white dark:bg-slate-800 border border-xero-border dark:border-slate-700 rounded-2xl shadow-2xl flex flex-col"
          style={{
            left: clampedLeft,
            top: ctxMenu.screenY,
            width: menuW,
            maxHeight: Math.max(180, maxMenuH),
            overflowY: 'auto',
            transform: showAbove ? 'translateY(calc(-100% - 8px))' : 'translateY(8px)',
          }}
          onClick={e => e.stopPropagation()}
          onContextMenu={e => e.preventDefault()}
        >
          <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-700">
            <p className="text-xs font-semibold text-gray-600 dark:text-slate-300 truncate">{ctxIsFlipped ? (ctxNode.back ?? '(back)') : ctxNode.label}</p>
            <p className="text-[10px] text-gray-400 dark:text-slate-500">{ctxIsFlipped ? t.backFace : t.frontFace}</p>
          </div>
          {[
            { icon: <IconEdit className="w-3.5 h-3.5" strokeWidth={2} />, label: t.editFront, onClick: () => { setEditingBack(false); setRenaming({ id: ctxNode.id, label: ctxNode.label }); setCtxMenu(null) } },
            { icon: <IconEdit className="w-3.5 h-3.5 opacity-60" strokeWidth={2} />, label: t.editBack, onClick: () => { setEditingBack(true); setRenaming({ id: ctxNode.id, label: ctxNode.back ?? '' }); setCtxMenu(null) } },
            { icon: <IconAdd className="w-3.5 h-3.5" strokeWidth={2} />, label: t.addChild, onClick: handleAddChild },
            { icon: <IconLink className="w-3.5 h-3.5" strokeWidth={2} />, label: t.connect, onClick: () => {
              const node = nodesRef.current.find(n => n.id === ctxMenu.nodeId)
              if (!node) return
              setCtxMenu(null)
              connectRef.current = { sourceId: ctxMenu.nodeId, x: (node.x ?? 0) + NODE_W, y: (node.y ?? 0) + NODE_H / 2, targetId: null }
              setConnectLine(connectRef.current)
            }},
            { icon: <IconCut className="w-3.5 h-3.5" strokeWidth={2} />, label: t.clearConnections, onClick: () => {
              const id = ctxMenu.nodeId
              setCtxMenu(null)
              persist(nodesRef.current.map(n => n.id === id ? { ...n, parentId: null } : n), edgesRef.current.filter(e => e.from !== id && e.to !== id))
            }},
            { icon: <IconLayers className="w-3.5 h-3.5" strokeWidth={2} />, label: 'Select subtree', onClick: () => {
              const id = ctxMenu.nodeId
              function descendants(pid: string): string[] {
                return [pid, ...nodesRef.current.filter(n => n.parentId === pid).flatMap(c => descendants(c.id))]
              }
              const ids = new Set(descendants(id))
              setSelectedIds(ids); selectedIdsRef.current = ids
              setCtxMenu(null)
            }},
          ].map(item => (
            <button key={item.label} onClick={item.onClick}
              className="flex items-center gap-2.5 w-full text-left text-sm text-gray-700 dark:text-slate-300 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-t border-gray-50 dark:border-slate-700/50">
              <span className="text-gray-400 dark:text-slate-500 flex-shrink-0">{item.icon}</span>
              {item.label}
            </button>
          ))}
          {ctxNode.parentId !== null && (
            <button
              onClick={() => { setConfirmDelete(ctxNode.id); setCtxMenu(null) }}
              className="flex items-center gap-2.5 w-full text-left text-sm text-red-500 px-3 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-gray-100 dark:border-slate-700"
            >
              <IconDelete className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} /> Delete
            </button>
          )}
        </div>
        )
      })()}

      {confirmDelete && (
        <ConfirmDialog
          message="This node and all its children will be deleted."
          confirmLabel="Delete"
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

// ─── MindmapView (multi-map picker + canvas) ─────────────────────────────────

function MindmapView() {
  const { mindmaps, isLoading, createMindmap, moveMindmapToFolder, deleteMindmap } = useMindmapList()
  const [mapParams, setMapParams] = useSearchParams()
  const selectedId = mapParams.get('map') ? Number(mapParams.get('map')) : null
  function setSelectedId(id: number | null) {
    setMapParams(p => { id !== null ? p.set('map', String(id)) : p.delete('map'); return p })
  }
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [swipeResetKey, setSwipeResetKey] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [newFolderInput, setNewFolderInput] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [folderPickerId, setFolderPickerId] = useState<number | null>(null)

  const mmFolders = [...new Set(mindmaps.map(m => m.folder).filter((f): f is string => f !== null))].sort()

  useEffect(() => {
    if (mindmaps.length === 0) return
    if (selectedId === null || !mindmaps.find(m => m.id === selectedId)) {
      setSelectedId(mindmaps[0].id)
    }
  }, [mindmaps, selectedId])

  async function handleNew() {
    const m = await createMindmap('New Map', activeFolder)
    setSelectedId(m.id)
  }

  async function handleNewInFolder(folder: string) {
    const name = folder.trim()
    if (!name) return
    const m = await createMindmap('New Map', name)
    setActiveFolder(name)
    setSelectedId(m.id)
    setNewFolderName('')
    setNewFolderInput(false)
  }

  async function handleDelete(id: number) {
    await deleteMindmap(id)
    setConfirmDeleteId(null)
    setSwipeResetKey(k => k + 1)
    if (selectedId === id) setSelectedId(mindmaps.find(m => m.id !== id)?.id ?? null)
  }

  function MapList({ onSelect }: { onSelect: () => void }) {
    const visibleMaps = activeFolder === null ? mindmaps : mindmaps.filter(m => m.folder === activeFolder)
    return (
      <>
        {/* Folder filter strip */}
        <div className="px-2 pt-2 pb-1 border-b border-xero-navy-light space-y-1.5">
          <div className="flex overflow-x-auto gap-1" style={{ scrollbarWidth: 'none' }}>
            <button onClick={() => setActiveFolder(null)} className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 font-medium transition-colors ${activeFolder === null ? 'bg-white text-gray-800' : 'text-gray-400 hover:text-gray-200'}`}>All</button>
            {mmFolders.map(f => (
              <button key={f} onClick={() => setActiveFolder(f)} className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 font-medium transition-colors ${activeFolder === f ? 'bg-xero-green text-white' : 'text-gray-400 hover:text-gray-200'}`}>{f}</button>
            ))}
          </div>
          {newFolderInput ? (
            <div className="flex gap-1">
              <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleNewInFolder(newFolderName); if (e.key === 'Escape') { setNewFolderInput(false); setNewFolderName('') } }}
                placeholder="Folder name…"
                className="flex-1 text-[10px] bg-xero-navy-light border border-xero-navy-light rounded px-2 py-2 text-gray-200 outline-none focus:ring-1 focus:ring-xero-green" />
              <button onClick={() => handleNewInFolder(newFolderName)} className="text-[10px] bg-xero-green text-white px-1.5 rounded font-medium">✓</button>
              <button onClick={() => { setNewFolderInput(false); setNewFolderName('') }} className="text-gray-500 hover:text-gray-300 text-[10px] px-1">✕</button>
            </div>
          ) : (
            <div className="flex gap-1">
              <button onClick={handleNew} className="flex-1 text-[10px] text-gray-300 hover:text-white transition-colors text-left px-1">+ New map</button>
              <button onClick={() => setNewFolderInput(true)} className="text-gray-400 hover:text-white transition-colors p-1 rounded" title="New folder"><IconFolder className="w-3.5 h-3.5" strokeWidth={2} /></button>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {isLoading && <p className="text-xs text-gray-500 px-3 py-2">Loading…</p>}
          {visibleMaps.map(m => (
            <SwipeToDelete key={m.id} onDelete={() => setConfirmDeleteId(m.id)} resetKey={swipeResetKey} contentBg="bg-xero-navy">
              <div className={`group flex items-center justify-between px-3 py-2 min-h-[44px] cursor-pointer rounded mx-1 my-0.5 transition-colors ${selectedId === m.id ? 'bg-xero-green/20 text-xero-green' : 'text-gray-400 hover:text-gray-200 hover:bg-xero-navy-light'}`}
                onClick={() => { setSelectedId(m.id); onSelect() }}>
                <span className="text-sm truncate flex-1">{m.title}</span>
                <div className="flex items-center gap-0.5 md:opacity-0 md:group-hover:opacity-100 transition-all">
                  {/* Folder picker for this map */}
                  <div className="relative">
                    <button onClick={e => { e.stopPropagation(); setFolderPickerId(folderPickerId === m.id ? null : m.id) }}
                      className="text-gray-500 hover:text-gray-300 p-0.5 rounded" title="Move to folder"><IconFolder className="w-3 h-3" strokeWidth={2} /></button>
                    {folderPickerId === m.id && (
                      <div className="absolute left-0 top-full mt-0.5 z-30 bg-xero-navy border border-xero-navy-light rounded-lg shadow-xl py-1 min-w-[130px]" onClick={e => e.stopPropagation()}>
                        <button onClick={() => { moveMindmapToFolder(m.id, null); setFolderPickerId(null) }} className="w-full text-left text-[10px] px-3 py-1.5 text-gray-400 hover:bg-xero-navy-light hover:text-gray-200">No folder</button>
                        {mmFolders.map(f => (
                          <button key={f} onClick={() => { moveMindmapToFolder(m.id, f); setFolderPickerId(null) }} className="w-full text-left text-[10px] px-3 py-1.5 text-gray-300 hover:bg-xero-navy-light hover:text-white">{f}</button>
                        ))}
                        <div className="border-t border-xero-navy-light mt-1 pt-1 px-2">
                          <input placeholder="New folder…" className="w-full text-[10px] bg-xero-navy-light rounded px-2 py-1 text-gray-200 outline-none"
                            onKeyDown={e => { if (e.key === 'Enter') { const n = (e.target as HTMLInputElement).value.trim(); if (n) { moveMindmapToFolder(m.id, n); setFolderPickerId(null) } } }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(m.id) }} className="text-gray-500 hover:text-red-400 transition-all p-0.5 rounded">
                    <IconClose className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </SwipeToDelete>
          ))}
          {!isLoading && visibleMaps.length === 0 && (
            <p className="text-xs text-gray-500 px-3 py-3">No maps{activeFolder ? ` in "${activeFolder}"` : ' yet'}.</p>
          )}
        </div>
      </>
    )
  }

  const selectedTitle = mindmaps.find(m => m.id === selectedId)?.title ?? 'Mindmap'

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-44 flex-shrink-0 flex-col bg-xero-navy border-r border-xero-navy-light">
        <MapList onSelect={() => {}} />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-52 h-full bg-xero-navy flex flex-col shadow-2xl">
            <MapList onSelect={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Canvas + mobile header */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-2 px-3 py-2 bg-xero-navy border-b border-xero-navy-light flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-gray-400 hover:text-white transition-colors p-2.5"
          >
            <IconMenu className="w-4 h-4" strokeWidth={2} />
          </button>
          <span className="text-sm text-gray-300 font-medium truncate">{selectedTitle}</span>
        </div>

        {selectedId !== null ? (
          <MindmapCanvas key={selectedId} mapId={selectedId} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            {isLoading ? 'Loading…' : 'Create a map to get started'}
          </div>
        )}
      </div>

      {confirmDeleteId !== null && (
        <ConfirmDialog
          message="This mindmap and all its nodes will be deleted."
          confirmLabel="Delete"
          onConfirm={() => handleDelete(confirmDeleteId)}
          onCancel={() => { setConfirmDeleteId(null); setSwipeResetKey(k => k + 1) }}
        />
      )}
    </div>
  )
}

// ─── VocabView ────────────────────────────────────────────────────────────────

const LANGS = ['de', 'en', 'tr', 'fr', 'es', 'ja']
const LANG_LABELS: Record<string, string> = {
  de: '🇩🇪 DE', en: '🇬🇧 EN', tr: '🇹🇷 TR', fr: '🇫🇷 FR', es: '🇪🇸 ES', ja: '🇯🇵 JA',
}

type NewWord = { word: string; translation: string; language: string; translation_language: string; example: string }

type EditCard = { id: number; word: string; translation: string; language: string; translation_language: string; example: string; image_url: string }

// Levenshtein-based string similarity [0, 1]. Used for 90%-correct auto-rating.
function strSimilarity(a: string, b: string): number {
  const norm = (s: string) => s.toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ')
  const s1 = norm(a), s2 = norm(b)
  if (s1 === s2) return 1
  if (!s1 || !s2) return 0
  const m = s1.length, n = s2.length
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  )
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = s1[i-1] === s2[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  return 1 - dp[m][n] / Math.max(m, n)
}

// Shows a tooltip after 2s of hover — used on SR rating buttons.
function RateTooltip({ children, text }: { children: ReactNode; text: string }) {
  const [show, setShow] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function onEnter() { timer.current = setTimeout(() => setShow(true), 2000) }
  function onLeave() { if (timer.current) clearTimeout(timer.current); setShow(false) }
  return (
    <div className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-44 bg-gray-900 text-white text-[11px] leading-relaxed rounded-xl px-3 py-2 shadow-xl pointer-events-none text-center">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  )
}

// SM-2 targets 90% retention at due_at. Solve: 0.9 = e^(-1/k) → k = -1/ln(0.9) ≈ 9.49
const LN09K = -1 / Math.log(0.9)

function forgettingCurveData(card: VocabCard): { day: string; pct: number }[] {
  return Array.from({ length: 31 }, (_, i) => ({
    day: i === 0 ? '0' : `+${i}d`,
    pct: Math.max(0, Math.round(Math.exp(-i / (card.interval * LN09K)) * 100)),
  }))
}

const LANG_BCP47: Record<string, string> = {
  de: 'de-DE', en: 'en-US', tr: 'tr-TR', fr: 'fr-FR', es: 'es-ES', ja: 'ja-JP',
}

function speak(text: string, lang: string) {
  if (!('speechSynthesis' in window)) return
  const bcp47 = LANG_BCP47[lang] ?? lang

  function doSpeak() {
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = bcp47
    const voices = window.speechSynthesis.getVoices()
    const voice = voices.find(v => v.lang.startsWith(bcp47.slice(0, 2))) ?? null
    if (voice) utt.voice = voice
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utt)
  }

  const voices = window.speechSynthesis.getVoices()
  if (voices.length > 0) {
    doSpeak()
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null
      doSpeak()
    }
  }
}

interface DeConjugation {
  ichPräsens: string
  duPräsens: string
  erPräsens: string
  ichPräteritum: string
  partizipII: string
  hilfsverb: string
  imperativSg: string
}

function parseWiktionaryConj(wikitext: string): DeConjugation | null {
  const match = wikitext.match(/\{\{Deutsch Verb Übersicht[\s\S]*?\}\}/)
  if (!match) return null
  const block = match[0]
  function get(key: string) {
    const m = block.match(new RegExp(`\\|${key}\\s*=\\s*([^\n|]+)`))
    return m?.[1]?.trim() ?? ''
  }
  return {
    ichPräsens:    get('Präsens_ich'),
    duPräsens:     get('Präsens_du'),
    erPräsens:     get('Präsens_er, sie, es'),
    ichPräteritum: get('Präteritum_ich'),
    partizipII:    get('Partizip II'),
    hilfsverb:     get('Hilfsverb'),
    imperativSg:   get('Imperativ Singular'),
  }
}

async function fetchDeConj(word: string): Promise<DeConjugation | null> {
  const url = `https://de.wiktionary.org/w/api.php?action=query&titles=${encodeURIComponent(word)}&prop=revisions&rvprop=content&format=json&origin=*`
  try {
    const res = await fetch(url)
    const json = await res.json() as { query: { pages: Record<string, { revisions?: { '*': string }[] }> } }
    const page = Object.values(json.query.pages)[0]
    const wikitext = page?.revisions?.[0]?.['*'] ?? ''
    return parseWiktionaryConj(wikitext)
  } catch { return null }
}

function VocabView() {
  const { t } = useLanguage()
  const { vocab, isLoading, addWord, deleteWord, review, bulkImport, updateWord, moveVocabToFolder, renameVocabFolder, deleteVocabFolder } = useVocabulary()
  const [confirmDeleteVocabId, setConfirmDeleteVocabId] = useState<number | null>(null)
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<string | null>(null)
  const [reviewMode, setReviewMode] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [reviewIdx, setReviewIdx] = useState(0)
  const [typeMode, setTypeMode]   = useState(false)
  const [answer, setAnswer]       = useState('')
  const [answerResult, setAnswerResult] = useState<{ correct: boolean; pct: number } | null>(null)
  const answerRef = useRef<HTMLInputElement>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addFolder, setAddFolder] = useState<string | null>(null)
  const [newWord, setNewWord] = useState<NewWord>({ word: '', translation: '', language: 'de', translation_language: 'tr', example: '' })
  const [deConj, setDeConj] = useState<DeConjugation | null | 'loading' | 'none'>(null)
  const [translating, setTranslating] = useState(false)
  const [translateResult, setTranslateResult] = useState<{ alternatives: string[]; examples: { source: string; target: string }[] } | null>(null)
  const [importMsg, setImportMsg] = useState<string | null>(null)

  async function translateWord(word: string, sourceLang: string, targetLang: string): Promise<{ translation: string; alternatives: string[]; examples: { source: string; target: string }[] } | null> {
    if (!word.trim()) return null
    setTranslating(true)
    setTranslateResult(null)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: word, sourceLang, targetLang }),
      })
      if (!res.ok) return null
      return await res.json() as { translation: string; alternatives: string[]; examples: { source: string; target: string }[] }
    } catch { return null } finally { setTranslating(false) }
  }
  const [editCard, setEditCard] = useState<EditCard | null>(null)
  const [csvTooltipOpen, setCsvTooltipOpen] = useState(false)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const csvTooltipRef = useRef<HTMLDivElement>(null)
  const [vocabSearch, setVocabSearch] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false)
  const vocabTree = buildFolderTree(vocab)

  useEffect(() => {
    if (!csvTooltipOpen) return
    function handleClick(e: MouseEvent) {
      if (!csvTooltipRef.current?.contains(e.target as Node)) setCsvTooltipOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [csvTooltipOpen])

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const lines = text.trim().split('\n').filter(Boolean)
    const isHeader = /word|translation/i.test(lines[0] ?? '')
    const rows = isHeader ? lines.slice(1) : lines
    const items = rows.map(row => {
      const cols = parseCSVLine(row)
      return { word: cols[0] ?? '', translation: cols[1] ?? '', language: cols[2] || 'de', example: cols[3] || undefined }
    }).filter(i => i.word && i.translation)
    if (!items.length) { setImportMsg('No valid rows found.'); return }
    const n = await bulkImport(items)
    setImportMsg(`Imported ${n} word${n !== 1 ? 's' : ''}.`)
    setTimeout(() => setImportMsg(null), 4000)
    e.target.value = ''
  }

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const dueCards = vocab.filter(v => new Date(v.due_at) <= today)
  const q = vocabSearch.trim().toLowerCase()
  const scopedWords = getItemsInFolder(vocabTree, selectedFolder)
  const listItems = q ? scopedWords.filter(v => [v.word, v.translation, v.example ?? ''].some(s => s.toLowerCase().includes(q))) : scopedWords
  const scopeLabel = selectedFolder === null ? 'All Words' : selectedFolder === '' ? 'Unsorted' : selectedFolder
  const reviewCard: VocabCard | null = dueCards[reviewIdx] ?? null

  async function handleRate(quality: number) {
    if (!reviewCard) return
    await review(reviewCard.id, quality)
    setFlipped(false)
    setReviewIdx(i => i + 1)
    setAnswer('')
    setAnswerResult(null)
  }

  function submitVocabAnswer() {
    if (!reviewCard || !answer.trim() || answerResult) return
    const pct = strSimilarity(answer, reviewCard.translation)
    const correct = pct >= 0.9
    setAnswerResult({ correct, pct })
    setTimeout(() => handleRate(correct ? 4 : 0), 1500)
  }

  useEffect(() => {
    if (typeMode && reviewMode) answerRef.current?.focus()
  }, [typeMode, reviewIdx, reviewMode])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newWord.word.trim() || !newWord.translation.trim()) return
    const existing = vocab.find(v => v.word.toLowerCase() === newWord.word.trim().toLowerCase() && v.language === newWord.language)
    const payload = { ...newWord, example: newWord.example.trim() || undefined }
    let card: VocabCard
    if (existing) {
      await updateWord(existing.id, payload)
      card = { ...existing, ...payload, example: payload.example ?? null }
    } else {
      card = await addWord(payload)
    }
    if (addFolder) await moveVocabToFolder(card.id, addFolder)
    setNewWord({ word: '', translation: '', language: newWord.language, translation_language: newWord.translation_language, example: '' })
    setShowAdd(false)
    setAddFolder(null)
    openEdit(card)
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editCard) return
    await updateWord(editCard.id, {
      word: editCard.word,
      translation: editCard.translation,
      language: editCard.language,
      translation_language: editCard.translation_language,
      example: editCard.example || undefined,
      image_url: editCard.image_url || undefined,
    })
    setEditCard(null)
  }

  function openEdit(card: VocabCard) {
    setDeConj(null)
    setTranslateResult(null)
    setEditCard({
      id: card.id,
      word: card.word,
      translation: card.translation,
      language: card.language,
      translation_language: card.translation_language,
      example: card.example ?? '',
      image_url: card.image_url ?? '',
    })
  }

  // Deep-link support: Memory Palace's "Go to linked item" navigates here with
  // ?highlight=<id> — open that word's edit panel directly, regardless of folder.
  const [highlightParams, setHighlightParams] = useSearchParams()
  useEffect(() => {
    const hi = highlightParams.get('highlight')
    if (!hi) return
    const card = vocab.find(v => v.id === Number(hi))
    if (card) {
      openEdit(card)
      setHighlightParams(p => { p.delete('highlight'); return p }, { replace: true })
    }
  }, [highlightParams, vocab]) // eslint-disable-line react-hooks/exhaustive-deps

  if (reviewMode) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 p-6 h-full">
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setTypeMode(m => !m); setAnswer(''); setAnswerResult(null); setFlipped(false) }}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${typeMode ? 'bg-gray-900 text-white' : 'text-gray-400 hover:bg-gray-100'}`}
          >
            ⌨️ Type
          </button>
          <button
            onClick={() => { setReviewMode(false); setReviewIdx(0); setFlipped(false); setTypeMode(false); setAnswer(''); setAnswerResult(null) }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {t.exitReview}
          </button>
          <span className="text-sm text-gray-400">{Math.min(reviewIdx, dueCards.length)}/{dueCards.length} reviewed</span>
        </div>

        {reviewIdx >= dueCards.length ? (
          <div className="text-center">
            <p className="text-5xl mb-4">🎉</p>
            <p className="text-xl font-semibold text-gray-800">{t.allCaughtUp}</p>
            <p className="text-sm text-gray-400 mt-2">{t.reviewed(dueCards.length)}</p>
            <button
              onClick={() => { setReviewMode(false); setReviewIdx(0) }}
              className="mt-4 text-sm bg-xero-green text-white px-5 py-2 rounded-lg font-medium"
            >
              {t.done}
            </button>
          </div>
        ) : reviewCard && (
          <div className="w-full max-w-sm space-y-3">
            {/* Card face */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm min-h-[160px] flex flex-col items-center justify-center gap-3 select-none">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Word</p>
              <p className="text-2xl font-bold text-gray-900 text-center">{reviewCard.word}</p>
              {!typeMode && !flipped && (
                <p className="text-xs text-gray-300 mt-1 cursor-pointer" onClick={() => setFlipped(true)}>Tap to reveal translation</p>
              )}
              {!typeMode && flipped && (
                <>
                  <p className="text-lg font-semibold text-gray-600 text-center">{reviewCard.translation}</p>
                  {reviewCard.example && <p className="text-xs text-gray-400 text-center italic">"{reviewCard.example}"</p>}
                </>
              )}
            </div>

            {/* Type mode input / result */}
            {typeMode && (
              answerResult ? (
                <div className={`rounded-xl p-3.5 ${answerResult.correct ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  <p className={`text-sm font-bold ${answerResult.correct ? 'text-emerald-700' : 'text-red-600'}`}>
                    {answerResult.correct ? `✓ Correct  ${Math.round(answerResult.pct * 100)}%` : `✗ Wrong  ${Math.round(answerResult.pct * 100)}%`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1.5">Answer: <span className="font-medium text-gray-800">{reviewCard.translation}</span></p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    ref={answerRef}
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') submitVocabAnswer() }}
                    placeholder="Type the translation…"
                    className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-xero-green/30 focus:border-xero-green"
                  />
                  <button
                    onClick={submitVocabAnswer}
                    disabled={!answer.trim()}
                    className="px-4 py-2.5 bg-xero-green text-white rounded-xl text-sm font-semibold hover:bg-xero-green-dark disabled:opacity-40 transition-colors"
                  >
                    Check
                  </button>
                </div>
              )
            )}

            {/* Flip mode rating buttons */}
            {!typeMode && flipped && (
              <div className="grid grid-cols-4 gap-2">
                {[
                  { q: 0, label: t.again, cls: 'bg-red-100 text-red-700 hover:bg-red-200',       tip: 'Failed. Resets to 1 day — you\'ll see it again soon.' },
                  { q: 2, label: t.hard,  cls: 'bg-amber-100 text-amber-700 hover:bg-amber-200', tip: 'Barely recalled. Resets interval — needs more practice.' },
                  { q: 4, label: t.good,  cls: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200', tip: 'Recalled correctly. Interval advances normally.' },
                  { q: 5, label: t.easy,  cls: 'bg-sky-100 text-sky-700 hover:bg-sky-200',       tip: 'Recalled instantly. Longer interval + easier factor.' },
                ].map(({ q, label, cls, tip }) => (
                  <RateTooltip key={q} text={tip}>
                    <button onClick={() => handleRate(q)} className={`w-full text-xs font-semibold rounded-lg py-2.5 transition-colors ${cls}`}>
                      {label}
                    </button>
                  </RateTooltip>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // "+ New word" in the tree can't create immediately like Notes/Sentence/Scenario do —
  // word + translation are required by the backend — so it opens the quick-add form
  // instead, targeted at the folder the user clicked from.
  function handleNewItemRequest(folder: string | null) {
    setAddFolder(folder)
    setNewWord({ word: '', translation: '', language: 'de', translation_language: 'tr', example: '' })
    setShowAdd(true)
  }

  function TreePane() {
    return (
      <div className="flex-1 overflow-y-auto flex flex-col">
        <div className="p-2 space-y-0.5 border-b border-gray-100 dark:border-slate-700 flex-shrink-0">
          <button onClick={() => { setSelectedFolder(null); setMobileTreeOpen(false) }}
            className={`w-full text-left text-xs px-2 py-2 rounded-lg transition-colors flex items-center ${isTouch ? 'min-h-[44px]' : ''} ${selectedFolder === null ? 'bg-xero-green/10 dark:bg-xero-green/20 text-xero-green font-medium' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
            All Words
          </button>
          <button onClick={() => { setSelectedFolder(''); setMobileTreeOpen(false) }}
            className={`w-full text-left text-xs px-2 py-2 rounded-lg transition-colors flex items-center ${isTouch ? 'min-h-[44px]' : ''} ${selectedFolder === '' ? 'bg-xero-green/10 dark:bg-xero-green/20 text-xero-green font-medium' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
            Unsorted
          </button>
        </div>
        <ItemFolderTree<VocabCard>
          tree={vocabTree}
          selectedId={null}
          showItems={false}
          selectedFolder={selectedFolder}
          onSelectFolder={path => { setSelectedFolder(path); setMobileTreeOpen(false) }}
          itemLabel={c => c.word}
          newItemLabel={`+ ${t.addWord}`}
          onSelectItem={() => {}}
          onNewItem={handleNewItemRequest}
          onRenameFolder={renameVocabFolder}
          onDeleteFolder={path => setConfirmDeleteFolder(path)}
          onMoveItemToFolder={(id, folder) => moveVocabToFolder(id, folder)}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Folder tree column — desktop permanent, mobile overlay */}
      <div className="hidden md:flex w-44 flex-shrink-0 flex-col border-r border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
        <TreePane />
      </div>
      {mobileTreeOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileTreeOpen(false)} />
          <div className="relative w-64 h-full bg-gray-50 dark:bg-slate-900 flex flex-col shadow-2xl">
            <TreePane />
          </div>
        </div>
      )}

      {/* Item list column */}
      <div className={`${editCard !== null ? 'hidden md:flex' : 'flex'} w-full md:w-72 border-r border-gray-100 dark:border-slate-700 flex-col bg-white dark:bg-slate-900/50 flex-shrink-0`}>
        <div className="flex items-center gap-1.5 px-2 py-2 border-b border-gray-100 dark:border-slate-700 flex-shrink-0">
          <button onClick={() => setMobileTreeOpen(true)}
            className="md:hidden text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors p-2 -m-1 min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0">
            <IconMenu className="w-4 h-4" strokeWidth={2} />
          </button>
          <span className="text-xs font-semibold text-gray-700 dark:text-slate-200 truncate flex-1">{scopeLabel}</span>
          {dueCards.length > 0 && (
            <button
              onClick={() => setReviewMode(true)}
              className="text-xs bg-xero-green text-white px-2.5 py-1.5 rounded-lg font-medium hover:bg-xero-green-dark transition-colors flex-shrink-0"
            >
              {t.reviewNow} ({dueCards.length})
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 px-2 pt-2 flex-shrink-0">
          <div className="relative flex-1 min-w-0">
            <input
              value={vocabSearch}
              onChange={e => setVocabSearch(e.target.value)}
              placeholder="Search…"
              className="w-full text-xs border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 pr-7 focus:outline-none focus:ring-1 focus:ring-xero-green bg-white dark:bg-slate-800 dark:text-slate-100 placeholder-gray-400"
            />
            {vocabSearch && (
              <button onClick={() => setVocabSearch('')} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 p-2">
                <IconClose className="w-3 h-3" strokeWidth={2} />
              </button>
            )}
          </div>
          <button onClick={() => handleNewItemRequest(selectedFolder)} title={t.addWord}
            className={`text-gray-400 hover:text-xero-green transition-colors p-2 -m-0.5 flex-shrink-0 flex items-center justify-center ${isTouch ? 'min-w-[44px] min-h-[44px]' : ''}`}>
            <IconAdd className="w-4 h-4" strokeWidth={2.5} />
          </button>
          <div className="relative flex-shrink-0" ref={csvTooltipRef}>
            <button
              onClick={() => { if (isTouch && !csvTooltipOpen) { setCsvTooltipOpen(true); return } csvInputRef.current?.click() }}
              onMouseEnter={() => setCsvTooltipOpen(true)}
              onMouseLeave={() => setCsvTooltipOpen(false)}
              className={`text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors p-2 -m-0.5 flex items-center justify-center ${isTouch ? 'min-w-[44px] min-h-[44px]' : ''}`}
              title={t.importCsv}
            >
              <IconUpload className="w-4 h-4" strokeWidth={2} />
            </button>
            {csvTooltipOpen && (
              <div className="absolute top-full right-0 mt-2 z-50 w-72 max-w-[calc(100vw-2rem)] pointer-events-none">
                <div className="bg-gray-900 text-white rounded-xl shadow-2xl p-3 text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">CSV Format</p>
                  <code className="block bg-black/30 rounded-lg px-2.5 py-2 text-[11px] font-mono text-green-300 leading-relaxed whitespace-pre">{`word,translation,language,example\nApfel,Apple,de,Der Apfel ist rot 🍎\nWasser,Water,de,`}</code>
                  <div className="mt-2 space-y-0.5">
                    <p className="text-[10px] text-gray-300"><span className="text-white font-medium">word</span> &amp; <span className="text-white font-medium">translation</span> — required</p>
                    <p className="text-[10px] text-gray-300"><span className="text-white font-medium">language</span> — <code className="text-green-300">en</code> / <code className="text-green-300">de</code> / <code className="text-green-300">tr</code> (optional)</p>
                    <p className="text-[10px] text-gray-300"><span className="text-white font-medium">example</span> — text or emoji hint (optional)</p>
                  </div>
                  <div className="absolute bottom-full right-4 border-4 border-transparent border-b-gray-900" />
                </div>
              </div>
            )}
          </div>
          <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvImport} />
        </div>

        {importMsg && <p className="text-xs text-xero-green font-medium px-3 pt-1.5">{importMsg}</p>}

        <div className="flex-1 overflow-y-auto py-1 px-1 mt-1">
          {isLoading ? (
            <p className="text-xs text-gray-400 p-4">Loading…</p>
          ) : listItems.length === 0 ? (
            <p className="text-xs text-gray-400 px-3 py-3">{vocabSearch.trim() ? 'No words found' : 'No words here yet.'}</p>
          ) : (
            listItems.map(v => (
              <div
                key={v.id}
                onClick={() => openEdit(v)}
                className={`flex items-center gap-1.5 py-2 pr-1 pl-2 rounded-lg cursor-pointer ${isTouch ? 'min-h-[44px]' : ''} ${editCard?.id === v.id ? 'bg-xero-green/10 dark:bg-xero-green/20' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`}
              >
                <IconBook className="w-3.5 h-3.5 flex-shrink-0 text-gray-400 dark:text-slate-500" strokeWidth={1.75} />
                <span className={`text-xs flex-1 truncate ${editCard?.id === v.id ? 'text-xero-green font-medium' : 'text-gray-600 dark:text-slate-400'}`}>{v.word}</span>
                <span className="text-[10px] text-gray-400 dark:text-slate-500 truncate max-w-[35%]">{v.translation}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail / edit pane */}
      <div className={`${editCard === null ? 'hidden md:flex' : 'flex'} flex-1 flex-col overflow-y-auto`}>
      {editCard ? (
        <form onSubmit={handleEditSave} className="p-4 max-w-lg mx-auto space-y-3 w-full">
          <button type="button" onClick={() => setEditCard(null)}
            className="md:hidden text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors -ml-3 p-3 min-w-[44px] min-h-[44px] flex items-center">
            ← {t.vocab}
          </button>

          <input
            value={editCard.word}
            onChange={e => setEditCard(p => p && ({ ...p, word: e.target.value }))}
            placeholder="Word"
            className="text-sm border border-gray-200 dark:border-slate-600 bg-transparent dark:text-slate-100 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-xero-green"
          />
          <div className="flex gap-2 items-center">
            <input
              value={editCard.translation}
              onChange={e => setEditCard(p => p && ({ ...p, translation: e.target.value }))}
              placeholder="Translation"
              className="text-sm border border-gray-200 dark:border-slate-600 bg-transparent dark:text-slate-100 rounded-lg px-3 py-2 flex-1 focus:outline-none focus:ring-1 focus:ring-xero-green"
            />
            <button
              type="button"
              disabled={translating}
              onClick={async () => {
                const result = await translateWord(editCard.word, editCard.language, editCard.translation_language)
                if (result) {
                  setEditCard(p => p && ({ ...p, translation: result.translation }))
                  setTranslateResult({ alternatives: result.alternatives, examples: result.examples })
                }
              }}
              className="text-xs px-2.5 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 transition-colors flex-shrink-0"
              title="Translate with DeepL"
            >
              {translating ? '…' : '🌐'}
            </button>
          </div>
          {translateResult && (translateResult.alternatives.length > 0 || translateResult.examples.length > 0) && (
            <div className="space-y-2 px-1">
              {translateResult.alternatives.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {translateResult.alternatives.map((alt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setEditCard(p => p && ({ ...p, translation: alt }))}
                      className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-100 dark:border-blue-800/50"
                    >
                      {alt}
                    </button>
                  ))}
                </div>
              )}
              {translateResult.examples.length > 0 && (
                <div className="space-y-1.5">
                  {translateResult.examples.map((ex, i) => (
                    <div key={i} className="text-[11px] text-gray-500 dark:text-slate-400 leading-tight">
                      <span className="italic">{ex.source}</span>
                      <span className="mx-1 text-gray-300 dark:text-slate-600">→</span>
                      <span>{ex.target}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <input
            value={editCard.example}
            onChange={e => setEditCard(p => p && ({ ...p, example: e.target.value }))}
            placeholder="Example / emoji hint (optional)"
            className="text-sm border border-gray-200 dark:border-slate-600 bg-transparent dark:text-slate-100 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-xero-green"
          />
          <input
            value={editCard.image_url}
            onChange={e => setEditCard(p => p && ({ ...p, image_url: e.target.value }))}
            placeholder="Image / GIF URL (optional)"
            className="text-sm border border-gray-200 dark:border-slate-600 bg-transparent dark:text-slate-100 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-xero-green"
          />
          {editCard.image_url && (
            <img src={editCard.image_url} alt="preview" className="w-full rounded-lg max-h-32 object-cover" />
          )}
          {/* Forgetting curve chart */}
          {(() => {
            const vocabCard = vocab.find(c => c.id === editCard.id)
            if (!vocabCard) return null
            return (
              <div className="pt-3 border-t border-gray-100 dark:border-slate-700">
                <p className="text-xs text-gray-400 dark:text-slate-500 mb-1.5">{t.forgettingCurve}</p>
                <ResponsiveContainer width="100%" height={80}>
                  <AreaChart data={forgettingCurveData(vocabCard)} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="pct" stroke="#10B981" strokeWidth={1.5} fill="url(#retGrad)" dot={false} />
                    <XAxis dataKey="day" fontSize={8} tickLine={false} axisLine={false} interval={4} />
                    <YAxis domain={[0, 100]} fontSize={8} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} />
                    <ReferenceLine y={90} stroke="#F59E0B" strokeDasharray="3 3" />
                    <Tooltip formatter={(v: number) => [`${v}%`, t.retentionLabel]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  </AreaChart>
                </ResponsiveContainer>
                <p className="text-[10px] text-amber-500 mt-0.5">─ ─ {t.reviewThreshold} (90%)</p>
              </div>
            )
          })()}
          {/* Conjugation panel — DE only */}
          {editCard.language === 'de' && (
            <div className="pt-3 border-t border-gray-100 dark:border-slate-700">
              {deConj === null && (
                <button
                  type="button"
                  onClick={async () => {
                    setDeConj('loading')
                    const c = await fetchDeConj(editCard.word)
                    setDeConj(c ?? 'none')
                  }}
                  className="text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                >
                  📖 Load conjugation
                </button>
              )}
              {deConj === 'loading' && <p className="text-xs text-gray-400 dark:text-slate-500">Loading…</p>}
              {deConj === 'none' && <p className="text-xs text-gray-400 dark:text-slate-500">No verb conjugation found.</p>}
              {deConj && typeof deConj === 'object' && (
                <div>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">Konjugation</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs mb-2">
                    {([
                      ['ich', deConj.ichPräsens],
                      ['du', deConj.duPräsens],
                      ['er/sie/es', deConj.erPräsens],
                      ['ich (Prät.)', deConj.ichPräteritum],
                      ['Partizip II', deConj.partizipII],
                      ['Hilfsverb', deConj.hilfsverb],
                    ] as [string, string][]).filter(([, v]) => v).map(([label, value]) => (
                      <div key={label} className="flex gap-2">
                        <span className="text-gray-400 dark:text-slate-500 w-20 flex-shrink-0">{label}</span>
                        <span className="font-medium text-gray-700 dark:text-slate-300">{value}</span>
                      </div>
                    ))}
                  </div>
                  <a
                    href={`https://www.verbformen.de/?w=${encodeURIComponent(editCard.word)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-blue-400 hover:text-blue-600 transition-colors"
                  >
                    Full table on verbformen.de →
                  </a>
                </div>
              )}
            </div>
          )}
          {/* Language pair selectors */}
          <div className="flex items-center gap-2">
            <select
              value={editCard.language}
              onChange={e => setEditCard(p => p && ({ ...p, language: e.target.value }))}
              className="text-sm border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg px-2 py-2 flex-1 focus:outline-none"
            >
              {LANGS.map(l => <option key={l} value={l}>{LANG_LABELS[l]}</option>)}
            </select>
            <span className="text-gray-400 text-xs">→</span>
            <select
              value={editCard.translation_language}
              onChange={e => setEditCard(p => p && ({ ...p, translation_language: e.target.value }))}
              className="text-sm border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg px-2 py-2 flex-1 focus:outline-none"
            >
              {LANGS.map(l => <option key={l} value={l}>{LANG_LABELS[l]}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button type="submit" className="flex-1 text-sm bg-xero-green text-white py-2 rounded-lg font-medium">{t.save}</button>
            <button type="button" onClick={() => setConfirmDeleteVocabId(editCard.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors flex-shrink-0">{t.delete}</button>
          </div>
        </form>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm px-6 text-center">
          {isLoading ? 'Loading…' : 'Select or add a word to get started.'}
        </div>
      )}
      </div>

      {/* Quick-add-word modal — word + translation are required before a word (or a
          brand-new folder) can exist, so this gathers them up front. */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => { setShowAdd(false); setAddFolder(null) }}>
          <form
            onSubmit={handleAdd}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-3 overflow-y-auto max-h-[calc(100dvh-2rem)]"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">
              {t.addWord}{addFolder ? <span className="text-gray-400 dark:text-slate-500 font-normal"> — {addFolder}</span> : null}
            </p>
            <input
              autoFocus
              value={newWord.word}
              onChange={e => setNewWord(p => ({ ...p, word: e.target.value }))}
              placeholder="Word"
              className="text-sm border border-gray-200 dark:border-slate-600 bg-transparent dark:text-slate-100 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-xero-green"
            />
            <input
              value={newWord.translation}
              onChange={e => setNewWord(p => ({ ...p, translation: e.target.value }))}
              placeholder="Translation"
              className="text-sm border border-gray-200 dark:border-slate-600 bg-transparent dark:text-slate-100 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-xero-green"
            />
            <input
              value={newWord.example}
              onChange={e => setNewWord(p => ({ ...p, example: e.target.value }))}
              placeholder="Example sentence (optional)"
              className="text-sm border border-gray-200 dark:border-slate-600 bg-transparent dark:text-slate-100 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-xero-green"
            />
            <div className="flex items-center gap-1">
              <select
                value={newWord.language}
                onChange={e => setNewWord(p => ({ ...p, language: e.target.value }))}
                className="text-sm border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-lg px-2 py-2 min-h-[44px] flex-1 focus:outline-none"
              >
                {LANGS.map(l => <option key={l} value={l}>{LANG_LABELS[l]}</option>)}
              </select>
              <span className="text-gray-400 text-xs px-0.5">→</span>
              <select
                value={newWord.translation_language}
                onChange={e => setNewWord(p => ({ ...p, translation_language: e.target.value }))}
                className="text-sm border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-lg px-2 py-2 min-h-[44px] flex-1 focus:outline-none"
              >
                {LANGS.map(l => <option key={l} value={l}>{LANG_LABELS[l]}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" className="flex-1 text-sm bg-xero-green text-white py-2 rounded-lg font-medium">Add</button>
              <button type="button" onClick={() => { setShowAdd(false); setAddFolder(null) }} className="flex-1 text-sm bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 py-2 rounded-lg font-medium">{t.cancel}</button>
            </div>
          </form>
        </div>
      )}

      {confirmDeleteVocabId !== null && (
        <ConfirmDialog
          message={`"${vocab.find((c: VocabCard) => c.id === confirmDeleteVocabId)?.word ?? ''}" will be permanently deleted.`}
          confirmLabel="Delete"
          onConfirm={() => { deleteWord(confirmDeleteVocabId); if (editCard?.id === confirmDeleteVocabId) setEditCard(null); setConfirmDeleteVocabId(null) }}
          onCancel={() => setConfirmDeleteVocabId(null)}
        />
      )}
      {confirmDeleteFolder !== null && (
        <ConfirmDialog
          message={`Delete folder "${confirmDeleteFolder}" and all words inside?`}
          confirmLabel="Delete"
          onConfirm={async () => { await deleteVocabFolder(confirmDeleteFolder); setConfirmDeleteFolder(null) }}
          onCancel={() => setConfirmDeleteFolder(null)}
        />
      )}
    </div>
  )
}

// ─── RemindersView ────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINS  = ['00', '15', '30', '45']

export function RemindersView({ standalone }: { standalone?: boolean } = {}) {
  const { t } = useLanguage()
  const { reminders, isLoading, toggle, remove, add } = useAllReminders()
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newNote,  setNewNote]  = useState('')
  const [newDate,  setNewDate]  = useState('')
  const [newHour,  setNewHour]  = useState('')
  const [newMin,   setNewMin]   = useState('00')

  function resetForm() {
    setNewTitle(''); setNewNote(''); setNewDate(''); setNewHour(''); setNewMin('00')
    setShowForm(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    const due_at = newDate
      ? (newHour !== '' ? `${newDate}T${newHour}:${newMin}:00` : newDate)
      : undefined
    await add({ title: newTitle.trim(), note: newNote.trim() || undefined, due_at })
    resetForm()
  }

  const now      = new Date()
  const pending  = reminders.filter(r => !r.done)
  const done     = reminders.filter(r => r.done)
  const overdue  = pending.filter(r => r.due_at && isBeforeDay(new Date(r.due_at), now))
  const todayGrp = pending.filter(r => r.due_at && sameDay(new Date(r.due_at), now))
  const upcoming = pending.filter(r => r.due_at && !isBeforeDay(new Date(r.due_at), now) && !sameDay(new Date(r.due_at), now))
  const noDate   = pending.filter(r => !r.due_at)

  type Group = 'overdue' | 'today' | 'upcoming'

  function renderGroup(
    label: string,
    items: typeof reminders,
    group: Group,
    labelCls: string,
    badgeCls: string,
  ) {
    if (items.length === 0) return null
    return (
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2.5">
          <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${badgeCls}`}>
            {label}
          </span>
          <span className="text-[10px] text-gray-400">{items.length}</span>
        </div>
        <div className="space-y-2">
          {items.map(r => (
            <div key={r.id} className="flex items-start gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 group hover:shadow-sm transition-shadow">
              <button
                onClick={() => toggle(r.id)}
                className="mt-0.5 flex-shrink-0 w-4 h-4 rounded border-2 border-gray-300 hover:border-xero-green transition-colors"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{r.title}</p>
                {r.note && <p className="text-xs text-gray-400 mt-0.5">{r.note}</p>}
                {r.due_at && (
                  <p className={`text-[10px] font-semibold mt-1 ${labelCls}`}>
                    {fmtDueLabel(r.due_at, group)}
                  </p>
                )}
              </div>
              <button
                onClick={() => setConfirmRemoveId(r.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-base leading-none flex-shrink-0 mt-0.5"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const inner = (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-xl">

        {/* New reminder button / form toggle */}
        <div className="mb-5">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="text-sm bg-xero-green text-white px-4 py-2 rounded-lg font-medium hover:bg-xero-green-dark transition-colors"
            >
              + New Reminder
            </button>
          ) : (
            <form onSubmit={handleAdd} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
              <input
                autoFocus
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="What do you need to remember?"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-xero-green font-medium placeholder-gray-300"
              />
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Add a note… (optional)"
                rows={2}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-xero-green resize-none placeholder-gray-300"
              />
              <div className="flex items-end gap-4 flex-wrap">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Date</p>
                  <input
                    type="date"
                    value={newDate}
                    onChange={e => { setNewDate(e.target.value); if (!e.target.value) { setNewHour(''); setNewMin('00') } }}
                    className="text-sm border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-xero-green"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                    Time <span className="normal-case font-normal">(optional)</span>
                  </p>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={newHour}
                      onChange={e => setNewHour(e.target.value)}
                      disabled={!newDate}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-xero-green disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <option value="">--</option>
                      {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <span className="text-gray-400 font-bold">:</span>
                    <input
                      type="text"
                      list="minute-opts"
                      value={newMin}
                      onChange={e => setNewMin(e.target.value)}
                      disabled={!newDate || newHour === ''}
                      placeholder="00"
                      maxLength={2}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-xero-green disabled:opacity-40 disabled:cursor-not-allowed w-14 text-center"
                    />
                    <datalist id="minute-opts">
                      {MINS.map(m => <option key={m} value={m} />)}
                    </datalist>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2 transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="text-sm bg-xero-green text-white px-5 py-2 rounded-lg font-medium disabled:opacity-40 hover:bg-xero-green-dark transition-colors"
                >
                  {t.addReminder}
                </button>
              </div>
            </form>
          )}
        </div>

        {isLoading && <p className="text-sm text-gray-400">Loading…</p>}

        {/* Grouped sections */}
        {renderGroup(t.overdue,  overdue,  'overdue',  'text-red-500',      'bg-red-100 text-red-600')}
        {renderGroup(t.today,    todayGrp, 'today',    'text-xero-green',   'bg-xero-green/10 text-xero-green')}
        {renderGroup(t.upcoming, upcoming, 'upcoming', 'text-blue-500',     'bg-blue-50 text-blue-600')}

        {/* No date */}
        {noDate.length > 0 && (
          <div className="mb-5">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2.5">{t.noDate}</p>
            <div className="space-y-2">
              {noDate.map(r => (
                <div key={r.id} className="flex items-start gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 group hover:shadow-sm transition-shadow">
                  <button
                    onClick={() => toggle(r.id)}
                    className="mt-0.5 flex-shrink-0 w-4 h-4 rounded border-2 border-gray-300 hover:border-xero-green transition-colors"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{r.title}</p>
                    {r.note && <p className="text-xs text-gray-400 mt-0.5">{r.note}</p>}
                  </div>
                  <button
                    onClick={() => setConfirmRemoveId(r.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-base leading-none flex-shrink-0 mt-0.5"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Done */}
        {done.length > 0 && (
          <div className="mt-2 border-t border-gray-100 pt-4">
            <p className="text-[11px] font-bold text-gray-300 uppercase tracking-wide mb-2.5">
              {t.completed} ({done.length})
            </p>
            <div className="space-y-1.5">
              {done.map(r => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl group opacity-50 hover:opacity-100 transition-opacity">
                  <div className="flex-shrink-0 w-4 h-4 rounded bg-xero-green border-2 border-xero-green flex items-center justify-center">
                    <span className="text-white font-bold" style={{ fontSize: 8 }}>✓</span>
                  </div>
                  <p className="text-sm text-gray-500 line-through flex-1">{r.title}</p>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => toggle(r.id)} className="text-[10px] text-gray-400 hover:text-xero-green transition-colors">undo</button>
                    <button onClick={() => setConfirmRemoveId(r.id)} className="p-0.5 text-gray-300 hover:text-red-400 transition-colors rounded"><IconClose className="w-3.5 h-3.5" strokeWidth={2} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pending.length === 0 && done.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📝</p>
            <p className="text-sm font-medium text-gray-600 mb-1">{t.noReminders}</p>
            <p className="text-xs text-gray-400">Click "+ New Reminder" to get started</p>
          </div>
        )}
      </div>
      {confirmRemoveId !== null && (
        <ConfirmDialog
          message="This reminder will be permanently deleted."
          confirmLabel="Delete"
          onConfirm={() => { remove(confirmRemoveId); setConfirmRemoveId(null) }}
          onCancel={() => setConfirmRemoveId(null)}
        />
      )}
    </div>
  )

  if (!standalone) return inner
  return (
    <div className="flex flex-col h-full overflow-hidden bg-xero-bg">
      <header className="flex items-center px-4 md:px-8 py-3 md:py-4 bg-white border-b border-xero-border flex-shrink-0">
        <h1 className="text-lg md:text-xl font-semibold text-gray-900">{t.reminders}</h1>
      </header>
      <div className="flex-1 overflow-hidden">{inner}</div>
    </div>
  )
}

// ─── Shared section shell ─────────────────────────────────────────────────────

interface SectionView {
  path: string
  label: string
  icon: ReactNode
}

function SectionShell({
  title,
  views,
  trackerPaths,
  defaultRedirect,
  children,
  storageKey,
}: {
  title: string
  views: SectionView[]
  trackerPaths: string[]
  defaultRedirect: string
  children: (openSidebar: () => void) => ReactNode
  storageKey: string
}) {
  const { pathname } = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const collapseKey = `sidebar:collapsed:${defaultRedirect}`
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(collapseKey) === '1')

  const isTracker  = trackerPaths.some(p => pathname.startsWith(p))
  const currentLabel = views.find(v => pathname.startsWith(v.path))?.label ?? title

  useEffect(() => {
    if (storageKey) localStorage.setItem(storageKey, pathname)
  }, [pathname, storageKey])

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem(collapseKey, next ? '1' : '0')
  }

  function NavItems({ onNav }: { onNav?: () => void }) {
    return (
      <nav className="flex-1 py-4 overflow-y-auto">
        {views.map(v => (
          <NavLink
            key={v.path}
            to={v.path}
            onClick={onNav}
            title={collapsed ? v.label : undefined}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 text-sm transition-colors text-left border-l-[3px] ${
                collapsed ? 'justify-center px-0 py-3.5' : 'px-6 py-3'
              } ${
                isActive
                  ? 'border-xero-green text-xero-green bg-xero-navy-light'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-xero-navy-light'
              }`
            }
          >
            <span className="flex-shrink-0 w-4 h-4">{v.icon}</span>
            {!collapsed && <span className="font-medium">{v.label}</span>}
          </NavLink>
        ))}
      </nav>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      <aside
        className={`hidden md:flex h-full bg-xero-navy flex-col flex-shrink-0 transition-[width] duration-200 ${
          collapsed ? 'w-14' : 'w-[220px]'
        }`}
      >
        <div className={`border-b border-xero-navy-light flex-shrink-0 ${collapsed ? 'py-5 flex justify-center' : 'px-6 py-5'}`}>
          {collapsed
            ? <span className="text-xero-green font-bold text-sm">•••</span>
            : <p className="text-white font-bold text-lg tracking-tight">{title}</p>
          }
        </div>
        <NavItems />
        <button
          onClick={toggleCollapsed}
          className="flex items-center justify-center py-3 border-t border-xero-navy-light text-gray-500 hover:text-gray-200 transition-colors flex-shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <IconChevronRight className="w-4 h-4" strokeWidth={2} />
            : <IconChevronLeft  className="w-4 h-4" strokeWidth={2} />
          }
        </button>
      </aside>

      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-[220px] h-full bg-xero-navy flex flex-col shadow-2xl">
            <div className="px-6 py-5 border-b border-xero-navy-light">
              <p className="text-white font-bold text-lg tracking-tight">{title}</p>
            </div>
            <NavItems onNav={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-xero-bg">
        {!isTracker && (
          <header className="flex items-center gap-3 px-4 md:px-8 py-4 bg-white border-b border-xero-border flex-shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <IconMenu className="w-5 h-5" strokeWidth={2} />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">{currentLabel}</h1>
          </header>
        )}
        <div className="flex-1 overflow-hidden">
          <Routes>
            {children(() => setSidebarOpen(true))}
            <Route path="*" element={<Navigate to={defaultRedirect} replace />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

// ─── CSV / Auto-link helpers ──────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const cols: string[] = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if (line[i] === ',' && !inQ) {
      cols.push(cur.trim()); cur = ''
    } else {
      cur += line[i]
    }
  }
  cols.push(cur.trim())
  return cols
}

function isWordChar(ch: string | undefined): boolean {
  return ch !== undefined && /\p{L}|\p{N}/u.test(ch)
}

function autoLink(text: string, vocab: VocabCard[], lang: string): WordLink[] {
  if (!text || !vocab.length) return []
  const lower = text.toLowerCase()
  const links: WordLink[] = []
  const candidates = vocab.filter(v => v.language === lang && v.word.trim())
  candidates.sort((a, b) => b.word.length - a.word.length) // longer matches first
  for (const card of candidates) {
    const w = card.word.toLowerCase()
    let idx = lower.indexOf(w)
    while (idx !== -1) {
      const end = idx + w.length
      if (!isWordChar(text[idx - 1]) && !isWordChar(text[end])) {
        links.push({ vocab_id: card.id, word: text.slice(idx, end), start: idx, end })
      }
      idx = lower.indexOf(w, idx + 1)
    }
  }
  return links
}

function mergeLinks(stored: WordLink[], auto: WordLink[]): WordLink[] {
  const result = [...stored]
  for (const al of auto) {
    const overlaps = result.some(l => al.start < l.end && al.end > l.start)
    if (!overlaps) result.push(al)
  }
  return result
}

// ─── WordLinker ───────────────────────────────────────────────────────────────

interface WordLinkerProps {
  text:         string
  links:        WordLink[]
  vocab:        VocabCard[]
  sourceLang:   string
  onAddLink:    (link: WordLink) => void
  onRemoveLink: (vocabId: number, start: number) => void
  readOnly?:    boolean
}

function getSelectionOffsets(container: HTMLElement): { start: number; end: number; text: string } | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null
  const range = sel.getRangeAt(0)
  if (!container.contains(range.commonAncestorContainer)) return null
  const preRange = range.cloneRange()
  preRange.selectNodeContents(container)
  preRange.setEnd(range.startContainer, range.startOffset)
  const start = preRange.toString().length
  const selText = range.toString()
  if (!selText.trim()) return null
  return { start, end: start + selText.length, text: selText }
}

function buildSegments(text: string, links: WordLink[]): { text: string; link?: WordLink }[] {
  const sorted = [...links].sort((a, b) => a.start - b.start)
  const segments: { text: string; link?: WordLink }[] = []
  let cursor = 0
  for (const link of sorted) {
    if (link.start > cursor) segments.push({ text: text.slice(cursor, link.start) })
    segments.push({ text: text.slice(link.start, link.end), link })
    cursor = link.end
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) })
  return segments
}

function WordLinker({ text, links, vocab, sourceLang, onAddLink, onRemoveLink, readOnly }: WordLinkerProps) {
  const { t } = useLanguage()
  const containerRef = useRef<HTMLDivElement>(null)
  const [floatBtn, setFloatBtn] = useState<{ x: number; y: number; start: number; end: number; selText: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [popup, setPopup] = useState<{ link: WordLink; x: number; y: number } | null>(null)
  const { dark } = useDarkMode()

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (floatBtn && !(e.target as Element)?.closest('[data-linker-ui]')) {
        setFloatBtn(null); setShowSearch(false); setSearchQuery('')
      }
      if (popup && !(e.target as Element)?.closest('[data-linker-popup]')) setPopup(null)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [floatBtn, popup])

  function handleMouseUp() {
    if (readOnly || !containerRef.current) return
    const offsets = getSelectionOffsets(containerRef.current)
    if (!offsets) { setFloatBtn(null); return }
    const rect = window.getSelection()!.getRangeAt(0).getBoundingClientRect()
    setFloatBtn({ x: rect.left + rect.width / 2, y: rect.top - 8, start: offsets.start, end: offsets.end, selText: offsets.text })
    setShowSearch(false); setSearchQuery('')
  }

  function handleConfirmLink(card: VocabCard) {
    if (!floatBtn) return
    const overlaps = links.some(l => !(floatBtn.end <= l.start || floatBtn.start >= l.end))
    if (overlaps) { setFloatBtn(null); return }
    onAddLink({ vocab_id: card.id, word: floatBtn.selText, start: floatBtn.start, end: floatBtn.end })
    setFloatBtn(null); setShowSearch(false); setSearchQuery('')
    window.getSelection()?.removeAllRanges()
  }

  function handleSpanClick(e: React.MouseEvent, link: WordLink) {
    e.stopPropagation()
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setPopup({ link, x: rect.left + rect.width / 2, y: rect.top - 8 })
  }

  const segments = buildSegments(text, links)
  const filteredVocab = vocab.filter(c => c.word.toLowerCase().includes(searchQuery.toLowerCase()) || c.translation.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 8)

  return (
    <>
      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        className={`whitespace-pre-wrap break-words leading-relaxed select-text ${readOnly ? '' : 'cursor-text'}`}
      >
        {segments.map((seg, i) => {
          if (!seg.link) return <span key={i}>{seg.text}</span>
          const card = vocab.find(c => c.id === seg.link!.vocab_id)
          const dangling = !card
          return (
            <span
              key={i}
              onClick={e => handleSpanClick(e, seg.link!)}
              className={`cursor-pointer rounded px-0.5 ${dangling ? 'line-through text-gray-400 dark:text-slate-500' : 'underline decoration-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'}`}
              title={dangling ? 'Vocabulary entry deleted' : card.translation}
            >
              {seg.text}
            </span>
          )
        })}
      </div>

      {/* Floating link button */}
      {floatBtn && !readOnly && (
        <div data-linker-ui className="fixed z-50" style={{ left: floatBtn.x, top: floatBtn.y, transform: 'translate(-50%, -100%)' }}>
          {!showSearch ? (
            <button
              onClick={() => setShowSearch(true)}
              className="text-xs bg-gray-900 text-white px-2.5 py-1.5 rounded-lg shadow-lg hover:bg-gray-700 transition-colors"
            >
              🔗 {t.linkToVocab}
            </button>
          ) : (
            <div className={`rounded-xl shadow-xl border p-2 w-56 ${dark ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'}`}>
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t.searchVocab}
                className={`text-xs w-full px-2 py-1.5 rounded-lg border mb-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 ${dark ? 'bg-slate-700 border-slate-500 text-slate-100' : 'border-gray-200'}`}
              />
              {filteredVocab.length === 0 ? (
                <p className="text-xs text-gray-400 px-1 py-1">{t.searchVocab}</p>
              ) : (
                <div className="space-y-0.5 max-h-40 overflow-y-auto">
                  {filteredVocab.map(card => (
                    <button
                      key={card.id}
                      onClick={() => handleConfirmLink(card)}
                      className={`w-full text-left text-xs px-2 py-1.5 rounded-lg transition-colors ${dark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-gray-50 text-gray-700'}`}
                    >
                      <span className="font-medium">{card.word}</span>
                      <span className={`ml-1.5 ${dark ? 'text-slate-400' : 'text-gray-400'}`}>{card.translation}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Linked word popup */}
      {popup && (() => {
        const card = vocab.find(c => c.id === popup.link.vocab_id)
        return (
          <div
            data-linker-popup
            className={`fixed z-50 rounded-xl shadow-xl border p-3 w-52 ${dark ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'}`}
            style={{ left: popup.x, top: popup.y, transform: 'translate(-50%, -100%)' }}
          >
            {card ? (
              <>
                <p className={`text-sm font-semibold mb-0.5 ${dark ? 'text-slate-100' : 'text-gray-800'}`}>{card.word}</p>
                <p className={`text-xs mb-2 ${dark ? 'text-slate-300' : 'text-gray-500'}`}>{card.translation}</p>
                <div className="flex gap-2">
                  <button onClick={() => speak(card.word, sourceLang)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">🔊</button>
                  <button
                    onClick={() => { onRemoveLink(popup.link.vocab_id, popup.link.start); setPopup(null) }}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors ml-auto"
                  >✕</button>
                </div>
              </>
            ) : (
              <div>
                <p className="text-xs text-gray-400 line-through mb-1">{popup.link.word}</p>
                <button onClick={() => { onRemoveLink(popup.link.vocab_id, popup.link.start); setPopup(null) }} className="text-xs text-red-400">✕ Remove</button>
              </div>
            )}
          </div>
        )
      })()}
    </>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const PALACE_SUGGESTIONS = [
  'At the bakery', 'At a restaurant', 'At work', 'Job interview',
  'Shopping', 'Doctor visit', 'On the phone', 'Travel / Airport',
  'Morning commute', 'At school / University', 'Meeting', 'At home',
]

function isDueSR(dateStr: string): boolean {
  return dateStr <= new Date().toISOString().slice(0, 10)
}

function nextReviewLabel(dateStr: string): string {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  if (diff <= 0) return 'Due now'
  if (diff === 1) return 'Tomorrow'
  return `In ${diff}d`
}

// ─── Review Session (shared by sentence + scenario) ───────────────────────────

type ReviewItem = { id: number; front: string; back: string | null; palace: string | null }
type ReviewQuality = 1 | 3 | 5   // again | good | easy

function ReviewSession({
  items, onRate, onDone, allowTyping = false,
}: { items: ReviewItem[]; onRate: (id: number, q: ReviewQuality) => Promise<void>; onDone: () => void; allowTyping?: boolean }) {
  const [idx, setIdx]               = useState(0)
  const [revealed, setRevealed]     = useState(false)
  const [loading, setLoading]       = useState(false)
  const [reviewed, setReviewed]     = useState(0)
  const [typeMode, setTypeMode]     = useState(false)
  const [answer, setAnswer]         = useState('')
  const [answerResult, setAnswerResult] = useState<{ correct: boolean; pct: number } | null>(null)
  const answerRef = useRef<HTMLInputElement>(null)

  const current = items[idx]

  useEffect(() => {
    if (typeMode) answerRef.current?.focus()
  }, [typeMode, idx])

  if (!current) return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <p className="text-4xl">🎉</p>
      <p className="text-base font-semibold text-gray-800 dark:text-slate-100">Review complete!</p>
      <p className="text-sm text-gray-400 dark:text-slate-500">{reviewed} of {items.length} reviewed</p>
      <button onClick={onDone} className="mt-2 px-6 py-2 bg-xero-green text-white rounded-xl text-sm font-medium hover:bg-xero-green-dark transition-colors">
        Done
      </button>
    </div>
  )

  async function rate(q: ReviewQuality) {
    setLoading(true)
    await onRate(current.id, q)
    setReviewed(r => r + 1)
    setIdx(i => i + 1)
    setRevealed(false)
    setAnswer('')
    setAnswerResult(null)
    setLoading(false)
  }

  function submitAnswer() {
    if (!answer.trim() || !current.back || answerResult || loading) return
    const pct = strSimilarity(answer, current.back)
    const correct = pct >= 0.9
    setAnswerResult({ correct, pct })
    setTimeout(() => rate(correct ? 5 : 1), 1500)
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 dark:text-slate-500">{idx + 1} / {items.length}</span>
        <div className="flex items-center gap-2">
          {allowTyping && (
            <button
              onClick={() => { setTypeMode(m => !m); setAnswer(''); setAnswerResult(null); setRevealed(false) }}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${typeMode ? 'bg-gray-900 dark:bg-slate-200 text-white dark:text-slate-900' : 'text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
            >
              ⌨️ Type
            </button>
          )}
          <button onClick={onDone} className="text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">Exit review</button>
        </div>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-xero-green rounded-full transition-all duration-300" style={{ width: `${(idx / items.length) * 100}%` }} />
      </div>

      {/* Card */}
      <div className="rounded-2xl border bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 p-6 space-y-4 min-h-[200px]">
        {current.palace && (
          <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2.5 py-1 rounded-full">
            <span>🏛️</span><span>{current.palace}</span>
          </div>
        )}

        <p className="text-lg font-semibold text-gray-900 dark:text-slate-100 leading-relaxed">{current.front}</p>

        {typeMode ? (
          answerResult ? (
            <div className={`rounded-xl p-3.5 ${answerResult.correct ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
              <p className={`text-sm font-bold ${answerResult.correct ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {answerResult.correct ? `✓ Correct  ${Math.round(answerResult.pct * 100)}%` : `✗ Wrong  ${Math.round(answerResult.pct * 100)}%`}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1.5">
                Answer: <span className="font-medium text-gray-800 dark:text-slate-200">{current.back}</span>
              </p>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                ref={answerRef}
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitAnswer() }}
                placeholder="Type your answer…"
                disabled={loading}
                className="flex-1 text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2.5 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-xero-green/30 focus:border-xero-green"
              />
              <button
                onClick={submitAnswer}
                disabled={!answer.trim() || loading}
                className="px-4 py-2.5 bg-xero-green text-white rounded-xl text-sm font-semibold hover:bg-xero-green-dark disabled:opacity-40 transition-colors"
              >
                Check
              </button>
            </div>
          )
        ) : !revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="w-full py-2.5 text-sm font-medium rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-600 text-gray-400 dark:text-slate-500 hover:border-xero-green hover:text-xero-green transition-colors"
          >
            Show translation →
          </button>
        ) : (
          <div className="space-y-4">
            <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
              <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">{current.back ?? '—'}</p>
            </div>
            <div className="flex gap-2 pt-1">
              {[
                { q: 1, label: 'Again', cls: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30',       tip: 'Failed. Resets to 1 day — you\'ll see it again soon.' },
                { q: 3, label: 'Hard',  cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30', tip: 'Recalled with difficulty. Small interval advance.' },
                { q: 5, label: 'Easy',  cls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30', tip: 'Recalled instantly. Longer interval + easier factor.' },
              ].map(({ q, label, cls, tip }) => (
                <RateTooltip key={q} text={tip}>
                  <button onClick={() => rate(q as ReviewQuality)} disabled={loading}
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 ${cls}`}>
                    {label}
                  </button>
                </RateTooltip>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

// ─── SentenceView ─────────────────────────────────────────────────────────────

function SentenceView() {
  const { t } = useLanguage()
  const { dark } = useDarkMode()
  const { sentences, isLoading, createSentence, saveSentence, reviewSentence, deleteSentence, bulkImportSentences, moveSentenceToFolder, renameSentenceFolder, deleteSentenceFolder } = useLanguageSentences()
  const { vocab } = useVocabulary()
  const [sentParams, setSentParams] = useSearchParams()
  const editingId = sentParams.get('sentence') ? Number(sentParams.get('sentence')) : null
  function setEditingId(id: number | null) {
    setSentParams(p => { id !== null ? p.set('sentence', String(id)) : p.delete('sentence'); return p })
  }
  const [draft, setDraft]           = useState<Partial<LanguageSentence>>({})
  const [translating, setTranslating] = useState(false)
  const [translateResult, setTranslateResult] = useState<{ translation: string; alternatives: string[] } | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<string | null>(null)
  const [reviewMode, setReviewMode]   = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [sentImportMsg, setSentImportMsg] = useState<string | null>(null)
  const sentCsvRef = useRef<HTMLInputElement>(null)
  const [sentCsvTooltipOpen, setSentCsvTooltipOpen] = useState(false)
  const sentCsvTooltipRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!sentCsvTooltipOpen) return
    function h(e: MouseEvent) { if (!sentCsvTooltipRef.current?.contains(e.target as Node)) setSentCsvTooltipOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [sentCsvTooltipOpen])

  async function handleSentCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const lines = (await file.text()).trim().split('\n').filter(Boolean)
    const isHeader = /source_text|sentence/i.test(lines[0] ?? '')
    const rows = isHeader ? lines.slice(1) : lines
    const items = rows.map(row => {
      const cols = parseCSVLine(row)
      return { source_text: cols[0] ?? '', translation: cols[1] || undefined, source_lang: cols[2] || 'de', target_lang: cols[3] || 'tr' }
    }).filter(i => i.source_text)
    if (!items.length) { setSentImportMsg('No valid rows.'); return }
    const n = await bulkImportSentences(items)
    setSentImportMsg(`Imported ${n} sentence${n !== 1 ? 's' : ''}.`)
    setTimeout(() => setSentImportMsg(null), 4000)
    e.target.value = ''
  }

  const [singleReviewItem, setSingleReviewItem] = useState<LanguageSentence | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false)
  const [sentSearch, setSentSearch] = useState('')

  const sentTree = buildFolderTree(sentences)
  const dueItems = sentences.filter(s => isDueSR(s.due_at))
  const activeSentence = sentences.find(s => s.id === editingId) ?? null
  const scopedSentences = getItemsInFolder(sentTree, selectedFolder)
  const sq = sentSearch.trim().toLowerCase()
  const listSentences = sq ? scopedSentences.filter(s => [s.source_text, s.translation ?? ''].some(v => v.toLowerCase().includes(sq))) : scopedSentences
  const sentScopeLabel = selectedFolder === null ? 'All Sentences' : selectedFolder === '' ? 'Unsorted' : selectedFolder

  async function handleNew(folder: string | null = null) {
    const s = await createSentence()
    if (folder) await moveSentenceToFolder(s.id, folder)
    setDraft({ ...s, folder: folder ?? s.folder })
    setEditingId(s.id)
    setTranslateResult(null)
  }

  function openEdit(s: LanguageSentence) {
    setDraft({ ...s })
    setEditingId(s.id)
    setTranslateResult(null)
  }

  // Deep-link support: Memory Palace's "Go to linked item" navigates here with
  // ?highlight=<id> — open that sentence's edit panel directly, regardless of folder.
  const [highlightParams, setHighlightParams] = useSearchParams()
  useEffect(() => {
    const hi = highlightParams.get('highlight')
    if (!hi) return
    const s = sentences.find(s => s.id === Number(hi))
    if (s) {
      openEdit(s)
      setHighlightParams(p => { p.delete('highlight'); return p }, { replace: true })
    }
  }, [highlightParams, sentences]) // eslint-disable-line react-hooks/exhaustive-deps

  function scheduleSave(id: number, patch: Partial<LanguageSentence>) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveSentence(id, patch), 800)
  }

  async function handleTranslate() {
    if (!draft.source_text?.trim()) return
    setTranslating(true); setTranslateResult(null)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: draft.source_text, sourceLang: draft.source_lang, targetLang: draft.target_lang }),
      })
      if (res.ok) {
        const data = await res.json() as { translation: string; alternatives: string[] }
        setDraft(d => ({ ...d, translation: data.translation }))
        setTranslateResult(data)
        if (editingId) scheduleSave(editingId, { translation: data.translation })
      }
    } finally { setTranslating(false) }
  }

  function handleAddLink(link: WordLink) {
    const links = [...(draft.word_links ?? []), link]
    setDraft(d => ({ ...d, word_links: links }))
    if (editingId) saveSentence(editingId, { word_links: links })
  }

  function handleRemoveLink(vocabId: number, start: number) {
    const links = (draft.word_links ?? []).filter(l => !(l.vocab_id === vocabId && l.start === start))
    setDraft(d => ({ ...d, word_links: links }))
    if (editingId) saveSentence(editingId, { word_links: links })
  }

  const inputCls = `text-sm border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-blue-400 ${dark ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400' : 'border-gray-200'}`

  // Detail-pane edit form — every field autosaves, there's no separate Save/Cancel.
  function editFormFields() {
    if (editingId === null) return null
    return (
      <div className="space-y-2">
        <textarea
          autoFocus
          value={draft.source_text ?? ''}
          onChange={e => {
            const v = e.target.value
            setDraft(d => ({ ...d, source_text: v }))
            scheduleSave(editingId, { source_text: v })
          }}
          placeholder="Ich laufe jeden Tag…"
          rows={2}
          className={inputCls + ' resize-none'}
        />
        <div className="flex gap-2 items-center">
          <input
            value={draft.translation ?? ''}
            onChange={e => {
              const v = e.target.value
              setDraft(d => ({ ...d, translation: v }))
              scheduleSave(editingId, { translation: v })
            }}
            placeholder={t.translation}
            className={inputCls + ' flex-1'}
          />
          <button onClick={handleTranslate} disabled={translating} className="text-xs px-2.5 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 flex-shrink-0">
            {translating ? '…' : '🌐'}
          </button>
        </div>
        {translateResult && translateResult.alternatives.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {translateResult.alternatives.map((alt, i) => (
              <button key={i} type="button" onClick={() => { setDraft(d => ({ ...d, translation: alt })); scheduleSave(editingId, { translation: alt }) }}
                className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-100 dark:border-blue-800/50">{alt}</button>
            ))}
          </div>
        )}
        {/* Memory palace field */}
        <div className="flex items-center gap-2">
          <span className="text-sm flex-shrink-0">🏛️</span>
          <input
            value={draft.memory_palace ?? ''}
            onChange={e => {
              const v = e.target.value || null
              setDraft(d => ({ ...d, memory_palace: v }))
              scheduleSave(editingId, { memory_palace: v })
            }}
            placeholder="Memory palace — where will you use this? (optional)"
            list="palace-suggestions"
            className={inputCls}
          />
        </div>
        <div className="flex gap-2 text-xs">
          <select value={draft.source_lang ?? 'de'} onChange={e => { const v = e.target.value; setDraft(d => ({ ...d, source_lang: v })); saveSentence(editingId, { source_lang: v }) }}
            className={`border rounded-lg px-2 py-1.5 ${dark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'border-gray-200'}`}>
            {LANGS.map(l => <option key={l} value={l}>{LANG_LABELS[l]}</option>)}
          </select>
          <span className="text-gray-400 self-center">→</span>
          <select value={draft.target_lang ?? 'tr'} onChange={e => { const v = e.target.value; setDraft(d => ({ ...d, target_lang: v })); saveSentence(editingId, { target_lang: v }) }}
            className={`border rounded-lg px-2 py-1.5 ${dark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'border-gray-200'}`}>
            {LANGS.map(l => <option key={l} value={l}>{LANG_LABELS[l]}</option>)}
          </select>
        </div>
        {draft.source_text && (
          <div className={`rounded-xl p-3 text-sm ${dark ? 'bg-slate-700' : 'bg-gray-50'}`}>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">{t.linkToVocab}</p>
            <WordLinker
              text={draft.source_text}
              links={draft.word_links ?? []}
              vocab={vocab}
              sourceLang={draft.source_lang ?? 'de'}
              onAddLink={handleAddLink}
              onRemoveLink={handleRemoveLink}
            />
          </div>
        )}
      </div>
    )
  }

  if (singleReviewItem) {
    return (
      <ReviewSession
        items={[{ id: singleReviewItem.id, front: singleReviewItem.source_text, back: singleReviewItem.translation, palace: singleReviewItem.memory_palace }]}
        onRate={async (id, q) => { await reviewSentence(id, q) }}
        onDone={() => setSingleReviewItem(null)}
        allowTyping
      />
    )
  }

  if (reviewMode) {
    return (
      <ReviewSession
        items={dueItems.map(s => ({ id: s.id, front: s.source_text, back: s.translation, palace: s.memory_palace }))}
        onRate={async (id, q) => { await reviewSentence(id, q) }}
        onDone={() => setReviewMode(false)}
        allowTyping
      />
    )
  }

  function TreePane() {
    return (
      <div className="flex-1 overflow-y-auto flex flex-col">
        <div className="p-2 space-y-0.5 border-b border-gray-100 dark:border-slate-700 flex-shrink-0">
          <button onClick={() => { setSelectedFolder(null); setMobileTreeOpen(false) }}
            className={`w-full text-left text-xs px-2 py-2 rounded-lg transition-colors flex items-center ${isTouch ? 'min-h-[44px]' : ''} ${selectedFolder === null ? 'bg-xero-green/10 dark:bg-xero-green/20 text-xero-green font-medium' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
            All Sentences
          </button>
          <button onClick={() => { setSelectedFolder(''); setMobileTreeOpen(false) }}
            className={`w-full text-left text-xs px-2 py-2 rounded-lg transition-colors flex items-center ${isTouch ? 'min-h-[44px]' : ''} ${selectedFolder === '' ? 'bg-xero-green/10 dark:bg-xero-green/20 text-xero-green font-medium' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
            Unsorted
          </button>
        </div>
        <ItemFolderTree<LanguageSentence>
          tree={sentTree}
          selectedId={null}
          showItems={false}
          selectedFolder={selectedFolder}
          onSelectFolder={path => { setSelectedFolder(path); setMobileTreeOpen(false) }}
          itemLabel={s => s.source_text || t.untitled}
          newItemLabel={`+ ${t.addSentence}`}
          onSelectItem={() => {}}
          onNewItem={handleNew}
          onRenameFolder={renameSentenceFolder}
          onDeleteFolder={path => setConfirmDeleteFolder(path)}
          onMoveItemToFolder={(id, folder) => moveSentenceToFolder(id, folder)}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      <datalist id="palace-suggestions">
        {PALACE_SUGGESTIONS.map(p => <option key={p} value={p} />)}
      </datalist>

      {/* Folder tree column — desktop permanent, mobile overlay */}
      <div className="hidden md:flex w-44 flex-shrink-0 flex-col border-r border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
        <TreePane />
      </div>
      {mobileTreeOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileTreeOpen(false)} />
          <div className="relative w-64 h-full bg-gray-50 dark:bg-slate-900 flex flex-col shadow-2xl">
            <TreePane />
          </div>
        </div>
      )}

      {/* Item list column */}
      <div className={`${editingId !== null ? 'hidden md:flex' : 'flex'} w-full md:w-72 border-r border-gray-100 dark:border-slate-700 flex-col bg-white dark:bg-slate-900/50 flex-shrink-0`}>
        <div className="flex items-center gap-1.5 px-2 py-2 border-b border-gray-100 dark:border-slate-700 flex-shrink-0">
          <button onClick={() => setMobileTreeOpen(true)}
            className="md:hidden text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors p-2 -m-1 min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0">
            <IconMenu className="w-4 h-4" strokeWidth={2} />
          </button>
          <span className="text-xs font-semibold text-gray-700 dark:text-slate-200 truncate flex-1">{sentScopeLabel}</span>
          {dueItems.length > 0 && (
            <button
              onClick={() => setReviewMode(true)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-violet-500 text-white hover:bg-violet-600 transition-colors flex items-center gap-1 flex-shrink-0"
            >
              🏛️ {dueItems.length} due
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 px-2 pt-2 flex-shrink-0">
          <div className="relative flex-1 min-w-0">
            <input
              value={sentSearch}
              onChange={e => setSentSearch(e.target.value)}
              placeholder="Search…"
              className="w-full text-xs border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 pr-7 focus:outline-none focus:ring-1 focus:ring-xero-green bg-white dark:bg-slate-800 dark:text-slate-100 placeholder-gray-400"
            />
            {sentSearch && (
              <button onClick={() => setSentSearch('')} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 p-2">
                <IconClose className="w-3 h-3" strokeWidth={2} />
              </button>
            )}
          </div>
          <button onClick={() => handleNew(selectedFolder)} title={t.addSentence}
            className={`text-gray-400 hover:text-xero-green transition-colors p-2 -m-0.5 flex-shrink-0 flex items-center justify-center ${isTouch ? 'min-w-[44px] min-h-[44px]' : ''}`}>
            <IconAdd className="w-4 h-4" strokeWidth={2.5} />
          </button>
          <div className="relative flex-shrink-0" ref={sentCsvTooltipRef}>
            <button
              onClick={() => { if (isTouch && !sentCsvTooltipOpen) { setSentCsvTooltipOpen(true); return } sentCsvRef.current?.click() }}
              onMouseEnter={() => setSentCsvTooltipOpen(true)}
              onMouseLeave={() => setSentCsvTooltipOpen(false)}
              className={`text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors p-2 -m-0.5 flex items-center justify-center ${isTouch ? 'min-w-[44px] min-h-[44px]' : ''}`}
              title="Import CSV"
            >
              <IconUpload className="w-4 h-4" strokeWidth={2} />
            </button>
            {sentCsvTooltipOpen && (
              <div className="absolute top-full right-0 mt-2 z-50 w-72 max-w-[calc(100vw-2rem)] pointer-events-none">
                <div className="bg-gray-900 text-white rounded-xl shadow-2xl p-3 text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">CSV Format</p>
                  <code className="block bg-black/30 rounded-lg px-2.5 py-2 text-[11px] font-mono text-green-300 leading-relaxed whitespace-pre">{`source_text,translation,source_lang,target_lang\nIch laufe jeden Tag.,I run every day.,de,en\nDaijoubu desu.,I'm fine.,ja,en`}</code>
                  <div className="mt-2 space-y-0.5">
                    <p className="text-[10px] text-gray-300"><span className="text-white font-medium">source_text</span> — required</p>
                    <p className="text-[10px] text-gray-300"><span className="text-white font-medium">translation</span> — optional</p>
                    <p className="text-[10px] text-gray-300"><span className="text-white font-medium">source_lang / target_lang</span> — <code className="text-green-300">de</code> / <code className="text-green-300">en</code> / <code className="text-green-300">tr</code> / <code className="text-green-300">ja</code></p>
                  </div>
                  <div className="absolute bottom-full right-4 border-4 border-transparent border-b-gray-900" />
                </div>
              </div>
            )}
          </div>
          <input ref={sentCsvRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleSentCsvImport} />
        </div>

        {sentImportMsg && <p className="text-xs text-xero-green font-medium px-3 pt-1.5">{sentImportMsg}</p>}

        <div className="flex-1 overflow-y-auto py-1 px-1 mt-1">
          {isLoading ? (
            <p className="text-xs text-gray-400 p-4">Loading…</p>
          ) : listSentences.length === 0 ? (
            <p className="text-xs text-gray-400 px-3 py-3">{sentSearch.trim() ? 'No sentences found' : 'No sentences here yet.'}</p>
          ) : (
            listSentences.map(s => (
              <div
                key={s.id}
                onClick={() => openEdit(s)}
                className={`flex items-center gap-1.5 py-2 pr-1 pl-2 rounded-lg cursor-pointer ${isTouch ? 'min-h-[44px]' : ''} ${editingId === s.id ? 'bg-xero-green/10 dark:bg-xero-green/20' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`}
              >
                <IconMessage className="w-3.5 h-3.5 flex-shrink-0 text-gray-400 dark:text-slate-500" strokeWidth={1.75} />
                <span className={`text-xs flex-1 truncate ${editingId === s.id ? 'text-xero-green font-medium' : 'text-gray-600 dark:text-slate-400'}`}>{s.source_text || t.untitled}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail / edit pane */}
      <div className={`${editingId === null ? 'hidden md:flex' : 'flex'} flex-1 flex-col overflow-y-auto`}>
      {editingId !== null && activeSentence ? (
      <div className="p-4 max-w-2xl mx-auto space-y-3 w-full">
        <button onClick={() => setEditingId(null)}
          className="md:hidden text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors -ml-3 p-3 min-w-[44px] min-h-[44px] flex items-center">
          ← {t.sentence}
        </button>

        {editFormFields()}

        {/* Due status */}
        <div className="flex items-center justify-between">
          <span className={`text-[10px] rounded-full px-2 py-0.5 font-medium ${isDueSR(activeSentence.due_at) ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : 'bg-gray-50 dark:bg-slate-700 text-gray-400 dark:text-slate-500'}`}>
            {isDueSR(activeSentence.due_at) ? '⚡ Due for review' : `Next review: ${nextReviewLabel(activeSentence.due_at)}`}
          </span>
          <div className="flex items-center gap-3">
            <button onClick={() => setSingleReviewItem(activeSentence)} className="text-xs text-violet-500 hover:text-violet-700 dark:hover:text-violet-300 transition-colors">Review</button>
            <button onClick={() => setConfirmDeleteId(activeSentence.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">{t.delete}</button>
          </div>
        </div>

        {confirmDeleteId !== null && (
          <ConfirmDialog
            message="Delete this sentence?"
            onConfirm={async () => { if (confirmDeleteId !== null) { await deleteSentence(confirmDeleteId); if (editingId === confirmDeleteId) setEditingId(null); setConfirmDeleteId(null) } }}
            onCancel={() => setConfirmDeleteId(null)}
          />
        )}
      </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {editingId !== null && (
            <button onClick={() => setEditingId(null)}
              className="md:hidden self-start text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors p-3 -ml-1 mt-1 min-w-[44px] min-h-[44px] flex items-center">
              ← {t.sentence}
            </button>
          )}
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm px-6 text-center">
            {isLoading ? 'Loading…' : 'Select or create a sentence to get started.'}
          </div>
        </div>
      )}
      </div>

      {confirmDeleteFolder !== null && (
        <ConfirmDialog
          message={`Delete folder "${confirmDeleteFolder}" and all sentences inside?`}
          confirmLabel="Delete"
          onConfirm={async () => { await deleteSentenceFolder(confirmDeleteFolder); setConfirmDeleteFolder(null) }}
          onCancel={() => setConfirmDeleteFolder(null)}
        />
      )}
    </div>
  )
}

// ─── ScenarioView ─────────────────────────────────────────────────────────────

function ScenarioView() {
  const { t } = useLanguage()
  const { dark } = useDarkMode()
  const { scenarios, isLoading, createScenario, saveScenario, reviewScenario, deleteScenario, bulkImportScenarios, moveScenarioToFolder, renameScenarioFolder, deleteScenarioFolder } = useLanguageScenarios()
  const { vocab } = useVocabulary()
  const [scenParams, setScenParams] = useSearchParams()
  const activeId = scenParams.get('scenario') ? Number(scenParams.get('scenario')) : null
  function setActiveId(id: number | null) {
    setScenParams(p => { id !== null ? p.set('scenario', String(id)) : p.delete('scenario'); return p })
  }
  const [draft, setDraft]               = useState<Partial<LanguageScenario>>({})
  const [isEditingContent, setIsEditingContent] = useState(false)
  const [translating, setTranslating]   = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<string | null>(null)
  const [reviewMode, setReviewMode]     = useState(false)
  const titleTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [scenImportMsg, setScenImportMsg] = useState<string | null>(null)
  const scenCsvRef = useRef<HTMLInputElement>(null)
  const [scenCsvTooltipOpen, setScenCsvTooltipOpen] = useState(false)
  const scenCsvTooltipRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!scenCsvTooltipOpen) return
    function h(e: MouseEvent) { if (!scenCsvTooltipRef.current?.contains(e.target as Node)) setScenCsvTooltipOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [scenCsvTooltipOpen])

  async function handleScenCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const lines = (await file.text()).trim().split('\n').filter(Boolean)
    const isHeader = /title|scenario/i.test(lines[0] ?? '')
    const rows = isHeader ? lines.slice(1) : lines
    const items = rows.map(row => {
      const cols = parseCSVLine(row)
      return { title: cols[0] ?? '', content: cols[1] || undefined, source_lang: cols[2] || 'de', target_lang: cols[3] || 'tr' }
    }).filter(i => i.title)
    if (!items.length) { setScenImportMsg('No valid rows.'); return }
    const n = await bulkImportScenarios(items)
    setScenImportMsg(`Imported ${n} scenario${n !== 1 ? 's' : ''}.`)
    setTimeout(() => setScenImportMsg(null), 4000)
    e.target.value = ''
  }

  const [singleReviewItem, setSingleReviewItem] = useState<LanguageScenario | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false)
  const [scenSearch, setScenSearch] = useState('')

  const scenTree = buildFolderTree(scenarios)
  const active   = scenarios.find(s => s.id === activeId) ?? null
  const dueItems = scenarios.filter(s => isDueSR(s.due_at))
  const scopedScenarios = getItemsInFolder(scenTree, selectedFolder)
  const scq = scenSearch.trim().toLowerCase()
  const listScenarios = scq ? scopedScenarios.filter(s => [s.title, s.content ?? ''].some(v => v.toLowerCase().includes(scq))) : scopedScenarios
  const scenScopeLabel = selectedFolder === null ? 'All Scenarios' : selectedFolder === '' ? 'Unsorted' : selectedFolder

  async function handleNew(folder: string | null = null) {
    const s = await createScenario()
    if (folder) await moveScenarioToFolder(s.id, folder)
    setDraft({ ...s, folder: folder ?? s.folder })
    setActiveId(s.id)
    setIsEditingContent(true)
  }

  function openScenario(s: LanguageScenario) {
    setDraft({ ...s })
    setActiveId(s.id)
    setIsEditingContent(false)
  }

  // Deep-link support: Memory Palace's "Go to linked item" navigates here with
  // ?highlight=<id> — open that scenario directly, regardless of folder.
  const [highlightParams, setHighlightParams] = useSearchParams()
  useEffect(() => {
    const hi = highlightParams.get('highlight')
    if (!hi) return
    const s = scenarios.find(s => s.id === Number(hi))
    if (s) {
      openScenario(s)
      setHighlightParams(p => { p.delete('highlight'); return p }, { replace: true })
    }
  }, [highlightParams, scenarios]) // eslint-disable-line react-hooks/exhaustive-deps

  function scheduleTitle(id: number, title: string) {
    if (titleTimer.current) clearTimeout(titleTimer.current)
    titleTimer.current = setTimeout(() => saveScenario(id, { title }), 800)
  }

  function scheduleContent(id: number, content: string) {
    if (contentTimer.current) clearTimeout(contentTimer.current)
    contentTimer.current = setTimeout(() => saveScenario(id, { content }), 1200)
  }

  async function handleTranslate() {
    if (!draft.content?.trim() || !activeId) return
    setTranslating(true)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: draft.content.slice(0, 500), sourceLang: draft.source_lang, targetLang: draft.target_lang }),
      })
      if (res.ok) {
        const data = await res.json() as { translation: string }
        alert(data.translation)
      }
    } finally { setTranslating(false) }
  }

  function handleAddLink(link: WordLink) {
    if (!activeId) return
    const links = [...(draft.word_links ?? []), link]
    setDraft(d => ({ ...d, word_links: links }))
    saveScenario(activeId, { word_links: links })
  }

  function handleRemoveLink(vocabId: number, start: number) {
    if (!activeId) return
    const links = (draft.word_links ?? []).filter(l => !(l.vocab_id === vocabId && l.start === start))
    setDraft(d => ({ ...d, word_links: links }))
    saveScenario(activeId, { word_links: links })
  }

  // ── Review mode ──────────────────────────────────────────────────────────────
  if (singleReviewItem) {
    return (
      <ReviewSession
        items={[{ id: singleReviewItem.id, front: singleReviewItem.title, back: singleReviewItem.content || null, palace: singleReviewItem.memory_palace }]}
        onRate={async (id, q) => { await reviewScenario(id, q) }}
        onDone={() => setSingleReviewItem(null)}
      />
    )
  }

  if (reviewMode) {
    return (
      <ReviewSession
        items={dueItems.map(s => ({ id: s.id, front: s.title, back: s.content || null, palace: s.memory_palace }))}
        onRate={async (id, q) => { await reviewScenario(id, q) }}
        onDone={() => setReviewMode(false)}
      />
    )
  }

  function TreePane() {
    return (
      <div className="flex-1 overflow-y-auto flex flex-col">
        <div className="p-2 space-y-0.5 border-b border-gray-100 dark:border-slate-700 flex-shrink-0">
          <button onClick={() => { setSelectedFolder(null); setMobileTreeOpen(false) }}
            className={`w-full text-left text-xs px-2 py-2 rounded-lg transition-colors flex items-center ${isTouch ? 'min-h-[44px]' : ''} ${selectedFolder === null ? 'bg-xero-green/10 dark:bg-xero-green/20 text-xero-green font-medium' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
            All Scenarios
          </button>
          <button onClick={() => { setSelectedFolder(''); setMobileTreeOpen(false) }}
            className={`w-full text-left text-xs px-2 py-2 rounded-lg transition-colors flex items-center ${isTouch ? 'min-h-[44px]' : ''} ${selectedFolder === '' ? 'bg-xero-green/10 dark:bg-xero-green/20 text-xero-green font-medium' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}>
            Unsorted
          </button>
        </div>
        <ItemFolderTree<LanguageScenario>
          tree={scenTree}
          selectedId={null}
          showItems={false}
          selectedFolder={selectedFolder}
          onSelectFolder={path => { setSelectedFolder(path); setMobileTreeOpen(false) }}
          itemLabel={s => s.title || t.untitled}
          newItemLabel={`+ ${t.addScenario}`}
          onSelectItem={() => {}}
          onNewItem={handleNew}
          onRenameFolder={renameScenarioFolder}
          onDeleteFolder={path => setConfirmDeleteFolder(path)}
          onMoveItemToFolder={(id, folder) => moveScenarioToFolder(id, folder)}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      <datalist id="palace-suggestions">
        {PALACE_SUGGESTIONS.map(p => <option key={p} value={p} />)}
      </datalist>

      {/* Folder tree column — desktop permanent, mobile overlay */}
      <div className="hidden md:flex w-44 flex-shrink-0 flex-col border-r border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
        <TreePane />
      </div>
      {mobileTreeOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileTreeOpen(false)} />
          <div className="relative w-64 h-full bg-gray-50 dark:bg-slate-900 flex flex-col shadow-2xl">
            <TreePane />
          </div>
        </div>
      )}

      {/* Item list column */}
      <div className={`${activeId !== null ? 'hidden md:flex' : 'flex'} w-full md:w-72 border-r border-gray-100 dark:border-slate-700 flex-col bg-white dark:bg-slate-900/50 flex-shrink-0`}>
        <div className="flex items-center gap-1.5 px-2 py-2 border-b border-gray-100 dark:border-slate-700 flex-shrink-0">
          <button onClick={() => setMobileTreeOpen(true)}
            className="md:hidden text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors p-2 -m-1 min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0">
            <IconMenu className="w-4 h-4" strokeWidth={2} />
          </button>
          <span className="text-xs font-semibold text-gray-700 dark:text-slate-200 truncate flex-1">{scenScopeLabel}</span>
          {dueItems.length > 0 && (
            <button
              onClick={() => setReviewMode(true)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-violet-500 text-white hover:bg-violet-600 transition-colors flex items-center gap-1 flex-shrink-0"
            >
              🏛️ {dueItems.length} due
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 px-2 pt-2 flex-shrink-0">
          <div className="relative flex-1 min-w-0">
            <input
              value={scenSearch}
              onChange={e => setScenSearch(e.target.value)}
              placeholder="Search…"
              className="w-full text-xs border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 pr-7 focus:outline-none focus:ring-1 focus:ring-xero-green bg-white dark:bg-slate-800 dark:text-slate-100 placeholder-gray-400"
            />
            {scenSearch && (
              <button onClick={() => setScenSearch('')} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 p-2">
                <IconClose className="w-3 h-3" strokeWidth={2} />
              </button>
            )}
          </div>
          <button onClick={() => handleNew(selectedFolder)} title={t.addScenario}
            className={`text-gray-400 hover:text-xero-green transition-colors p-2 -m-0.5 flex-shrink-0 flex items-center justify-center ${isTouch ? 'min-w-[44px] min-h-[44px]' : ''}`}>
            <IconAdd className="w-4 h-4" strokeWidth={2.5} />
          </button>
          <div className="relative flex-shrink-0" ref={scenCsvTooltipRef}>
            <button
              onClick={() => { if (isTouch && !scenCsvTooltipOpen) { setScenCsvTooltipOpen(true); return } scenCsvRef.current?.click() }}
              onMouseEnter={() => setScenCsvTooltipOpen(true)}
              onMouseLeave={() => setScenCsvTooltipOpen(false)}
              className={`text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors p-2 -m-0.5 flex items-center justify-center ${isTouch ? 'min-w-[44px] min-h-[44px]' : ''}`}
              title="Import CSV"
            >
              <IconUpload className="w-4 h-4" strokeWidth={2} />
            </button>
            {scenCsvTooltipOpen && (
              <div className="absolute top-full right-0 mt-2 z-50 w-72 max-w-[calc(100vw-2rem)] pointer-events-none">
                <div className="bg-gray-900 text-white rounded-xl shadow-2xl p-3 text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">CSV Format</p>
                  <code className="block bg-black/30 rounded-lg px-2.5 py-2 text-[11px] font-mono text-green-300 leading-relaxed whitespace-pre">{`title,content,source_lang,target_lang\nAt the café,"Einen Kaffee, bitte.",de,en\nAt the doctor,,de,tr`}</code>
                  <div className="mt-2 space-y-0.5">
                    <p className="text-[10px] text-gray-300"><span className="text-white font-medium">title</span> — required</p>
                    <p className="text-[10px] text-gray-300"><span className="text-white font-medium">content</span> — optional (use quotes if it contains commas)</p>
                    <p className="text-[10px] text-gray-300"><span className="text-white font-medium">source_lang / target_lang</span> — <code className="text-green-300">de</code> / <code className="text-green-300">en</code> / <code className="text-green-300">tr</code> / <code className="text-green-300">ja</code></p>
                  </div>
                  <div className="absolute bottom-full right-4 border-4 border-transparent border-b-gray-900" />
                </div>
              </div>
            )}
          </div>
          <input ref={scenCsvRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleScenCsvImport} />
        </div>

        {scenImportMsg && <p className="text-xs text-xero-green font-medium px-3 pt-1.5">{scenImportMsg}</p>}

        <div className="flex-1 overflow-y-auto py-1 px-1 mt-1">
          {isLoading ? (
            <p className="text-xs text-gray-400 p-4">Loading…</p>
          ) : listScenarios.length === 0 ? (
            <p className="text-xs text-gray-400 px-3 py-3">{scenSearch.trim() ? 'No scenarios found' : 'No scenarios here yet.'}</p>
          ) : (
            listScenarios.map(s => (
              <div
                key={s.id}
                onClick={() => openScenario(s)}
                className={`flex items-center gap-1.5 py-2 pr-1 pl-2 rounded-lg cursor-pointer ${isTouch ? 'min-h-[44px]' : ''} ${activeId === s.id ? 'bg-xero-green/10 dark:bg-xero-green/20' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`}
              >
                <IconLayers className="w-3.5 h-3.5 flex-shrink-0 text-gray-400 dark:text-slate-500" strokeWidth={1.75} />
                <span className={`text-xs flex-1 truncate ${activeId === s.id ? 'text-xero-green font-medium' : 'text-gray-600 dark:text-slate-400'}`}>{s.title || t.untitled}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail / edit pane */}
      <div className={`${activeId === null ? 'hidden md:flex' : 'flex'} flex-1 flex-col overflow-y-auto`}>
      {activeId !== null && active ? (
      <div className="p-4 max-w-2xl mx-auto space-y-3 w-full">
        <button onClick={() => { setActiveId(null); setIsEditingContent(false) }}
          className="md:hidden text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors -ml-3 p-3 min-w-[44px] min-h-[44px] flex items-center">
          ← {t.scenario}
        </button>

        <input
          value={draft.title ?? ''}
          onChange={e => { const v = e.target.value; setDraft(d => ({ ...d, title: v })); scheduleTitle(active.id, v) }}
          placeholder={t.scenarioTitle}
          className={`text-base font-semibold border-0 border-b-2 rounded-none bg-transparent w-full focus:outline-none pb-1 ${dark ? 'border-slate-600 text-slate-100' : 'border-gray-200 text-gray-800'}`}
        />

        {/* Memory palace field */}
        <div className="flex items-center gap-2">
          <span className="text-sm flex-shrink-0">🏛️</span>
          <input
            value={draft.memory_palace ?? ''}
            onChange={e => { const v = e.target.value; setDraft(d => ({ ...d, memory_palace: v || null })); saveScenario(active.id, { memory_palace: v || null }) }}
            placeholder="Memory palace — where/when does this scenario happen? (optional)"
            list="palace-suggestions"
            className={`text-sm border rounded-lg px-3 py-1.5 flex-1 focus:outline-none focus:ring-1 focus:ring-blue-400 ${dark ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400' : 'border-gray-200'}`}
          />
        </div>

        <div className="flex gap-2 text-xs items-center">
          <select value={draft.source_lang ?? 'de'} onChange={e => { const v = e.target.value; setDraft(d => ({ ...d, source_lang: v })); saveScenario(active.id, { source_lang: v }) }}
            className={`border rounded-lg px-2 py-1.5 ${dark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'border-gray-200'}`}>
            {LANGS.map(l => <option key={l} value={l}>{LANG_LABELS[l]}</option>)}
          </select>
          <span className="text-gray-400">→</span>
          <select value={draft.target_lang ?? 'tr'} onChange={e => { const v = e.target.value; setDraft(d => ({ ...d, target_lang: v })); saveScenario(active.id, { target_lang: v }) }}
            className={`border rounded-lg px-2 py-1.5 ${dark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'border-gray-200'}`}>
            {LANGS.map(l => <option key={l} value={l}>{LANG_LABELS[l]}</option>)}
          </select>
          <button onClick={handleTranslate} disabled={translating} className="ml-auto text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50">
            {translating ? '…' : '🌐'}
          </button>
        </div>

        <div className={`rounded-xl border p-3 min-h-32 ${dark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-gray-100 text-gray-800'}`}>
          {isEditingContent ? (
            <textarea
              autoFocus
              value={draft.content ?? ''}
              onChange={e => { const v = e.target.value; setDraft(d => ({ ...d, content: v })); scheduleContent(active.id, v) }}
              onBlur={() => { if (contentTimer.current) clearTimeout(contentTimer.current); saveScenario(active.id, { content: draft.content ?? '' }); setIsEditingContent(false) }}
              placeholder="Write your scenario here…"
              rows={8}
              className={`w-full resize-none focus:outline-none text-sm leading-relaxed bg-transparent ${dark ? 'text-slate-100 placeholder-slate-500' : 'text-gray-800'}`}
            />
          ) : (
            <div onClick={() => setIsEditingContent(true)} className="cursor-text">
              {draft.content ? (
                <WordLinker
                  text={draft.content}
                  links={mergeLinks(draft.word_links ?? [], autoLink(draft.content, vocab, draft.source_lang ?? 'de'))}
                  vocab={vocab}
                  sourceLang={draft.source_lang ?? 'de'}
                  onAddLink={handleAddLink}
                  onRemoveLink={handleRemoveLink}
                />
              ) : (
                <p className="text-sm text-gray-400 dark:text-slate-500">Click to write…</p>
              )}
            </div>
          )}
        </div>

        {/* Due status */}
        <div className="flex items-center justify-between">
          <span className={`text-[10px] rounded-full px-2 py-0.5 font-medium ${isDueSR(active.due_at) ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : 'bg-gray-50 dark:bg-slate-700 text-gray-400 dark:text-slate-500'}`}>
            {isDueSR(active.due_at) ? '⚡ Due for review' : `Next review: ${nextReviewLabel(active.due_at)}`}
          </span>
          <div className="flex items-center gap-3">
            <button onClick={() => setSingleReviewItem(active)} className="text-xs text-violet-500 hover:text-violet-700 dark:hover:text-violet-300 transition-colors">Review</button>
            <button onClick={() => setConfirmDeleteId(active.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">{t.delete}</button>
          </div>
        </div>

        {confirmDeleteId !== null && (
          <ConfirmDialog
            message="Delete this scenario?"
            onConfirm={async () => { if (confirmDeleteId !== null) { await deleteScenario(confirmDeleteId); if (activeId === confirmDeleteId) setActiveId(null); setConfirmDeleteId(null) } }}
            onCancel={() => setConfirmDeleteId(null)}
          />
        )}
      </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {activeId !== null && (
            <button onClick={() => setActiveId(null)}
              className="md:hidden self-start text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors p-3 -ml-1 mt-1 min-w-[44px] min-h-[44px] flex items-center">
              ← {t.scenario}
            </button>
          )}
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm px-6 text-center">
            {isLoading ? 'Loading…' : 'Select or create a scenario to get started.'}
          </div>
        </div>
      )}
      </div>

      {confirmDeleteFolder !== null && (
        <ConfirmDialog
          message={`Delete folder "${confirmDeleteFolder}" and all scenarios inside?`}
          confirmLabel="Delete"
          onConfirm={async () => { await deleteScenarioFolder(confirmDeleteFolder); setConfirmDeleteFolder(null) }}
          onCancel={() => setConfirmDeleteFolder(null)}
        />
      )}
    </div>
  )
}

// ─── Memory Palace helpers ─────────────────────────────────────────────────────

const PW = 128 // checkpoint card width
const PH = 128 // checkpoint card height

function pcInitPositions(raw: PalaceCheckpoint[]): PalaceCheckpoint[] {
  if (raw.length === 0 || raw.every(c => c.x !== undefined)) return raw
  return raw.map((c, i) => ({ ...c, x: c.x ?? 0, y: c.y ?? i * (PH + 60) }))
}

function pcAnchor(c: PalaceCheckpoint, side: PalaceSide): { x: number; y: number } {
  const x = c.x ?? 0, y = c.y ?? 0
  switch (side) {
    case 'top':    return { x: x + PW / 2, y }
    case 'bottom': return { x: x + PW / 2, y: y + PH }
    case 'left':   return { x, y: y + PH / 2 }
    case 'right':  return { x: x + PW, y: y + PH / 2 }
  }
}

function pcSideNormal(side: PalaceSide): { x: number; y: number } {
  switch (side) {
    case 'top':    return { x: 0, y: -1 }
    case 'bottom': return { x: 0, y: 1 }
    case 'left':   return { x: -1, y: 0 }
    case 'right':  return { x: 1, y: 0 }
  }
}

function pcOppositeSide(s: PalaceSide): PalaceSide {
  return s === 'top' ? 'bottom' : s === 'bottom' ? 'top' : s === 'left' ? 'right' : 'left'
}

// Picks the side of `from` that faces `to` — used to auto-orient a road's
// arrival pin toward whichever direction the connection is being dragged from.
function pcPickSide(from: { x: number; y: number }, to: { x: number; y: number }): PalaceSide {
  const dx = to.x - from.x, dy = to.y - from.y
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right'
  return dy < 0 ? 'top' : 'bottom'
}

function pcRoadPath(x1: number, y1: number, side1: PalaceSide, x2: number, y2: number, side2: PalaceSide): string {
  const n1 = pcSideNormal(side1), n2 = pcSideNormal(side2)
  const dist = Math.max(60, Math.hypot(x2 - x1, y2 - y1) * 0.5)
  const c1x = x1 + n1.x * dist, c1y = y1 + n1.y * dist
  const c2x = x2 + n2.x * dist, c2y = y2 + n2.y * dist
  return `M ${x1} ${y1} C ${c1x} ${c1y} ${c2x} ${c2y} ${x2} ${y2}`
}

function pcWrapLines(text: string, maxChars: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) { if (cur) lines.push(cur); cur = w }
    else cur = (cur + ' ' + w).trim()
  }
  if (cur) lines.push(cur)
  return lines
}

const PALACE_EMOJI_CHOICES = [
  '🚪', '🪟', '🛏️', '🛋️', '🪑', '🍳', '🍽️', '🚿', '🧺', '🧴', '🕯️', '🖼️',
  '📚', '💡', '🔑', '⏰', '📱', '💻', '🎒', '👜', '🧢', '👕', '👟', '🌳',
  '🌿', '🌸', '☀️', '⭐', '🔥', '💧', '🐾', '🎵', '❤️', '⚡', '🎯', '✅',
]

// Maps a linked-content type to its Language sub-tab path, so a checkpoint's
// link can be opened at `/learn/language/<path>?highlight=<id>`.
function pcContentRoute(type: PalaceContentType): string {
  return type === 'vocab' ? 'vocab' : type === 'sentence' ? 'sentence' : 'scenario'
}

// ─── CheckpointEditor (label · linked content · media) ─────────────────────────

function CheckpointEditor({ checkpoint, onSave, onClose }: {
  checkpoint: PalaceCheckpoint
  onSave: (next: PalaceCheckpoint) => void
  onClose: () => void
}) {
  const { dark } = useDarkMode()
  const navigate = useNavigate()
  const { vocab } = useVocabulary()
  const { sentences } = useLanguageSentences()
  const { scenarios } = useLanguageScenarios()
  const [label, setLabel] = useState(checkpoint.label)
  const [content, setContent] = useState(checkpoint.content ?? null)
  const [media, setMedia] = useState(checkpoint.media ?? null)
  const [pickerTab, setPickerTab] = useState<PalaceContentType>('vocab')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [mediaKind, setMediaKind] = useState<'image' | 'gif'>(media?.type === 'gif' ? 'gif' : 'image')
  const [mediaUrl, setMediaUrl] = useState(media && media.type !== 'emoji' ? media.value : '')
  const mediaDragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null)

  function contentLabel(c: { type: PalaceContentType; id: number } | null): string {
    if (!c) return ''
    if (c.type === 'vocab') { const v = vocab.find(v => v.id === c.id); return v ? `${v.word} → ${v.translation}` : '(linked item removed)' }
    if (c.type === 'sentence') { const s = sentences.find(s => s.id === c.id); return s ? s.source_text : '(linked item removed)' }
    const s = scenarios.find(s => s.id === c.id); return s ? s.title : '(linked item removed)'
  }

  const pickerItems: { id: number; label: string }[] =
    pickerTab === 'vocab'
      ? vocab.filter(v => v.word.toLowerCase().includes(query.toLowerCase())).map(v => ({ id: v.id, label: `${v.word} → ${v.translation}` }))
      : pickerTab === 'sentence'
      ? sentences.filter(s => s.source_text.toLowerCase().includes(query.toLowerCase())).map(s => ({ id: s.id, label: s.source_text }))
      : scenarios.filter(s => s.title.toLowerCase().includes(query.toLowerCase())).map(s => ({ id: s.id, label: s.title }))

  function handleSave() {
    onSave({ ...checkpoint, label: label.trim() || 'Checkpoint', content, media })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className={`w-full max-w-sm rounded-2xl shadow-2xl p-4 space-y-4 max-h-[85vh] overflow-y-auto ${dark ? 'bg-slate-800' : 'bg-white'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">Edit checkpoint</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 p-2.5 -m-2.5">
            <IconClose className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">Label</label>
          <input
            value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Kitchen table"
            className="mt-1 w-full text-sm rounded-lg border border-xero-border dark:border-slate-600 bg-transparent px-3 py-2 outline-none focus:ring-1 focus:ring-xero-green text-gray-800 dark:text-slate-200"
          />
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">Media</label>
          <div className="mt-1.5 flex items-start gap-2">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0 border overflow-hidden ${dark ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-xero-border'}`}>
              {media?.type === 'emoji' ? media.value
                : media ? <img src={media.value} alt="" className="w-full h-full object-cover" />
                : <IconImage className="w-4 h-4 text-gray-300 dark:text-slate-600" strokeWidth={2} />}
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex gap-1.5 flex-wrap">
                {PALACE_EMOJI_CHOICES.map(em => (
                  <button
                    key={em} type="button"
                    onClick={() => { setMedia({ type: 'emoji', value: em }); setMediaUrl('') }}
                    className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-colors ${media?.type === 'emoji' && media.value === em ? 'bg-xero-green/20 ring-1 ring-xero-green' : 'hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                  >
                    {em}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                <select
                  value={mediaKind} onChange={e => setMediaKind(e.target.value as 'image' | 'gif')}
                  className="text-xs rounded-lg border border-xero-border dark:border-slate-600 bg-transparent px-1.5 py-1.5 outline-none text-gray-600 dark:text-slate-300"
                >
                  <option value="image">Image</option>
                  <option value="gif">GIF</option>
                </select>
                <input
                  value={mediaUrl}
                  onChange={e => {
                    const v = e.target.value
                    setMediaUrl(v)
                    if (v.trim()) {
                      setMedia(m => ({
                        type: mediaKind, value: v.trim(),
                        ...(m && m.type !== 'emoji' ? { offsetX: m.offsetX, offsetY: m.offsetY, scale: m.scale } : {}),
                      }))
                    }
                    else if (media?.type !== 'emoji') setMedia(null)
                  }}
                  placeholder="Paste image or gif URL…"
                  className="flex-1 min-w-0 text-xs rounded-lg border border-xero-border dark:border-slate-600 bg-transparent px-2 py-1.5 outline-none focus:ring-1 focus:ring-xero-green text-gray-800 dark:text-slate-200"
                />
              </div>
            </div>
            {media && (
              <button type="button" onClick={() => { setMedia(null); setMediaUrl('') }} className="text-gray-400 hover:text-red-500 flex-shrink-0 p-2 -m-2 mt-0" title="Remove media">
                <IconClose className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            )}
          </div>

          {media && media.type !== 'emoji' && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">Position &amp; zoom — drag to pan</span>
                <button
                  type="button"
                  onClick={() => setMedia(m => (m && m.type !== 'emoji' ? { ...m, offsetX: undefined, offsetY: undefined, scale: undefined } : m))}
                  className="text-[10px] text-gray-400 hover:text-xero-green p-2.5 -m-2.5"
                >
                  Reset
                </button>
              </div>
              <div
                className="relative w-32 h-32 mx-auto rounded-2xl overflow-hidden border border-xero-border dark:border-slate-600 cursor-move touch-none select-none"
                onPointerDown={e => {
                  e.currentTarget.setPointerCapture(e.pointerId)
                  mediaDragRef.current = { startX: e.clientX, startY: e.clientY, baseX: media.offsetX ?? 0, baseY: media.offsetY ?? 0 }
                }}
                onPointerMove={e => {
                  if (!mediaDragRef.current) return
                  const dx = e.clientX - mediaDragRef.current.startX
                  const dy = e.clientY - mediaDragRef.current.startY
                  setMedia(m => (m && m.type !== 'emoji' ? { ...m, offsetX: mediaDragRef.current!.baseX + dx, offsetY: mediaDragRef.current!.baseY + dy } : m))
                }}
                onPointerUp={() => { mediaDragRef.current = null }}
                onPointerCancel={() => { mediaDragRef.current = null }}
              >
                <img
                  src={media.value} alt="" draggable={false}
                  className="w-32 h-32 object-cover pointer-events-none"
                  style={{ transform: `translate(${media.offsetX ?? 0}px, ${media.offsetY ?? 0}px) scale(${media.scale ?? 1})` }}
                />
              </div>
              <input
                type="range" min={1} max={3} step={0.05}
                value={media.scale ?? 1}
                onChange={e => setMedia(m => (m && m.type !== 'emoji' ? { ...m, scale: parseFloat(e.target.value) } : m))}
                className={`mt-2 w-32 mx-auto block ${isTouch ? 'h-10' : ''}`}
              />
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">Linked content</label>
          {content ? (
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-xero-border dark:border-slate-600 px-3 py-2">
              <span className="text-[10px] font-medium uppercase text-xero-green flex-shrink-0">{content.type}</span>
              <span className="text-xs text-gray-700 dark:text-slate-300 truncate flex-1">{contentLabel(content)}</span>
              {contentLabel(content) !== '(linked item removed)' && (
                <button
                  onClick={() => {
                    // Persist first — this modal (and its unsaved label/content/media state)
                    // unmounts as soon as the route changes.
                    onSave({ ...checkpoint, label: label.trim() || 'Checkpoint', content, media })
                    navigate(`/learn/language/${pcContentRoute(content.type)}?highlight=${content.id}`)
                  }}
                  className="text-gray-400 hover:text-xero-green flex-shrink-0 p-2 relative z-10" title="Go to linked item"
                >
                  <IconExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              )}
              <button onClick={() => setContent(null)} className="text-gray-400 hover:text-red-500 flex-shrink-0 p-2 -ml-1 -mr-2">
                <IconClose className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setPickerOpen(o => !o)}
              className="mt-1.5 w-full text-xs text-left rounded-lg border border-dashed border-xero-border dark:border-slate-600 px-3 py-2 text-gray-400 hover:text-xero-green hover:border-xero-green transition-colors"
            >
              + Link a vocabulary word, sentence, or scenario
            </button>
          )}

          {pickerOpen && !content && (
            <div className="mt-1.5 rounded-lg border border-xero-border dark:border-slate-600 overflow-hidden">
              <div className="flex border-b border-xero-border dark:border-slate-600">
                {(['vocab', 'sentence', 'scenario'] as PalaceContentType[]).map(tab => (
                  <button
                    key={tab} onClick={() => setPickerTab(tab)}
                    className={`flex-1 text-[11px] font-medium py-2.5 capitalize transition-colors ${pickerTab === tab ? 'bg-xero-green/10 text-xero-green' : 'text-gray-400 hover:text-gray-600 dark:hover:text-slate-300'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <input
                value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…" autoFocus
                className="w-full text-xs px-3 py-2 outline-none bg-transparent border-b border-xero-border dark:border-slate-600 text-gray-800 dark:text-slate-200"
              />
              <div className="max-h-40 overflow-y-auto">
                {pickerItems.length === 0 && <p className="text-xs text-gray-400 px-3 py-3">No matches.</p>}
                {pickerItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setContent({ type: pickerTab, id: item.id }); setPickerOpen(false); setQuery('') }}
                    className="w-full text-left text-xs px-3 py-2 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 truncate"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="text-xs px-3 py-3 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700">Cancel</button>
          <button onClick={handleSave} className="text-xs px-4 py-3 rounded-lg bg-xero-green text-white font-medium hover:bg-xero-green/90">Save</button>
        </div>
      </div>
    </div>
  )
}

// ─── MemoryPalaceCanvas ─────────────────────────────────────────────────────────

interface PalaceConnectDrag { sourceId: string; x: number; y: number; targetId: string | null; side: PalaceSide }

function MemoryPalaceCanvas({ palaceId }: { palaceId: number }) {
  const { dark } = useDarkMode()
  const navigate = useNavigate()
  const { palace, savePalace } = useMemoryPalace(palaceId)
  const { vocab } = useVocabulary()
  const { sentences } = useLanguageSentences()
  const { scenarios } = useLanguageScenarios()
  const [checkpoints, setCheckpoints] = useState<PalaceCheckpoint[]>([])
  const [connections, setConnections] = useState<PalaceConnection[]>([])
  const [pTitle, setPTitle] = useState('New Memory Palace')
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null)
  const [renaming, setRenaming] = useState<{ id: string; label: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedForConnect, setSelectedForConnect] = useState<string | null>(null)
  const [connectLine, setConnectLine] = useState<PalaceConnectDrag | null>(null)
  const [flippedNodes, setFlippedNodes] = useState<Set<string>>(new Set())
  const longPressTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressOpened = useRef(false)
  const [pan, setPan] = useState<{ x: number; y: number }>(() => {
    try {
      const raw = localStorage.getItem(`palace:pan:${palaceId}`)
      if (raw) { const p = JSON.parse(raw); if (typeof p?.x === 'number') return p }
    } catch { /* ignore */ }
    return { x: 300, y: 80 }
  })
  const [scale, setScale] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const initialized = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const connectRef = useRef<PalaceConnectDrag | null>(null)
  const panRef = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null)
  const panStateRef = useRef({ x: pan.x, y: pan.y })
  const scaleRef = useRef(1)
  const checkpointsRef = useRef<PalaceCheckpoint[]>([])
  const connectionsRef = useRef<PalaceConnection[]>([])
  const titleRef = useRef(pTitle)

  function findNodeAt(svgX: number, svgY: number, excludeId?: string): PalaceCheckpoint | null {
    return checkpointsRef.current.find(c =>
      c.id !== excludeId &&
      svgX >= (c.x ?? 0) && svgX <= (c.x ?? 0) + PW &&
      svgY >= (c.y ?? 0) && svgY <= (c.y ?? 0) + PH
    ) ?? null
  }

  function pcContentPreview(c: { type: PalaceContentType; id: number }): string | null {
    if (c.type === 'vocab') { const v = vocab.find(v => v.id === c.id); return v ? `${v.word} → ${v.translation}` : null }
    if (c.type === 'sentence') { const s = sentences.find(s => s.id === c.id); return s ? s.source_text : null }
    const s = scenarios.find(s => s.id === c.id); return s ? s.title : null
  }

  useEffect(() => { checkpointsRef.current = checkpoints }, [checkpoints])
  useEffect(() => { connectionsRef.current = connections }, [connections])
  useEffect(() => { titleRef.current = pTitle }, [pTitle])
  useEffect(() => { scaleRef.current = scale }, [scale])

  // Wheel zoom (desktop + trackpad) and two-finger pinch zoom (mobile)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function handleWheel(e: WheelEvent) {
      e.preventDefault()
      const delta = e.ctrlKey ? -e.deltaY * 0.005 : -e.deltaY * 0.0015
      const factor = Math.exp(delta)
      const s = scaleRef.current
      const newScale = Math.max(0.15, Math.min(5, s * factor))
      const rect = svgRef.current!.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const newPan = {
        x: panStateRef.current.x + (cx - panStateRef.current.x) * (1 - newScale / s),
        y: panStateRef.current.y + (cy - panStateRef.current.y) * (1 - newScale / s),
      }
      scaleRef.current = newScale
      setScale(newScale)
      panStateRef.current = newPan
      setPan(newPan)
    }

    let pinchInitDist = 0
    let pinchInitScale = 1
    let pinchInitPan = { x: 0, y: 0 }
    let pinchMidX = 0
    let pinchMidY = 0

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        const [a, b] = [e.touches[0], e.touches[1]]
        pinchInitDist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY)
        pinchInitScale = scaleRef.current
        pinchInitPan = { ...panStateRef.current }
        const rect = svgRef.current!.getBoundingClientRect()
        pinchMidX = (a.clientX + b.clientX) / 2 - rect.left
        pinchMidY = (a.clientY + b.clientY) / 2 - rect.top
        panRef.current = null
        dragRef.current = null
      }
    }

    function handleTouchMove(e: TouchEvent) {
      if (e.touches.length === 2) {
        e.preventDefault()
        const [a, b] = [e.touches[0], e.touches[1]]
        const newDist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY)
        const newScale = Math.max(0.15, Math.min(5, pinchInitScale * (newDist / pinchInitDist)))
        const ratio = newScale / pinchInitScale
        const newPan = {
          x: pinchInitPan.x + pinchMidX * (1 - ratio),
          y: pinchInitPan.y + pinchMidY * (1 - ratio),
        }
        scaleRef.current = newScale
        setScale(newScale)
        panStateRef.current = newPan
        setPan(newPan)
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    return () => {
      el.removeEventListener('wheel', handleWheel)
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
    }
  }, [])

  useEffect(() => {
    if (initialized.current || palace === undefined) return
    const raw = palace && palace.checkpoints.length > 0 ? palace.checkpoints : [{ id: 'start', label: 'Front door', x: 0, y: 0 }]
    const placed = pcInitPositions(raw)
    setCheckpoints(placed)
    if (palace) {
      setPTitle(palace.title)
      setConnections(palace.connections ?? [])
    }
    initialized.current = true

    const hasCached = !!localStorage.getItem(`palace:pan:${palaceId}`)
    if (!hasCached && placed.length > 0) {
      const xs = placed.map(c => c.x ?? 0)
      const ys = placed.map(c => c.y ?? 0)
      const minX = Math.min(...xs), maxX = Math.max(...xs) + PW
      const minY = Math.min(...ys), maxY = Math.max(...ys) + PH
      const cx = (minX + maxX) / 2
      const cy = (minY + maxY) / 2
      const rect = containerRef.current?.getBoundingClientRect()
      const vw = rect?.width  ?? 800
      const vh = rect?.height ?? 600
      const centered = { x: vw / 2 - cx, y: vh / 2 - cy }
      setPan(centered)
      panStateRef.current = centered
    }
  }, [palace, palaceId])

  function persist(newCheckpoints: PalaceCheckpoint[], newConnections = connectionsRef.current) {
    setCheckpoints(newCheckpoints)
    checkpointsRef.current = newCheckpoints
    setConnections(newConnections)
    connectionsRef.current = newConnections
    savePalace(titleRef.current, newCheckpoints, newConnections)
  }

  function clientToSvg(clientX: number, clientY: number) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return { x: clientX, y: clientY }
    const p = panStateRef.current
    const s = scaleRef.current
    return { x: (clientX - rect.left - p.x) / s, y: (clientY - rect.top - p.y) / s }
  }

  function handleNodePointerDown(e: React.PointerEvent, id: string) {
    e.stopPropagation()
    if (e.button === 2) return
    const node = checkpointsRef.current.find(c => c.id === id)
    if (!node) return
    const { x, y } = clientToSvg(e.clientX, e.clientY)
    dragRef.current = { id, offsetX: x - (node.x ?? 0), offsetY: y - (node.y ?? 0), startSvgX: x, startSvgY: y, prevX: x, prevY: y, moved: false, pointerType: e.pointerType }
    setCtxMenu(null)
    if (e.pointerType === 'touch') {
      if (longPressTimer.current) clearTimeout(longPressTimer.current)
      longPressOpened.current = false
      longPressTimer.current = setTimeout(() => {
        if (dragRef.current && !dragRef.current.moved) {
          dragRef.current = null
          longPressOpened.current = true
          setCtxMenu({ nodeId: id, screenX: e.clientX, screenY: e.clientY })
        }
      }, 500)
    }
  }

  function handleSvgPointerMove(e: React.PointerEvent) {
    if (longPressTimer.current) {
      const d = dragRef.current
      if (d) {
        const { x, y } = clientToSvg(e.clientX, e.clientY)
        if (Math.hypot(x - d.startSvgX, y - d.startSvgY) > 8) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
      } else { clearTimeout(longPressTimer.current); longPressTimer.current = null }
    }
    const p = panRef.current
    if (p) {
      const nx = p.tx + (e.clientX - p.startX)
      const ny = p.ty + (e.clientY - p.startY)
      panStateRef.current = { x: nx, y: ny }
      setPan({ x: nx, y: ny })
      setIsPanning(true)
      return
    }
    const { x, y } = clientToSvg(e.clientX, e.clientY)
    const d = dragRef.current
    if (d) {
      if (!d.moved && Math.hypot(x - d.startSvgX, y - d.startSvgY) > 4) dragRef.current = { ...d, moved: true }
      const dx = x - d.prevX
      const dy = y - d.prevY
      dragRef.current = { ...dragRef.current!, prevX: x, prevY: y }
      const moved = checkpointsRef.current.map(c => c.id === d.id ? { ...c, x: (c.x ?? 0) + dx, y: (c.y ?? 0) + dy } : c)
      checkpointsRef.current = moved
      setCheckpoints(moved)
      return
    }
    const c = connectRef.current
    if (c) {
      const target = findNodeAt(x, y, c.sourceId)
      const updated = { ...c, x, y, targetId: target?.id ?? null }
      connectRef.current = updated
      setConnectLine(updated)
    }
  }

  function handleSvgPointerUp(e: React.PointerEvent) {
    if (e.button === 2) { dragRef.current = null; return }
    if (panRef.current) {
      const barelyMoved = Math.hypot(e.clientX - panRef.current.startX, e.clientY - panRef.current.startY) < 4
      panRef.current = null
      setIsPanning(false)
      if (barelyMoved) { setSelectedForConnect(null); setCtxMenu(null) }
      localStorage.setItem(`palace:pan:${palaceId}`, JSON.stringify(panStateRef.current))
      return
    }
    const d = dragRef.current
    if (d) {
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
      dragRef.current = null
      if (!d.moved) {
        const isMouseClick = d.pointerType === 'mouse'
        const isSelected = selectedForConnect === d.id
        if (isMouseClick || isSelected) {
          setFlippedNodes(prev => {
            const next = new Set(prev)
            if (next.has(d.id)) next.delete(d.id); else next.add(d.id)
            return next
          })
          setSelectedForConnect(null)
        } else {
          setSelectedForConnect(d.id)
        }
        setCtxMenu(null)
      } else {
        setSelectedForConnect(null)
        savePalace(titleRef.current, checkpointsRef.current, connectionsRef.current)
      }
      return
    }
    const c = connectRef.current
    if (c) {
      connectRef.current = null
      setConnectLine(null)
      setHoveredId(null)
      setSelectedForConnect(null)
      if (c.targetId && c.targetId !== c.sourceId) {
        const already = connectionsRef.current.some(cn => cn.from === c.sourceId && cn.to === c.targetId)
        if (!already) {
          const tgt = checkpointsRef.current.find(n => n.id === c.targetId)!
          const tgtCenter = { x: (tgt.x ?? 0) + PW / 2, y: (tgt.y ?? 0) + PH / 2 }
          const toSide = pcPickSide(tgtCenter, { x: c.x, y: c.y })
          const newConn: PalaceConnection = { id: `c${Date.now()}`, from: c.sourceId, to: c.targetId, bidirectional: false, fromSide: c.side, toSide }
          persist(checkpointsRef.current, [...connectionsRef.current, newConn])
        }
      }
      return
    }
    if (longPressOpened.current) { longPressOpened.current = false; return }
    setSelectedForConnect(null)
    setCtxMenu(null)
  }

  function handlePinPointerDown(e: React.PointerEvent, sourceId: string, side: PalaceSide) {
    e.stopPropagation()
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
    dragRef.current = null
    const { x, y } = clientToSvg(e.clientX, e.clientY)
    connectRef.current = { sourceId, x, y, targetId: null, side }
    setConnectLine(connectRef.current)
    setCtxMenu(null)
  }

  function handleAddNext() {
    if (!ctxMenu) return
    const src = checkpointsRef.current.find(c => c.id === ctxMenu.nodeId)
    if (!src) return
    const newId = `p${Date.now()}`
    const newNode: PalaceCheckpoint = { id: newId, label: 'New checkpoint', x: src.x ?? 0, y: (src.y ?? 0) + PH + 60 }
    const newConn: PalaceConnection = { id: `c${Date.now()}`, from: src.id, to: newId, bidirectional: false, fromSide: 'bottom', toSide: 'top' }
    persist([...checkpointsRef.current, newNode], [...connectionsRef.current, newConn])
    setCtxMenu(null)
    setRenaming({ id: newId, label: 'New checkpoint' })
  }

  function handleAddFloating() {
    const rect = containerRef.current?.getBoundingClientRect()
    const cx = rect ? rect.left + rect.width / 2 : 300
    const cy = rect ? rect.top + rect.height / 2 : 300
    const { x, y } = clientToSvg(cx, cy)
    const newId = `p${Date.now()}`
    const newNode: PalaceCheckpoint = { id: newId, label: 'New checkpoint', x: x - PW / 2, y: y - PH / 2 }
    persist([...checkpointsRef.current, newNode])
    setRenaming({ id: newId, label: 'New checkpoint' })
  }

  function handleRenameConfirm() {
    if (!renaming) return
    persist(checkpointsRef.current.map(c => c.id === renaming.id ? { ...c, label: renaming.label } : c))
    setRenaming(null)
  }

  function handleDelete(id: string) {
    const newCheckpoints = checkpointsRef.current.filter(c => c.id !== id)
    const newConnections = connectionsRef.current.filter(cn => cn.from !== id && cn.to !== id)
    persist(newCheckpoints, newConnections)
    setConfirmDelete(null)
    setCtxMenu(null)
  }

  const ctxNode = ctxMenu ? checkpoints.find(c => c.id === ctxMenu.nodeId) ?? null : null
  const editingCheckpoint = editingId ? checkpoints.find(c => c.id === editingId) ?? null : null

  return (
    <div className="flex-1 min-w-0 h-full relative overflow-hidden">
      <div
        ref={containerRef}
        className={`h-full overflow-hidden ${dark ? 'bg-[#0F172A]' : 'bg-[#F8FAFC]'}`}
        style={{ cursor: isPanning ? 'grabbing' : 'default', touchAction: 'none' }}
        onPointerMove={handleSvgPointerMove}
        onPointerUp={handleSvgPointerUp}
        onPointerLeave={() => {
          if (panRef.current) { panRef.current = null; setIsPanning(false) }
          if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
        }}
        onClick={() => setCtxMenu(null)}
        onContextMenu={e => e.preventDefault()}
      >
        <svg ref={svgRef} width="100%" height="100%" className="block select-none" style={{ touchAction: 'none' }} onContextMenu={e => e.preventDefault()}>
          <defs>
            <pattern id="pDots" x={pan.x % (28 * scale)} y={pan.y % (28 * scale)} width={28 * scale} height={28 * scale} patternUnits="userSpaceOnUse">
              <circle cx={14 * scale} cy={14 * scale} r={Math.max(0.5, scale)} fill={dark ? '#334155' : '#CBD5E1'} />
            </pattern>
            <marker id="pArrowEnd" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <polygon points="0 0, 7 3.5, 0 7" fill="#94A3B8" />
            </marker>
            <marker id="pArrowStart" markerWidth="7" markerHeight="7" refX="1" refY="3.5" orient="auto-start-reverse">
              <polygon points="0 0, 7 3.5, 0 7" fill="#94A3B8" />
            </marker>
          </defs>
          <rect
            x="-10000" y="-10000" width="20000" height="20000" fill="url(#pDots)"
            style={{ cursor: 'grab' }}
            onPointerDown={e => {
              if (dragRef.current || connectRef.current) return
              panRef.current = { startX: e.clientX, startY: e.clientY, tx: panStateRef.current.x, ty: panStateRef.current.y }
            }}
          />
          <g transform={`translate(${pan.x},${pan.y}) scale(${scale})`}>

            {/* Roads — click to remove, right-click to toggle two-way */}
            {connections.map(cn => {
              const from = checkpoints.find(c => c.id === cn.from)
              const to = checkpoints.find(c => c.id === cn.to)
              if (!from || !to) return null
              const fromSide = cn.fromSide ?? 'bottom'
              const toSide = cn.toSide ?? 'top'
              const p1 = pcAnchor(from, fromSide)
              const p2 = pcAnchor(to, toSide)
              const d = pcRoadPath(p1.x, p1.y, fromSide, p2.x, p2.y, toSide)
              const color = nodeColor(cn.from)
              return (
                <g key={cn.id}>
                  <path d={d} fill="none" stroke="transparent" strokeWidth={12} style={{ cursor: 'pointer' }}
                    onClick={ev => { ev.stopPropagation(); persist(checkpointsRef.current, connectionsRef.current.filter(x => x.id !== cn.id)) }}
                    onContextMenu={ev => { ev.preventDefault(); ev.stopPropagation(); persist(checkpointsRef.current, connectionsRef.current.map(x => x.id === cn.id ? { ...x, bidirectional: !x.bidirectional } : x)) }}
                  />
                  <path
                    d={d} fill="none" stroke={color} strokeWidth={2} strokeOpacity={0.6} strokeLinecap="round"
                    markerEnd="url(#pArrowEnd)" markerStart={cn.bidirectional ? 'url(#pArrowStart)' : undefined}
                    style={{ pointerEvents: 'none' }}
                  />
                </g>
              )
            })}

            {/* Temp road while dragging a pin */}
            {connectLine && (() => {
              const src = checkpoints.find(c => c.id === connectLine.sourceId)
              if (!src) return null
              const p1 = pcAnchor(src, connectLine.side)
              const d = pcRoadPath(p1.x, p1.y, connectLine.side, connectLine.x, connectLine.y, pcOppositeSide(connectLine.side))
              const color = nodeColor(connectLine.sourceId)
              return <path d={d} fill="none" stroke={color} strokeWidth={2} strokeDasharray="6 4" strokeOpacity={0.8} style={{ pointerEvents: 'none' }} />
            })()}

            {/* Checkpoints */}
            {checkpoints.map(c => {
              const x = c.x ?? 0, y = c.y ?? 0
              const color = nodeColor(c.id)
              const isDragging = dragRef.current?.id === c.id
              const isRenaming = renaming?.id === c.id
              const isTarget = connectLine?.targetId === c.id
              const showPin = hoveredId === c.id || connectLine?.sourceId === c.id || selectedForConnect === c.id
              const isFlipped = flippedNodes.has(c.id)
              const hasMedia = !!c.media
              const labelTrunc = c.label.length > 16 ? c.label.slice(0, 15) + '…' : c.label
              const contentPreview = c.content ? pcContentPreview(c.content) : null
              const contentMissing = !!c.content && contentPreview === null
              return (
                <g
                  key={c.id}
                  onPointerDown={e => handleNodePointerDown(e, c.id)}
                  onPointerEnter={() => { if (!dragRef.current && !connectRef.current) setHoveredId(c.id) }}
                  onPointerLeave={() => setHoveredId(null)}
                  onDoubleClick={e => { e.stopPropagation(); setRenaming({ id: c.id, label: c.label }); setCtxMenu(null) }}
                  onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ nodeId: c.id, screenX: e.clientX, screenY: e.clientY }) }}
                  style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                >
                  <rect x={x + 3} y={y + 3} width={PW} height={PH} rx={16} fill="rgba(0,0,0,0.06)" />
                  {isTarget && <rect x={x - 4} y={y - 4} width={PW + 8} height={PH + 8} rx={20} fill="none" stroke={color} strokeWidth={2} strokeOpacity={0.6} strokeDasharray="4 3" />}
                  <clipPath id={`pclip-${c.id}`}><rect x={x} y={y} width={PW} height={PH} rx={16} /></clipPath>
                  <rect x={x} y={y} width={PW} height={PH} rx={16} fill={isFlipped ? (dark ? '#162032' : '#F1F5F9') : (dark ? '#1E293B' : 'white')} stroke={color} strokeWidth={1.5} />

                  {!isFlipped && hasMedia && c.media!.type !== 'emoji' && (() => {
                    const cx = x + PW / 2, cy = y + PH / 2
                    const offX = c.media!.offsetX ?? 0, offY = c.media!.offsetY ?? 0, mScale = c.media!.scale ?? 1
                    return (
                      <image
                        href={c.media!.value} x={x} y={y} width={PW} height={PH}
                        preserveAspectRatio="xMidYMid slice" clipPath={`url(#pclip-${c.id})`}
                        transform={`translate(${cx + offX} ${cy + offY}) scale(${mScale}) translate(${-cx} ${-cy})`}
                        style={{ pointerEvents: 'none' }}
                      />
                    )
                  })()}
                  {!isFlipped && hasMedia && c.media!.type === 'emoji' && (
                    <text x={x + PW / 2} y={y + PH / 2 - 6} textAnchor="middle" dominantBaseline="central" fontSize={44} style={{ pointerEvents: 'none', userSelect: 'none' }}>{c.media!.value}</text>
                  )}
                  {!isFlipped && !hasMedia && (
                    <text x={x + PW / 2} y={y + PH / 2 - 6} textAnchor="middle" dominantBaseline="central" fontSize={22} fill={dark ? '#334155' : '#CBD5E1'} style={{ pointerEvents: 'none', userSelect: 'none' }}>?</text>
                  )}
                  {!isFlipped && (
                    <>
                      <rect x={x} y={y + PH - 22} width={PW} height={22} fill={dark ? 'rgba(15,23,42,0.72)' : 'rgba(255,255,255,0.85)'} style={{ pointerEvents: 'none' }} />
                      {isRenaming ? (
                        <foreignObject x={x + 8} y={y + PH - 22} width={PW - 16} height={20}>
                          <input
                            autoFocus value={renaming!.label}
                            onChange={e => setRenaming(r => r ? { ...r, label: e.target.value } : r)}
                            onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') handleRenameConfirm(); if (e.key === 'Escape') setRenaming(null) }}
                            onBlur={handleRenameConfirm}
                            style={{ width: '100%', fontSize: 11, border: 'none', outline: 'none', background: 'transparent', fontWeight: 600, color: dark ? '#E2E8F0' : '#1E293B' }}
                          />
                        </foreignObject>
                      ) : (
                        <text x={x + PW / 2} y={y + PH - 10} textAnchor="middle" fontSize={11} fontWeight={600} fill={dark ? '#E2E8F0' : '#1E293B'} style={{ pointerEvents: 'none', userSelect: 'none' }}>{labelTrunc}</text>
                      )}
                    </>
                  )}

                  {isFlipped && (
                    <>
                      {isRenaming ? (
                        <foreignObject x={x + 10} y={y + 8} width={PW - 20} height={20}>
                          <input
                            autoFocus value={renaming!.label}
                            onChange={e => setRenaming(r => r ? { ...r, label: e.target.value } : r)}
                            onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') handleRenameConfirm(); if (e.key === 'Escape') setRenaming(null) }}
                            onBlur={handleRenameConfirm}
                            style={{ width: '100%', fontSize: 12, fontWeight: 700, border: 'none', outline: 'none', background: 'transparent', color: dark ? '#E2E8F0' : '#1E293B' }}
                          />
                        </foreignObject>
                      ) : (
                        <text x={x + PW / 2} y={y + 22} textAnchor="middle" fontSize={12} fontWeight={700} fill={dark ? '#E2E8F0' : '#1E293B'} style={{ pointerEvents: 'none', userSelect: 'none' }}>{labelTrunc}</text>
                      )}
                      <line x1={x + 16} y1={y + 32} x2={x + PW - 16} y2={y + 32} stroke={dark ? '#334155' : '#E2E8F0'} strokeWidth={1} />
                      {contentPreview ? (
                        <>
                          <text x={x + PW / 2} y={y + 46} textAnchor="middle" fontSize={8.5} fontWeight={700} fill={color} style={{ pointerEvents: 'none', userSelect: 'none' }}>{c.content!.type.toUpperCase()}</text>
                          {pcWrapLines(contentPreview, 16).slice(0, 3).map((line, i) => (
                            <text key={i} x={x + PW / 2} y={y + 60 + i * 13} textAnchor="middle" fontSize={10} fill={dark ? '#CBD5E1' : '#475569'} style={{ pointerEvents: 'none', userSelect: 'none' }}>{line}</text>
                          ))}
                        </>
                      ) : (
                        <text x={x + PW / 2} y={y + 58} textAnchor="middle" fontSize={8.5} fill={dark ? '#475569' : '#94A3B8'} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                          {contentMissing ? 'linked item removed' : 'no content linked'}
                        </text>
                      )}
                    </>
                  )}

                  {showPin && (['top', 'bottom', 'left', 'right'] as PalaceSide[]).map(side => {
                    const p = pcAnchor(c, side)
                    return (
                      <g key={side} onPointerDown={e => handlePinPointerDown(e, c.id, side)} style={{ cursor: 'crosshair' }}>
                        <circle cx={p.x} cy={p.y} r={22} fill="transparent" />
                        <circle cx={p.x} cy={p.y} r={5} fill={color} stroke="white" strokeWidth={2} style={{ pointerEvents: 'none' }} />
                      </g>
                    )
                  })}
                </g>
              )
            })}

            {checkpoints.length === 0 && (
              <text x={0} y={0} textAnchor="middle" dominantBaseline="middle" fontSize={14} fill="#94A3B8" style={{ cursor: 'pointer' }}
                onClick={e => { e.stopPropagation(); persist([{ id: 'start', label: 'Front door', x: -PW / 2, y: -PH / 2 }]) }}
              >
                Click to create your first checkpoint
              </text>
            )}
          </g>
        </svg>
      </div>

      {/* Floating title */}
      <div className="absolute top-3 left-3 z-10" onClick={e => e.stopPropagation()}>
        <input
          value={pTitle}
          onChange={e => { setPTitle(e.target.value); savePalace(e.target.value, checkpointsRef.current, connectionsRef.current) }}
          placeholder="Palace title…"
          className={`text-sm font-semibold rounded-xl px-3 py-2.5 shadow-sm border focus:outline-none focus:ring-1 focus:ring-xero-green w-44 ${dark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white/90 backdrop-blur border-xero-border text-gray-800'}`}
        />
      </div>

      {/* Floating add-checkpoint button */}
      <div className="absolute top-3 right-3 z-10" onClick={e => e.stopPropagation()}>
        <button
          onClick={handleAddFloating}
          className={`text-xs px-3 py-3 rounded-xl font-medium shadow-sm transition-colors border flex items-center gap-1.5 ${dark ? 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600' : 'bg-white/90 border-xero-border text-gray-600 hover:bg-white'}`}
        >
          <IconAdd className="w-3.5 h-3.5" strokeWidth={2.5} /> Checkpoint
        </button>
      </div>

      {/* Context menu */}
      {ctxMenu && ctxNode && (() => {
        const vw = typeof window !== 'undefined' ? window.innerWidth  : 400
        const vh = typeof window !== 'undefined' ? window.innerHeight : 700
        const menuW = Math.min(190, vw - 24)
        const showAbove = ctxMenu.screenY > vh * 0.5
        const rawLeft = ctxMenu.screenX - menuW / 2
        const clampedLeft = Math.max(8, Math.min(rawLeft, vw - menuW - 8))
        const maxMenuH = showAbove ? ctxMenu.screenY - 12 : vh - ctxMenu.screenY - 12
        return (
          <div
            className="fixed z-40 bg-white dark:bg-slate-800 border border-xero-border dark:border-slate-700 rounded-2xl shadow-2xl flex flex-col"
            style={{
              left: clampedLeft, top: ctxMenu.screenY, width: menuW,
              maxHeight: Math.max(180, maxMenuH), overflowY: 'auto',
              transform: showAbove ? 'translateY(calc(-100% - 8px))' : 'translateY(8px)',
            }}
            onClick={e => e.stopPropagation()}
            onContextMenu={e => e.preventDefault()}
          >
            <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-700">
              <p className="text-xs font-semibold text-gray-600 dark:text-slate-300 truncate">{ctxNode.label}</p>
            </div>
            {[
              { icon: <IconEdit className="w-3.5 h-3.5" strokeWidth={2} />, label: 'Edit checkpoint', onClick: () => { setEditingId(ctxNode.id); setCtxMenu(null) } },
              ...(ctxNode.content && pcContentPreview(ctxNode.content) ? [
                { icon: <IconExternalLink className="w-3.5 h-3.5" strokeWidth={2} />, label: 'Go to linked item', onClick: () => {
                  const content = ctxNode.content!
                  setCtxMenu(null)
                  navigate(`/learn/language/${pcContentRoute(content.type)}?highlight=${content.id}`)
                }},
              ] : []),
              { icon: <IconAdd className="w-3.5 h-3.5" strokeWidth={2} />, label: 'Add next checkpoint', onClick: handleAddNext },
              { icon: <IconLink className="w-3.5 h-3.5" strokeWidth={2} />, label: 'Connect', onClick: () => {
                const node = checkpointsRef.current.find(c => c.id === ctxMenu.nodeId)
                if (!node) return
                setCtxMenu(null)
                const anchor = pcAnchor(node, 'right')
                connectRef.current = { sourceId: ctxMenu.nodeId, x: anchor.x, y: anchor.y, targetId: null, side: 'right' }
                setConnectLine(connectRef.current)
              }},
              { icon: <IconCut className="w-3.5 h-3.5" strokeWidth={2} />, label: 'Clear connections', onClick: () => {
                const id = ctxMenu.nodeId
                setCtxMenu(null)
                persist(checkpointsRef.current, connectionsRef.current.filter(cn => cn.from !== id && cn.to !== id))
              }},
            ].map(item => (
              <button key={item.label} onClick={item.onClick}
                className="flex items-center gap-2.5 w-full text-left text-sm text-gray-700 dark:text-slate-300 px-3 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-t border-gray-50 dark:border-slate-700/50">
                <span className="text-gray-400 dark:text-slate-500 flex-shrink-0">{item.icon}</span>
                {item.label}
              </button>
            ))}
            <button
              onClick={() => { setConfirmDelete(ctxNode.id); setCtxMenu(null) }}
              className="flex items-center gap-2.5 w-full text-left text-sm text-red-500 px-3 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-gray-100 dark:border-slate-700"
            >
              <IconDelete className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} /> Delete
            </button>
          </div>
        )
      })()}

      {editingCheckpoint && (
        <CheckpointEditor
          checkpoint={editingCheckpoint}
          onSave={next => persist(checkpointsRef.current.map(c => c.id === next.id ? next : c))}
          onClose={() => setEditingId(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          message="This checkpoint and its roads will be deleted."
          confirmLabel="Delete"
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

// ─── MemoryPalaceView (folder tree + canvas) ─────────────────────────────────────

function MemoryPalaceView() {
  const { palaces, isLoading, createPalace, movePalaceToFolder, renamePalaceFolder, deletePalaceFolder, deletePalace } = useMemoryPalaceList()
  const [palaceParams, setPalaceParams] = useSearchParams()
  const selectedId = palaceParams.get('palace') ? Number(palaceParams.get('palace')) : null
  function setSelectedId(id: number | null) {
    setPalaceParams(p => { id !== null ? p.set('palace', String(id)) : p.delete('palace'); return p })
  }
  const [mobileOpen, setMobileOpen] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<string | null>(null)

  const tree = buildFolderTree(palaces)

  async function handleNewPalace(folder: string | null) {
    const p = await createPalace('New Memory Palace', folder)
    setSelectedId(p.id)
    setMobileOpen(false)
  }

  const selectedTitle = palaces.find(p => p.id === selectedId)?.title ?? 'Memory Palace'

  function TreePane() {
    return (
      <ItemFolderTree<MemoryPalaceMeta>
        tree={tree}
        selectedId={selectedId}
        itemLabel={p => p.title || 'Untitled'}
        itemIcon={<IconPalace className="w-3.5 h-3.5 flex-shrink-0 text-gray-400 dark:text-slate-500" strokeWidth={1.75} />}
        newItemLabel="New palace"
        onSelectItem={p => { setSelectedId(p.id); setMobileOpen(false) }}
        onNewItem={handleNewPalace}
        onDeleteItem={p => setConfirmDeleteId(p.id)}
        onRenameFolder={renamePalaceFolder}
        onDeleteFolder={path => setConfirmDeleteFolder(path)}
        onMoveItemToFolder={(id, folder) => movePalaceToFolder(id, folder)}
      />
    )
  }

  return (
    <div className="flex h-full overflow-hidden relative">
      <div className="hidden md:flex w-52 flex-shrink-0 flex-col border-r border-xero-border dark:border-slate-700 bg-white dark:bg-slate-900">
        {isLoading ? <p className="text-xs text-gray-400 px-2 py-2">Loading…</p> : <TreePane />}
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 h-full bg-white dark:bg-slate-900 flex flex-col shadow-2xl">
            <TreePane />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="md:hidden flex items-center gap-2 px-3 py-2 border-b border-xero-border dark:border-slate-700 flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors p-3 -m-1">
            <IconMenu className="w-4 h-4" strokeWidth={2} />
          </button>
          <span className="text-sm text-gray-700 dark:text-slate-200 font-medium truncate">{selectedTitle}</span>
        </div>

        {selectedId !== null ? (
          <MemoryPalaceCanvas key={selectedId} palaceId={selectedId} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm px-6 text-center">
            {isLoading ? 'Loading…' : 'Select or create a memory palace to get started.'}
          </div>
        )}
      </div>

      {confirmDeleteId !== null && (
        <ConfirmDialog
          message="This memory palace and all its checkpoints will be deleted."
          confirmLabel="Delete"
          onConfirm={async () => { await deletePalace(confirmDeleteId); if (selectedId === confirmDeleteId) setSelectedId(null); setConfirmDeleteId(null) }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
      {confirmDeleteFolder !== null && (
        <ConfirmDialog
          message={`Delete folder "${confirmDeleteFolder}" and everything inside it?`}
          confirmLabel="Delete"
          onConfirm={async () => { await deletePalaceFolder(confirmDeleteFolder); setConfirmDeleteFolder(null) }}
          onCancel={() => setConfirmDeleteFolder(null)}
        />
      )}
    </div>
  )
}

// ─── LanguageTab (inner: Vocabulary · Sentence · Scenario) ───────────────────

function LanguageTab() {
  const { t } = useLanguage()
  const { dark } = useDarkMode()

  const LANG_VIEWS = [
    { path: 'scenario', label: t.scenario,      icon: <IconLayers   className="w-3.5 h-3.5" strokeWidth={2} /> },
    { path: 'sentence', label: t.sentence,      icon: <IconMessage  className="w-3.5 h-3.5" strokeWidth={2} /> },
    { path: 'vocab',    label: t.vocab,         icon: <IconBook     className="w-3.5 h-3.5" strokeWidth={2} /> },
    { path: 'palace',   label: t.memoryPalace,  icon: <IconPalace   className="w-3.5 h-3.5" strokeWidth={2} /> },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className={`flex items-center gap-1 px-4 py-2.5 border-b flex-shrink-0 overflow-hidden ${dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-xero-border'}`}>
        <div className="flex overflow-x-auto gap-1 flex-1" style={{ scrollbarWidth: 'none' }}>
          {LANG_VIEWS.map(v => (
            <NavLink
              key={v.path}
              to={`/learn/language/${v.path}`}
              className={({ isActive }) =>
                `text-xs px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-gray-900 dark:bg-slate-200 text-white dark:text-slate-900'
                    : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`
              }
            >
              {v.icon}{v.label}
            </NavLink>
          ))}
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="vocab"    element={<VocabView />} />
          <Route path="sentence" element={<SentenceView />} />
          <Route path="scenario" element={<ScenarioView />} />
          <Route path="palace"   element={<MemoryPalaceView />} />
          <Route index element={<Navigate to="scenario" replace />} />
        </Routes>
      </div>
    </div>
  )
}

// ─── Learn tab (Notes · Mindmap · Language) ───────────────────────────────────

export function LearnSectionTab() {
  const { t } = useLanguage()

  const VIEWS: SectionView[] = [
    { path: '/learn/notes',    label: t.notes,           icon: <IconNote     className="w-4 h-4" strokeWidth={1.75} /> },
    { path: '/learn/mindmap',  label: t.mindmap,         icon: <IconMindmap  className="w-4 h-4" strokeWidth={1.75} /> },
    { path: '/learn/language', label: t.languageSection, icon: <IconLanguage className="w-4 h-4" strokeWidth={1.75} /> },
    { path: '/learn/chains',   label: t.chains,          icon: <IconLink     className="w-4 h-4" strokeWidth={1.75} /> },
  ]

  return (
    <SectionShell
      title={t.learn}
      views={VIEWS}
      trackerPaths={[]}
      defaultRedirect="/learn/notes"
      storageKey="learn:lastPath"
    >
      {() => (
        <>
          <Route path="notes"   element={<NotesView />} />
          <Route path="mindmap" element={<MindmapView />} />
          <Route path="language/*" element={<LanguageTab />} />
          <Route path="chains/*" element={<ChainsView />} />
        </>
      )}
    </SectionShell>
  )
}

// ─── Life tab (Log · Meal · Sport · Reminders) ────────────────────────────────

const LIFE_TRACKER_PATHS = ['/life/log', '/life/meal', '/life/sport']

export function LifeTab() {
  const { t } = useLanguage()

  const VIEWS: SectionView[] = [
    { path: '/life/log',   label: t.log,   icon: <IconLog     className="w-4 h-4" strokeWidth={1.75} /> },
    { path: '/life/meal',  label: t.meal,  icon: <IconMeal    className="w-4 h-4" strokeWidth={1.75} /> },
    { path: '/life/sport', label: t.sport, icon: <IconWorkout className="w-4 h-4" strokeWidth={1.75} /> },
  ]

  return (
    <SectionShell
      title={t.life}
      views={VIEWS}
      trackerPaths={LIFE_TRACKER_PATHS}
      defaultRedirect="/life/log"
      storageKey=""
    >
      {(openSidebar) => (
        <>
          <Route path="log/*"   element={<LogTab  onMenuClick={openSidebar} />} />
          <Route path="meal/*"  element={<MealTab onMenuClick={openSidebar} />} />
          <Route path="sport/*" element={<SportTab onMenuClick={openSidebar} />} />
        </>
      )}
    </SectionShell>
  )
}

// ─── Legacy alias ─────────────────────────────────────────────────────────────

export function WorkspaceTab() { return <LearnSectionTab /> }
export { WorkspaceTab as NotebookTab }
