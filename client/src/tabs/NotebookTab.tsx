import { useState, useRef, useEffect } from 'react'
import { NavLink, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useNotes, useMindmap, useVocabulary, useAllReminders } from '../hooks/useNotebook'
import type { MMNode, VocabCard } from '../hooks/useNotebook'
import { ConfirmDialog } from '../components/web/ConfirmDialog'

// ─── Mindmap helpers ──────────────────────────────────────────────────────────

const DEPTH_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899']
const NODE_W = 140
const NODE_H = 36

function getDepth(nodes: MMNode[], id: string, depth = 0): number {
  const node = nodes.find(n => n.id === id)
  if (!node || node.parentId === null) return depth
  return getDepth(nodes, node.parentId, depth + 1)
}

function nodeColor(nodes: MMNode[], id: string): string {
  return DEPTH_COLORS[getDepth(nodes, id) % DEPTH_COLORS.length]
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

// ─── NotesView ────────────────────────────────────────────────────────────────

function NotesView() {
  const { notes, isLoading, createNote, saveNote, deleteNote } = useNotes()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [localTitle, setLocalTitle] = useState('')
  const [localContent, setLocalContent] = useState('')
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    if (selectedId === null) return
    const note = notes.find(n => n.id === selectedId)
    if (note) {
      setLocalTitle(note.title)
      setLocalContent(note.content)
    }
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

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

  async function handleNew() {
    const note = await createNote()
    setSelectedId(note.id)
  }

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  async function handleDelete(id: number) {
    await deleteNote(id)
    if (selectedId === id) setSelectedId(null)
  }

  return (
    <div className="flex h-full">
      {/* Sidebar list — hidden on mobile when a note is open */}
      <div className={`${selectedId !== null ? 'hidden md:flex' : 'flex'} w-full md:w-60 border-r border-gray-100 flex-col bg-gray-50 flex-shrink-0`}>
        <div className="p-3 border-b border-gray-100">
          <button
            onClick={handleNew}
            className="w-full text-sm bg-xero-green text-white rounded-lg py-2 font-medium hover:bg-xero-green-dark transition-colors"
          >
            + New Note
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading && <p className="text-xs text-gray-400 p-4">Loading…</p>}
          {notes.map(n => (
            <button
              key={n.id}
              onClick={() => setSelectedId(n.id)}
              className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-white transition-colors ${
                selectedId === n.id ? 'bg-white border-l-2 border-l-xero-green' : ''
              }`}
            >
              <p className="text-sm font-medium text-gray-800 truncate">{n.title || 'Untitled'}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {new Date(n.updated_at).toLocaleDateString('de-DE')}
              </p>
            </button>
          ))}
        </div>
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
                className="md:hidden flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1 -ml-1"
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
              <div className="flex items-center gap-3">
                {saving && <span className="text-xs text-gray-400">Saving…</span>}
                <button
                  onClick={() => setConfirmDeleteId(selectedId)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  Delete
                </button>
                {confirmDeleteId !== null && (
                  <ConfirmDialog
                    message="This note will be permanently deleted."
                    confirmLabel="Delete"
                    onConfirm={() => { handleDelete(confirmDeleteId); setConfirmDeleteId(null) }}
                    onCancel={() => setConfirmDeleteId(null)}
                  />
                )}
              </div>
            </div>
            <textarea
              value={localContent}
              onChange={e => { setLocalContent(e.target.value); scheduleSave(localTitle, e.target.value) }}
              placeholder="Write your note here…"
              className="flex-1 p-6 text-sm text-gray-700 bg-white resize-none outline-none placeholder-gray-300 overflow-y-auto"
            />
          </>
        )}
      </div>
    </div>
  )
}

// ─── MindmapView ──────────────────────────────────────────────────────────────

const CANVAS_W = 2400
const CANVAS_H = 1600

interface DragState {
  id: string
  offsetX: number
  offsetY: number
  startSvgX: number
  startSvgY: number
  moved: boolean
}

interface CtxMenu { nodeId: string; screenX: number; screenY: number }

function initPositions(raw: MMNode[]): MMNode[] {
  if (raw.every(n => n.x !== undefined)) return raw
  const root = raw.find(n => n.parentId === null)
  if (!root) return raw.map(n => ({ ...n, x: n.x ?? 100, y: n.y ?? 100 }))
  const childrenOf = new Map<string, MMNode[]>()
  raw.forEach(n => { if (n.parentId) { const l = childrenOf.get(n.parentId) ?? []; l.push(n); childrenOf.set(n.parentId, l) } })
  function leafCount(id: string): number { const ch = childrenOf.get(id) ?? []; return ch.length === 0 ? 1 : ch.reduce((s, c) => s + leafCount(c.id), 0) }
  const posMap = new Map<string, { x: number; y: number }>()
  const totalLeaves = leafCount(root.id)
  const startY = Math.max(80, (CANVAS_H - totalLeaves * 80) / 2)
  function place(id: string, depth: number, yFrom: number, yTo: number) {
    posMap.set(id, { x: 80 + depth * 220, y: (yFrom + yTo) / 2 - NODE_H / 2 })
    const ch = childrenOf.get(id) ?? []; const total = leafCount(id); let cursor = yFrom
    ch.forEach(c => { const sl = (leafCount(c.id) / total) * (yTo - yFrom); place(c.id, depth + 1, cursor, cursor + sl); cursor += sl })
  }
  place(root.id, 0, startY, startY + totalLeaves * 80)
  return raw.map(n => ({ ...n, x: n.x ?? (posMap.get(n.id)?.x ?? 100), y: n.y ?? (posMap.get(n.id)?.y ?? 100) }))
}

function MindmapView() {
  const { mindmap, saveMindmap } = useMindmap()
  const [nodes, setNodes] = useState<MMNode[]>([])
  const [mmTitle, setMmTitle] = useState('My Mindmap')
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null)
  const [renaming, setRenaming] = useState<{ id: string; label: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const initialized = useRef(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const nodesRef = useRef<MMNode[]>([])
  const titleRef = useRef(mmTitle)

  useEffect(() => { nodesRef.current = nodes }, [nodes])
  useEffect(() => { titleRef.current = mmTitle }, [mmTitle])

  useEffect(() => {
    if (initialized.current || mindmap === undefined) return
    const raw = mindmap ? mindmap.nodes : [{ id: 'root', label: 'Finance Concepts', parentId: null }]
    setNodes(initPositions(raw))
    if (mindmap) setMmTitle(mindmap.title)
    initialized.current = true
  }, [mindmap])

  function persist(newNodes: MMNode[]) {
    setNodes(newNodes)
    nodesRef.current = newNodes
    saveMindmap(titleRef.current, newNodes)
  }

  function clientToSvg(clientX: number, clientY: number) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return { x: clientX, y: clientY }
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  function handleNodePointerDown(e: React.PointerEvent, id: string) {
    e.stopPropagation()
    const node = nodesRef.current.find(n => n.id === id)
    if (!node) return
    const { x, y } = clientToSvg(e.clientX, e.clientY)
    dragRef.current = { id, offsetX: x - (node.x ?? 0), offsetY: y - (node.y ?? 0), startSvgX: x, startSvgY: y, moved: false }
    setCtxMenu(null)
  }

  function handleSvgPointerMove(e: React.PointerEvent) {
    const d = dragRef.current
    if (!d) return
    const { x, y } = clientToSvg(e.clientX, e.clientY)
    if (!d.moved && Math.hypot(x - d.startSvgX, y - d.startSvgY) > 4) dragRef.current = { ...d, moved: true }
    setNodes(prev => prev.map(n => n.id === d.id ? { ...n, x: Math.max(0, x - d.offsetX), y: Math.max(0, y - d.offsetY) } : n))
  }

  function handleSvgPointerUp(e: React.PointerEvent) {
    const d = dragRef.current
    if (!d) return
    dragRef.current = null
    if (!d.moved) {
      setCtxMenu({ nodeId: d.id, screenX: e.clientX, screenY: e.clientY })
    } else {
      saveMindmap(titleRef.current, nodesRef.current)
    }
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
    persist(nodesRef.current.map(n => n.id === renaming.id ? { ...n, label: renaming.label } : n))
    setRenaming(null)
  }

  function handleDelete(id: string) {
    const toRemove = new Set(getDescendantIds(nodesRef.current, id))
    persist(nodesRef.current.filter(n => !toRemove.has(n.id)))
    setConfirmDelete(null)
    setCtxMenu(null)
  }

  const ctxNode = ctxMenu ? nodes.find(n => n.id === ctxMenu.nodeId) ?? null : null

  return (
    <div className="h-full relative overflow-hidden">
      {/* Canvas */}
      <div
        className="h-full overflow-auto bg-[#F8FAFC] cursor-default"
        onPointerMove={handleSvgPointerMove}
        onPointerUp={handleSvgPointerUp}
        onPointerLeave={handleSvgPointerUp}
        onClick={() => setCtxMenu(null)}
      >
        <svg
          ref={svgRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="block select-none"
          style={{ touchAction: dragRef.current ? 'none' : 'auto' }}
        >
          {/* Dot grid */}
          <defs>
            <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="14" cy="14" r="1" fill="#CBD5E1" />
            </pattern>
          </defs>
          <rect width={CANVAS_W} height={CANVAS_H} fill="url(#dots)" />

          {/* Connections */}
          {nodes.map(n => {
            if (!n.parentId) return null
            const p = nodes.find(p => p.id === n.parentId)
            if (!p) return null
            const x1 = (p.x ?? 0) + NODE_W, y1 = (p.y ?? 0) + NODE_H / 2
            const x2 = n.x ?? 0,            y2 = (n.y ?? 0) + NODE_H / 2
            const t = Math.max(60, Math.abs(x2 - x1) * 0.45)
            const color = nodeColor(nodes, n.id)
            return (
              <path
                key={`e-${n.id}`}
                d={`M ${x1} ${y1} C ${x1 + t} ${y1} ${x2 - t} ${y2} ${x2} ${y2}`}
                fill="none" stroke={color} strokeWidth={2} strokeOpacity={0.35} strokeLinecap="round"
              />
            )
          })}

          {/* Nodes */}
          {nodes.map(n => {
            const x = n.x ?? 0, y = n.y ?? 0
            const color = nodeColor(nodes, n.id)
            const isRoot = n.parentId === null
            const isDragging = dragRef.current?.id === n.id
            const isRenaming = renaming?.id === n.id
            const label = n.label.length > 18 ? n.label.slice(0, 17) + '…' : n.label
            return (
              <g
                key={n.id}
                onPointerDown={e => handleNodePointerDown(e, n.id)}
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              >
                {/* Shadow */}
                <rect x={x+2} y={y+2} width={NODE_W} height={NODE_H} rx={10} fill="rgba(0,0,0,0.06)" />
                {/* Card */}
                <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={10} fill="white" stroke={color} strokeWidth={isRoot ? 2 : 1.5} />
                {/* Color accent bar */}
                <rect x={x} y={y} width={5} height={NODE_H} rx={3} fill={color} />
                <rect x={x+2} y={y} width={3} height={NODE_H} fill={color} />

                {isRenaming ? (
                  <foreignObject x={x + 12} y={y + 6} width={NODE_W - 20} height={NODE_H - 12}>
                    <input
                      autoFocus
                      value={renaming.label}
                      onChange={e => setRenaming(r => r ? { ...r, label: e.target.value } : r)}
                      onKeyDown={e => {
                        e.stopPropagation()
                        if (e.key === 'Enter') handleRenameConfirm()
                        if (e.key === 'Escape') setRenaming(null)
                      }}
                      onBlur={handleRenameConfirm}
                      style={{ width: '100%', fontSize: 11, border: 'none', outline: 'none', background: 'transparent', fontWeight: isRoot ? 600 : 400 }}
                    />
                  </foreignObject>
                ) : (
                  <text
                    x={x + 14} y={y + NODE_H / 2}
                    dominantBaseline="middle"
                    fontSize={11}
                    fontWeight={isRoot ? 700 : 400}
                    fill="#1E293B"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {label}
                  </text>
                )}
              </g>
            )
          })}

          {/* Empty state */}
          {nodes.length === 0 && (
            <text x={CANVAS_W / 2} y={CANVAS_H / 2} textAnchor="middle" dominantBaseline="middle" fontSize={14} fill="#94A3B8"
              style={{ cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); persist([{ id: 'root', label: 'Finance Concepts', parentId: null, x: CANVAS_W/2 - NODE_W/2, y: CANVAS_H/2 - NODE_H/2 }]) }}
            >
              Click to create your first node
            </text>
          )}
        </svg>
      </div>

      {/* Floating title */}
      <div className="absolute top-3 left-3 z-10" onClick={e => e.stopPropagation()}>
        <input
          value={mmTitle}
          onChange={e => { setMmTitle(e.target.value); saveMindmap(e.target.value, nodesRef.current) }}
          placeholder="Map title…"
          className="text-sm font-semibold bg-white/90 backdrop-blur border border-xero-border rounded-xl px-3 py-1.5 shadow-sm focus:outline-none focus:ring-1 focus:ring-xero-green w-44"
        />
      </div>

      {/* Context menu */}
      {ctxMenu && ctxNode && (
        <div
          className="fixed z-40 bg-white border border-xero-border rounded-2xl shadow-2xl overflow-hidden min-w-[140px]"
          style={{ left: ctxMenu.screenX, top: ctxMenu.screenY, transform: 'translate(-50%, calc(-100% - 8px))' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="px-4 py-2 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-500 truncate max-w-[120px]">{ctxNode.label}</p>
          </div>
          <button
            onClick={() => { setRenaming({ id: ctxNode.id, label: ctxNode.label }); setCtxMenu(null) }}
            className="flex items-center gap-2.5 w-full text-left text-sm text-gray-700 px-4 py-2.5 hover:bg-gray-50 transition-colors"
          >
            <span className="text-base">✏️</span> Rename
          </button>
          <button
            onClick={handleAddChild}
            className="flex items-center gap-2.5 w-full text-left text-sm text-gray-700 px-4 py-2.5 hover:bg-gray-50 transition-colors border-t border-gray-50"
          >
            <span className="text-base">➕</span> Add child
          </button>
          {ctxNode.parentId !== null && (
            <button
              onClick={() => { setConfirmDelete(ctxNode.id); setCtxMenu(null) }}
              className="flex items-center gap-2.5 w-full text-left text-sm text-red-500 px-4 py-2.5 hover:bg-red-50 transition-colors border-t border-gray-50"
            >
              <span className="text-base">🗑</span> Delete
            </button>
          )}
        </div>
      )}

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

// ─── VocabView ────────────────────────────────────────────────────────────────

const LANGS = ['de', 'en', 'tr', 'fr', 'es']
const LANG_LABELS: Record<string, string> = {
  de: '🇩🇪 DE', en: '🇬🇧 EN', tr: '🇹🇷 TR', fr: '🇫🇷 FR', es: '🇪🇸 ES',
}

type NewWord = { word: string; translation: string; language: string; example: string }

function VocabView() {
  const { vocab, isLoading, addWord, deleteWord, review } = useVocabulary()
  const [confirmDeleteVocabId, setConfirmDeleteVocabId] = useState<number | null>(null)
  const [langFilter, setLangFilter] = useState<string | null>(null)
  const [reviewMode, setReviewMode] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [reviewIdx, setReviewIdx] = useState(0)
  const [showAdd, setShowAdd] = useState(false)
  const [newWord, setNewWord] = useState<NewWord>({ word: '', translation: '', language: 'de', example: '' })

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const dueCards = vocab.filter(v => new Date(v.due_at) <= today)
  const filtered = langFilter ? vocab.filter(v => v.language === langFilter) : vocab
  const reviewCard: VocabCard | null = dueCards[reviewIdx] ?? null

  async function handleRate(quality: number) {
    if (!reviewCard) return
    await review(reviewCard.id, quality)
    setFlipped(false)
    setReviewIdx(i => i + 1)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newWord.word.trim() || !newWord.translation.trim()) return
    await addWord({ ...newWord, example: newWord.example.trim() || undefined })
    setNewWord({ word: '', translation: '', language: newWord.language, example: '' })
    setShowAdd(false)
  }

  if (reviewMode) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 p-6 h-full">
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setReviewMode(false); setReviewIdx(0); setFlipped(false) }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Exit Review
          </button>
          <span className="text-sm text-gray-400">{Math.min(reviewIdx, dueCards.length)}/{dueCards.length} reviewed</span>
        </div>

        {reviewIdx >= dueCards.length ? (
          <div className="text-center">
            <p className="text-5xl mb-4">🎉</p>
            <p className="text-xl font-semibold text-gray-800">All caught up!</p>
            <p className="text-sm text-gray-400 mt-2">{dueCards.length} card{dueCards.length !== 1 ? 's' : ''} reviewed.</p>
            <button
              onClick={() => { setReviewMode(false); setReviewIdx(0) }}
              className="mt-4 text-sm bg-xero-green text-white px-5 py-2 rounded-lg font-medium"
            >
              Done
            </button>
          </div>
        ) : reviewCard && (
          <div className="w-full max-w-sm">
            <div
              onClick={() => setFlipped(f => !f)}
              className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm cursor-pointer min-h-[180px] flex flex-col items-center justify-center gap-3 select-none hover:shadow-md transition-shadow"
            >
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                {flipped ? 'Translation' : 'Word'}
              </p>
              <p className="text-2xl font-bold text-gray-900 text-center">
                {flipped ? reviewCard.translation : reviewCard.word}
              </p>
              {flipped && reviewCard.example && (
                <p className="text-xs text-gray-400 text-center italic">"{reviewCard.example}"</p>
              )}
              {!flipped && <p className="text-xs text-gray-300 mt-2">Tap to reveal translation</p>}
            </div>

            {flipped && (
              <div className="grid grid-cols-4 gap-2 mt-4">
                {[
                  { q: 0, label: 'Again', cls: 'bg-red-100 text-red-700 hover:bg-red-200' },
                  { q: 2, label: 'Hard',  cls: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
                  { q: 4, label: 'Good',  cls: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
                  { q: 5, label: 'Easy',  cls: 'bg-sky-100 text-sky-700 hover:bg-sky-200' },
                ].map(({ q, label, cls }) => (
                  <button
                    key={q}
                    onClick={() => handleRate(q)}
                    className={`text-xs font-semibold rounded-lg py-2.5 transition-colors ${cls}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">
            {dueCards.length} card{dueCards.length !== 1 ? 's' : ''} due
          </p>
          {dueCards.length > 0 && (
            <button
              onClick={() => setReviewMode(true)}
              className="text-xs bg-xero-green text-white px-3 py-1.5 rounded-lg font-medium hover:bg-xero-green-dark transition-colors"
            >
              Review Now
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setLangFilter(null)}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${!langFilter ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            All
          </button>
          {LANGS.map(l => (
            <button
              key={l}
              onClick={() => setLangFilter(langFilter === l ? null : l)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${langFilter === l ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {LANG_LABELS[l]}
            </button>
          ))}
          <button
            onClick={() => setShowAdd(v => !v)}
            className="text-xs bg-xero-green text-white px-3 py-1.5 rounded-lg font-medium hover:bg-xero-green-dark transition-colors ml-1"
          >
            + Add Word
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-gray-50 rounded-xl p-4 mb-5 flex flex-wrap items-center gap-3">
          <input
            value={newWord.word}
            onChange={e => setNewWord(p => ({ ...p, word: e.target.value }))}
            placeholder="Word"
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-36 focus:outline-none focus:ring-1 focus:ring-xero-green"
          />
          <input
            value={newWord.translation}
            onChange={e => setNewWord(p => ({ ...p, translation: e.target.value }))}
            placeholder="Translation"
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-36 focus:outline-none focus:ring-1 focus:ring-xero-green"
          />
          <input
            value={newWord.example}
            onChange={e => setNewWord(p => ({ ...p, example: e.target.value }))}
            placeholder="Example sentence (optional)"
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 flex-1 min-w-[160px] focus:outline-none focus:ring-1 focus:ring-xero-green"
          />
          <select
            value={newWord.language}
            onChange={e => setNewWord(p => ({ ...p, language: e.target.value }))}
            className="text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none"
          >
            {LANGS.map(l => <option key={l} value={l}>{LANG_LABELS[l]}</option>)}
          </select>
          <button type="submit" className="text-sm bg-xero-green text-white px-4 py-2 rounded-lg font-medium">Add</button>
          <button type="button" onClick={() => setShowAdd(false)} className="text-sm text-gray-400 hover:text-gray-600 px-1">Cancel</button>
        </form>
      )}

      {isLoading && <p className="text-sm text-gray-400">Loading…</p>}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map(card => (
          <div key={card.id} className="bg-white border border-gray-100 rounded-xl p-4 relative group hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between mb-1.5">
              <span className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                {LANG_LABELS[card.language] ?? card.language}
              </span>
              <button
                onClick={() => setConfirmDeleteVocabId(card.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-base leading-none"
              >
                ×
              </button>
              {confirmDeleteVocabId === card.id && (
                <ConfirmDialog
                  message={`"${card.word}" will be permanently deleted.`}
                  confirmLabel="Delete"
                  onConfirm={() => { deleteWord(card.id); setConfirmDeleteVocabId(null) }}
                  onCancel={() => setConfirmDeleteVocabId(null)}
                />
              )}
            </div>
            <p className="text-base font-bold text-gray-900 mt-1">{card.word}</p>
            <p className="text-sm text-gray-500">{card.translation}</p>
            {card.example && (
              <p className="text-[10px] text-gray-400 mt-1.5 italic">"{card.example}"</p>
            )}
            <div className="flex items-center justify-between mt-2.5">
              <span className={`text-[9px] ${new Date(card.due_at) <= today ? 'text-red-400' : 'text-gray-300'}`}>
                Due {new Date(card.due_at).toLocaleDateString('de-DE')}
              </span>
              <span className="text-[9px] text-gray-300">×{card.repetitions}</span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && !isLoading && (
        <p className="text-sm text-gray-400 text-center py-12">No words yet. Add your first word!</p>
      )}
    </div>
  )
}

// ─── RemindersView ────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINS  = ['00', '15', '30', '45']

function RemindersView() {
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

  return (
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="text-sm bg-xero-green text-white px-5 py-2 rounded-lg font-medium disabled:opacity-40 hover:bg-xero-green-dark transition-colors"
                >
                  Add Reminder
                </button>
              </div>
            </form>
          )}
        </div>

        {isLoading && <p className="text-sm text-gray-400">Loading…</p>}

        {/* Grouped sections */}
        {renderGroup('Overdue', overdue,  'overdue',  'text-red-500',      'bg-red-100 text-red-600')}
        {renderGroup('Today',   todayGrp, 'today',    'text-xero-green',   'bg-xero-green/10 text-xero-green')}
        {renderGroup('Upcoming',upcoming, 'upcoming', 'text-blue-500',     'bg-blue-50 text-blue-600')}

        {/* No date */}
        {noDate.length > 0 && (
          <div className="mb-5">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2.5">No Date</p>
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
              Completed ({done.length})
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
                    <button onClick={() => setConfirmRemoveId(r.id)} className="text-gray-300 hover:text-red-400 transition-colors text-base leading-none">×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pending.length === 0 && done.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📝</p>
            <p className="text-sm font-medium text-gray-600 mb-1">No reminders yet</p>
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
}

// ─── NotebookTab ──────────────────────────────────────────────────────────────

const VIEWS = [
  { path: '/notebook/notes',     label: 'Notes',      icon: '📓' },
  { path: '/notebook/mindmap',   label: 'Mindmap',    icon: '🧠' },
  { path: '/notebook/vocab',     label: 'Wortschatz', icon: '📚' },
  { path: '/notebook/reminders', label: 'Reminders',  icon: '📝' },
]

export function NotebookTab() {
  const { pathname } = useLocation()

  useEffect(() => {
    localStorage.setItem('notebook:lastPath', pathname)
  }, [pathname])

  const currentLabel = VIEWS.find(v => pathname === v.path)?.label ?? 'Notebook'

  const [sidebarOpen, setSidebarOpen] = useState(false)

  function NavItems() {
    return (
      <nav className="flex-1 py-4 overflow-y-auto">
        {VIEWS.map(v => (
          <NavLink
            key={v.path}
            to={v.path}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-6 py-3 text-sm transition-colors text-left border-l-[3px] ${
                isActive
                  ? 'border-xero-green text-xero-green bg-xero-navy-light'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-xero-navy-light'
              }`
            }
          >
            <span className="text-base w-5 text-center">{v.icon}</span>
            <span className="font-medium">{v.label}</span>
          </NavLink>
        ))}
      </nav>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar — desktop permanent, mobile overlay */}
      <aside className="hidden md:flex w-[220px] h-full bg-xero-navy flex-col flex-shrink-0">
        <div className="px-6 py-5 border-b border-xero-navy-light">
          <p className="text-white font-bold text-lg tracking-tight">Notebook</p>
        </div>
        <NavItems />
      </aside>

      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-[220px] h-full bg-xero-navy flex flex-col shadow-2xl">
            <div className="px-6 py-5 border-b border-xero-navy-light">
              <p className="text-white font-bold text-lg tracking-tight">Notebook</p>
            </div>
            <NavItems />
          </aside>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-xero-bg">
        <header className="flex items-center gap-3 px-4 md:px-8 py-4 bg-white border-b border-xero-border flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-gray-900">{currentLabel}</h1>
        </header>
        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route path="notes"     element={<NotesView />} />
            <Route path="mindmap"   element={<MindmapView />} />
            <Route path="vocab"     element={<VocabView />} />
            <Route path="reminders" element={<RemindersView />} />
            <Route path="*"         element={<Navigate to="/notebook/notes" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}
