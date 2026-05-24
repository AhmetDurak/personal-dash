import { useState, useRef, useEffect } from 'react'
import { NavLink, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useNotes, useMindmap, useVocabulary, useAllReminders } from '../hooks/useNotebook'
import type { MMNode, MMEdge, VocabCard } from '../hooks/useNotebook'
import { ConfirmDialog } from '../components/web/ConfirmDialog'
import { useLanguage } from '../hooks/useLanguage'
import { useDarkMode } from '../hooks/useDarkMode'

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

// ─── NotesView ────────────────────────────────────────────────────────────────

function NotesView() {
  const { t } = useLanguage()
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
            + {t.newNote}
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
              <p className="text-sm font-medium text-gray-800 truncate">{n.title || t.untitled}</p>
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
  const { t } = useLanguage()
  const { dark } = useDarkMode()
  const { mindmap, saveMindmap } = useMindmap()
  const [nodes, setNodes] = useState<MMNode[]>([])
  const [mmTitle, setMmTitle] = useState('My Mindmap')
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null)
  const [renaming, setRenaming] = useState<{ id: string; label: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [edges, setEdges] = useState<MMEdge[]>([])
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [connectLine, setConnectLine] = useState<{ sourceId: string; x: number; y: number; targetId: string | null } | null>(null)
  const [flippedNodes, setFlippedNodes] = useState<Set<string>>(new Set())
  const [editingBack, setEditingBack] = useState(false)
  const initialized = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const connectRef = useRef<{ sourceId: string; x: number; y: number; targetId: string | null } | null>(null)
  const panRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null)
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

  useEffect(() => {
    if (initialized.current || mindmap === undefined) return
    const raw = mindmap ? mindmap.nodes : [{ id: 'root', label: 'Finance Concepts', parentId: null }]
    setNodes(initPositions(raw))
    if (mindmap) {
      setMmTitle(mindmap.title)
      setEdges(mindmap.edges ?? [])
    }
    initialized.current = true
  }, [mindmap])

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
    const p = panRef.current
    if (p) {
      const el = containerRef.current
      if (el) {
        el.scrollLeft = p.scrollLeft - (e.clientX - p.startX)
        el.scrollTop  = p.scrollTop  - (e.clientY - p.startY)
      }
      return
    }
    const { x, y } = clientToSvg(e.clientX, e.clientY)
    const d = dragRef.current
    if (d) {
      if (!d.moved && Math.hypot(x - d.startSvgX, y - d.startSvgY) > 4) dragRef.current = { ...d, moved: true }
      setNodes(prev => prev.map(n => n.id === d.id ? { ...n, x: Math.max(0, x - d.offsetX), y: Math.max(0, y - d.offsetY) } : n))
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

  function handleSvgPointerUp(_e: React.PointerEvent) {
    if (panRef.current) { panRef.current = null; return }
    const d = dragRef.current
    if (d) {
      dragRef.current = null
      if (!d.moved) {
        // single click → flip face
        setFlippedNodes(prev => {
          const next = new Set(prev)
          if (next.has(d.id)) next.delete(d.id)
          else next.add(d.id)
          return next
        })
        setCtxMenu(null)
      } else {
        saveMindmap(titleRef.current, nodesRef.current)
      }
      return
    }
    const c = connectRef.current
    if (c) {
      connectRef.current = null
      setConnectLine(null)
      setHoveredId(null)
      if (c.targetId && c.targetId !== c.sourceId) {
        const already = edgesRef.current.some(e =>
          (e.from === c.sourceId && e.to === c.targetId) ||
          (e.from === c.targetId && e.to === c.sourceId)
        )
        if (!already) {
          const newEdge: MMEdge = { id: `e${Date.now()}`, from: c.sourceId, to: c.targetId }
          persist(nodesRef.current, [...edgesRef.current, newEdge])
        }
      }
    }
  }

  function handlePinPointerDown(e: React.PointerEvent, sourceId: string) {
    e.stopPropagation()
    const { x, y } = clientToSvg(e.clientX, e.clientY)
    connectRef.current = { sourceId, x, y, targetId: null }
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

  return (
    <div className="h-full relative overflow-hidden">
      {/* Canvas */}
      <div
        ref={containerRef}
        className={`h-full overflow-auto ${dark ? 'bg-[#0F172A]' : 'bg-[#F8FAFC]'}`}
        style={{ cursor: panRef.current ? 'grabbing' : 'default' }}
        onPointerMove={handleSvgPointerMove}
        onPointerUp={handleSvgPointerUp}
        onPointerLeave={handleSvgPointerUp}
        onClick={() => setCtxMenu(null)}
        onContextMenu={e => e.preventDefault()}
      >
        <svg
          ref={svgRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="block select-none"
          style={{ touchAction: dragRef.current ? 'none' : 'auto' }}
          onContextMenu={e => e.preventDefault()}
        >
          {/* Dot grid + arrow markers */}
          <defs>
            <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="14" cy="14" r="1" fill="#CBD5E1" />
            </pattern>
            <marker id="arrowEnd" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <polygon points="0 0, 7 3.5, 0 7" fill="#94A3B8" />
            </marker>
            <marker id="arrowStart" markerWidth="7" markerHeight="7" refX="1" refY="3.5" orient="auto-start-reverse">
              <polygon points="0 0, 7 3.5, 0 7" fill="#94A3B8" />
            </marker>
          </defs>
          <rect
            width={CANVAS_W} height={CANVAS_H} fill="url(#dots)"
            style={{ cursor: 'grab' }}
            onPointerDown={e => {
              if (dragRef.current || connectRef.current) return
              const el = containerRef.current
              if (!el) return
              panRef.current = { startX: e.clientX, startY: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop }
            }}
          />

          {/* Parent-child connections — click to disconnect */}
          {nodes.map(n => {
            if (!n.parentId) return null
            const p = nodes.find(p => p.id === n.parentId)
            if (!p) return null
            const x1 = (p.x ?? 0) + NODE_W, y1 = (p.y ?? 0) + NODE_H / 2
            const x2 = n.x ?? 0,            y2 = (n.y ?? 0) + NODE_H / 2
            const t = Math.max(60, Math.abs(x2 - x1) * 0.45)
            const color = nodeColor(n.id)
            const d = `M ${x1} ${y1} C ${x1 + t} ${y1} ${x2 - t} ${y2} ${x2} ${y2}`
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
            const fromIsLeft = (from.x ?? 0) <= (to.x ?? 0)
            const x1 = fromIsLeft ? (from.x ?? 0) + NODE_W : (from.x ?? 0)
            const y1 = (from.y ?? 0) + NODE_H / 2
            const x2 = fromIsLeft ? (to.x ?? 0) : (to.x ?? 0) + NODE_W
            const y2 = (to.y ?? 0) + NODE_H / 2
            const t  = Math.max(60, Math.abs(x2 - x1) * 0.45)
            const color = nodeColor(e.from)
            const dPath = `M ${x1} ${y1} C ${x1 + (fromIsLeft ? t : -t)} ${y1} ${x2 + (fromIsLeft ? -t : t)} ${y2} ${x2} ${y2}`
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
            const x1 = (src.x ?? 0) + NODE_W, y1 = (src.y ?? 0) + NODE_H / 2
            const t = Math.max(60, Math.abs(connectLine.x - x1) * 0.45)
            const color = nodeColor(connectLine.sourceId)
            return (
              <path
                d={`M ${x1} ${y1} C ${x1+t} ${y1} ${connectLine.x-t} ${connectLine.y} ${connectLine.x} ${connectLine.y}`}
                fill="none" stroke={color} strokeWidth={2} strokeDasharray="6 4" strokeOpacity={0.8}
                style={{ pointerEvents: 'none' }}
              />
            )
          })()}

          {/* Nodes */}
          {nodes.map(n => {
            const x = n.x ?? 0, y = n.y ?? 0
            const color = nodeColor(n.id)
            const isRoot = n.parentId === null
            const isDragging = dragRef.current?.id === n.id
            const isRenaming = renaming?.id === n.id
            const isTarget = connectLine?.targetId === n.id
            const showPin = hoveredId === n.id || connectLine?.sourceId === n.id
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

                {/* Right-side connection pin */}
                {showPin && (
                  <circle
                    cx={x + NODE_W} cy={y + NODE_H / 2} r={5}
                    fill={color} stroke="white" strokeWidth={2}
                    style={{ cursor: 'crosshair' }}
                    onPointerDown={e => handlePinPointerDown(e, n.id)}
                  />
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
      {ctxMenu && ctxNode && (() => {
        const ctxIsFlipped = flippedNodes.has(ctxNode.id)
        return (
        <div
          className="fixed z-40 bg-white border border-xero-border rounded-2xl shadow-2xl overflow-hidden min-w-[140px]"
          style={{ left: ctxMenu.screenX, top: ctxMenu.screenY, transform: 'translate(-50%, calc(-100% - 8px))' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="px-4 py-2 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-500 truncate max-w-[120px]">{ctxIsFlipped ? (ctxNode.back ?? '(back)') : ctxNode.label}</p>
            <p className="text-[10px] text-gray-400">{ctxIsFlipped ? t.backFace : t.frontFace}</p>
          </div>
          <button
            onClick={() => {
              setEditingBack(false)
              setRenaming({ id: ctxNode.id, label: ctxNode.label })
              setCtxMenu(null)
            }}
            className="flex items-center gap-2.5 w-full text-left text-sm text-gray-700 px-4 py-2.5 hover:bg-gray-50 transition-colors"
          >
            <span className="text-base">✏️</span> {t.editFront}
          </button>
          <button
            onClick={() => {
              setEditingBack(true)
              setRenaming({ id: ctxNode.id, label: ctxNode.back ?? '' })
              setCtxMenu(null)
            }}
            className="flex items-center gap-2.5 w-full text-left text-sm text-gray-700 px-4 py-2.5 hover:bg-gray-50 transition-colors border-t border-gray-50"
          >
            <span className="text-base">↩</span> {t.editBack}
          </button>
          <button
            onClick={handleAddChild}
            className="flex items-center gap-2.5 w-full text-left text-sm text-gray-700 px-4 py-2.5 hover:bg-gray-50 transition-colors border-t border-gray-50"
          >
            <span className="text-base">➕</span> {t.addChild}
          </button>
          <button
            onClick={() => {
              const id = ctxMenu?.nodeId
              const node = nodesRef.current.find(n => n.id === id)
              if (!id || !node) return
              setCtxMenu(null)
              connectRef.current = { sourceId: id, x: (node.x ?? 0) + NODE_W, y: (node.y ?? 0) + NODE_H / 2, targetId: null }
              setConnectLine(connectRef.current)
            }}
            className="flex items-center gap-2.5 w-full text-left text-sm text-gray-700 px-4 py-2.5 hover:bg-gray-50 transition-colors border-t border-gray-50"
          >
            <span className="text-base">🔗</span> {t.connect}
          </button>
          <button
            onClick={() => {
              const id = ctxMenu?.nodeId
              if (!id) return
              setCtxMenu(null)
              persist(
                nodesRef.current.map(n => n.id === id ? { ...n, parentId: null } : n),
                edgesRef.current.filter(e => e.from !== id && e.to !== id)
              )
            }}
            className="flex items-center gap-2.5 w-full text-left text-sm text-gray-700 px-4 py-2.5 hover:bg-gray-50 transition-colors border-t border-gray-50"
          >
            <span className="text-base">✂️</span> {t.clearConnections}
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

// ─── VocabView ────────────────────────────────────────────────────────────────

const LANGS = ['de', 'en', 'tr', 'fr', 'es']
const LANG_LABELS: Record<string, string> = {
  de: '🇩🇪 DE', en: '🇬🇧 EN', tr: '🇹🇷 TR', fr: '🇫🇷 FR', es: '🇪🇸 ES',
}

type NewWord = { word: string; translation: string; language: string; example: string }

type EditCard = { id: number; word: string; translation: string; language: string; example: string; image_url: string }

function VocabView() {
  const { t } = useLanguage()
  const { vocab, isLoading, addWord, deleteWord, review, bulkImport, updateWord } = useVocabulary()
  const [confirmDeleteVocabId, setConfirmDeleteVocabId] = useState<number | null>(null)
  const [langFilter, setLangFilter] = useState<string | null>(null)
  const [reviewMode, setReviewMode] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [reviewIdx, setReviewIdx] = useState(0)
  const [showAdd, setShowAdd] = useState(false)
  const [newWord, setNewWord] = useState<NewWord>({ word: '', translation: '', language: 'de', example: '' })
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set())
  const [editCard, setEditCard] = useState<EditCard | null>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const lines = text.trim().split('\n').filter(Boolean)
    const isHeader = /word|translation/i.test(lines[0] ?? '')
    const rows = isHeader ? lines.slice(1) : lines
    const items = rows.map(row => {
      const cols = row.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
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

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editCard) return
    await updateWord(editCard.id, {
      word: editCard.word,
      translation: editCard.translation,
      language: editCard.language,
      example: editCard.example || undefined,
      image_url: editCard.image_url || undefined,
    })
    setEditCard(null)
  }

  function openEdit(card: VocabCard) {
    setEditCard({
      id: card.id,
      word: card.word,
      translation: card.translation,
      language: card.language,
      example: card.example ?? '',
      image_url: card.image_url ?? '',
    })
  }

  function toggleFlip(id: number) {
    setFlippedCards(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (reviewMode) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 p-6 h-full">
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setReviewMode(false); setReviewIdx(0); setFlipped(false) }}
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
                  { q: 0, label: t.again, cls: 'bg-red-100 text-red-700 hover:bg-red-200' },
                  { q: 2, label: t.hard,  cls: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
                  { q: 4, label: t.good,  cls: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
                  { q: 5, label: t.easy,  cls: 'bg-sky-100 text-sky-700 hover:bg-sky-200' },
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
              {t.reviewNow}
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
            + {t.addWord}
          </button>
          <button
            onClick={() => csvInputRef.current?.click()}
            className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            title="Import CSV: word,translation,language,example"
          >
            {t.importCsv}
          </button>
          <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvImport} />
          {importMsg && (
            <span className="text-xs text-xero-green font-medium">{importMsg}</span>
          )}
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
            {/* Front / Back faces */}
            <div
              className="mt-1 cursor-pointer select-none"
              onClick={() => toggleFlip(card.id)}
              onDoubleClick={e => { e.stopPropagation(); openEdit(card) }}
            >
              {flippedCards.has(card.id) ? (
                <div className="min-h-[64px] flex flex-col gap-1">
                  <p className="text-sm font-semibold text-indigo-700">{card.translation}</p>
                  {card.example && (
                    <p className="text-[10px] text-gray-400 italic">"{card.example}"</p>
                  )}
                  {card.image_url && (
                    <img src={card.image_url} alt="" className="mt-1.5 rounded-lg w-full object-cover max-h-24" />
                  )}
                  <p className="text-[9px] text-indigo-300 mt-auto pt-1">{t.tapFlipBack}</p>
                </div>
              ) : (
                <div className="min-h-[64px] flex flex-col gap-1">
                  <p className="text-base font-bold text-gray-900">{card.word}</p>
                  <p className="text-[9px] text-gray-300 mt-auto pt-1">{t.tapReveal}</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mt-2">
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

      {/* Edit modal */}
      {editCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditCard(null)}>
          <form
            onSubmit={handleEditSave}
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-gray-800">{t.editWord}</p>
            <input
              value={editCard.word}
              onChange={e => setEditCard(p => p && ({ ...p, word: e.target.value }))}
              placeholder="Word"
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-xero-green"
            />
            <input
              value={editCard.translation}
              onChange={e => setEditCard(p => p && ({ ...p, translation: e.target.value }))}
              placeholder="Translation"
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-xero-green"
            />
            <input
              value={editCard.example}
              onChange={e => setEditCard(p => p && ({ ...p, example: e.target.value }))}
              placeholder="Example / emoji hint (optional)"
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-xero-green"
            />
            <input
              value={editCard.image_url}
              onChange={e => setEditCard(p => p && ({ ...p, image_url: e.target.value }))}
              placeholder="Image / GIF URL (optional)"
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-xero-green"
            />
            {editCard.image_url && (
              <img src={editCard.image_url} alt="preview" className="w-full rounded-lg max-h-32 object-cover" />
            )}
            <select
              value={editCard.language}
              onChange={e => setEditCard(p => p && ({ ...p, language: e.target.value }))}
              className="text-sm border border-gray-200 rounded-lg px-2 py-2 w-full focus:outline-none"
            >
              {LANGS.map(l => <option key={l} value={l}>{LANG_LABELS[l]}</option>)}
            </select>
            <div className="flex gap-2 pt-1">
              <button type="submit" className="flex-1 text-sm bg-xero-green text-white py-2 rounded-lg font-medium">{t.save}</button>
              <button type="button" onClick={() => setEditCard(null)} className="flex-1 text-sm bg-gray-100 text-gray-600 py-2 rounded-lg font-medium">{t.cancel}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

// ─── RemindersView ────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINS  = ['00', '15', '30', '45']

function RemindersView() {
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
}

// ─── NotebookTab ──────────────────────────────────────────────────────────────

export function NotebookTab() {
  const { pathname } = useLocation()
  const { t } = useLanguage()

  const VIEWS = [
    { path: '/notebook/notes',     label: t.notes,     icon: '📓' },
    { path: '/notebook/mindmap',   label: t.mindmap,   icon: '🧠' },
    { path: '/notebook/vocab',     label: t.vocab,     icon: '📚' },
    { path: '/notebook/reminders', label: t.reminders, icon: '📝' },
  ]

  useEffect(() => {
    localStorage.setItem('notebook:lastPath', pathname)
  }, [pathname])

  const currentLabel = VIEWS.find(v => pathname === v.path)?.label ?? t.notebook

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
              <p className="text-white font-bold text-lg tracking-tight">{t.notebook}</p>
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
