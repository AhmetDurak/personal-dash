import { useState, useRef, useEffect } from 'react'
import {
  IconFolder,
  IconChevronRight,
  IconChevronDown,
  IconAdd,
  IconEdit,
  IconDelete,
  IconClose,
} from '../../lib/icons'
import type { FolderNode } from '../../lib/folderTree'
import { countAllItems } from '../../lib/folderTree'

interface Props<T> {
  tree: FolderNode<T>
  selectedFolder: string | null
  onSelect: (path: string | null) => void
  onNewFolder: (parentPath: string) => void
  onRenameFolder: (oldPath: string, newPath: string) => void
  onDeleteFolder: (path: string) => void
  totalCount: number
  allLabel?: string
}

interface FolderRowProps<T> {
  node: FolderNode<T>
  depth: number
  selectedFolder: string | null
  onSelect: (path: string | null) => void
  onNewFolder: (parentPath: string) => void
  onRenameFolder: (oldPath: string, newPath: string) => void
  onDeleteFolder: (path: string) => void
}

function FolderRow<T>({
  node,
  depth,
  selectedFolder,
  onSelect,
  onNewFolder,
  onRenameFolder,
  onDeleteFolder,
}: FolderRowProps<T>) {
  const [expanded, setExpanded] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameVal, setRenameVal] = useState(node.name)
  const menuRef = useRef<HTMLDivElement>(null)
  const renameRef = useRef<HTMLInputElement>(null)
  const count = countAllItems(node)

  useEffect(() => {
    if (!menuOpen) return
    function close(e: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('touchstart', close)
    }
  }, [menuOpen])

  useEffect(() => {
    if (renaming) renameRef.current?.select()
  }, [renaming])

  const isSelected = selectedFolder === node.path

  function commitRename() {
    const newName = renameVal.trim()
    if (!newName || newName === node.name) { setRenaming(false); return }
    const parentPath = node.path.split('/').slice(0, -1).join('/')
    const newPath = parentPath ? `${parentPath}/${newName}` : newName
    onRenameFolder(node.path, newPath)
    setRenaming(false)
  }

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-lg cursor-pointer select-none px-2 py-1.5 min-h-[36px] transition-colors ${
          isSelected
            ? 'bg-xero-green/10 text-xero-green dark:text-xero-green'
            : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
        }`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onClick={() => onSelect(isSelected ? null : node.path)}
      >
        <button
          className="flex-shrink-0 p-0.5"
          onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
        >
          {node.children.length > 0
            ? (expanded
                ? <IconChevronDown className="w-3 h-3" strokeWidth={2} />
                : <IconChevronRight className="w-3 h-3" strokeWidth={2} />)
            : <span className="w-3 h-3 block" />
          }
        </button>

        <IconFolder className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.75} />

        {renaming ? (
          <input
            ref={renameRef}
            className="flex-1 min-w-0 text-xs bg-white dark:bg-slate-700 border border-xero-green rounded px-1 py-0.5 outline-none"
            value={renameVal}
            onChange={e => setRenameVal(e.target.value)}
            onClick={e => e.stopPropagation()}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') setRenaming(false)
            }}
          />
        ) : (
          <span className="flex-1 min-w-0 text-xs truncate">{node.name}</span>
        )}

        <span className="text-[10px] text-gray-400 dark:text-slate-600 flex-shrink-0 ml-auto">{count}</span>

        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition-opacity"
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
          >
            <span className="text-[10px] leading-none text-gray-500 dark:text-slate-500">···</span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-6 z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg py-1 w-36">
              <button
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                onClick={e => { e.stopPropagation(); setMenuOpen(false); onNewFolder(node.path) }}
              >
                <IconAdd className="w-3 h-3" strokeWidth={2} />
                New subfolder
              </button>
              <button
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                onClick={e => { e.stopPropagation(); setMenuOpen(false); setRenameVal(node.name); setRenaming(true) }}
              >
                <IconEdit className="w-3 h-3" strokeWidth={2} />
                Rename
              </button>
              <button
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-500 hover:bg-gray-50 dark:hover:bg-slate-700"
                onClick={e => { e.stopPropagation(); setMenuOpen(false); onDeleteFolder(node.path) }}
              >
                <IconDelete className="w-3 h-3" strokeWidth={2} />
                Delete folder
              </button>
            </div>
          )}
        </div>
      </div>

      {expanded && node.children.map(child => (
        <FolderRow
          key={child.path}
          node={child}
          depth={depth + 1}
          selectedFolder={selectedFolder}
          onSelect={onSelect}
          onNewFolder={onNewFolder}
          onRenameFolder={onRenameFolder}
          onDeleteFolder={onDeleteFolder}
        />
      ))}
    </div>
  )
}

interface NewFolderRowProps {
  parentPath: string
  onCommit: (name: string, parentPath: string) => void
  onCancel: () => void
  depth?: number
}

export function NewFolderRow({ parentPath, onCommit, onCancel, depth = 0 }: NewFolderRowProps) {
  const [val, setVal] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])

  function commit() {
    const name = val.trim()
    if (name) onCommit(name, parentPath)
    else onCancel()
  }

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1.5 min-h-[36px]"
      style={{ paddingLeft: `${8 + depth * 12}px` }}
    >
      <span className="w-3 h-3 block flex-shrink-0" />
      <IconFolder className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" strokeWidth={1.75} />
      <input
        ref={ref}
        className="flex-1 min-w-0 text-xs bg-white dark:bg-slate-700 border border-xero-green rounded px-1 py-0.5 outline-none"
        value={val}
        placeholder="Folder name"
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') onCancel()
        }}
      />
      <button className="flex-shrink-0" onClick={onCancel}>
        <IconClose className="w-3 h-3 text-gray-400" strokeWidth={2} />
      </button>
    </div>
  )
}

const WIDTH_KEY = 'folderSidebar:width'
const MIN_WIDTH = 160
const MAX_WIDTH = 400
const DEFAULT_WIDTH = 176

export function FolderSidebar<T>({
  tree,
  selectedFolder,
  onSelect,
  onNewFolder,
  onRenameFolder,
  onDeleteFolder,
  totalCount,
  allLabel = 'All',
}: Props<T>) {
  const maxWidthForViewport = () => Math.min(MAX_WIDTH, window.innerWidth - MIN_WIDTH)

  const [width, setWidth] = useState(() => {
    try {
      const stored = Number(localStorage.getItem(WIDTH_KEY))
      return stored >= MIN_WIDTH && stored <= MAX_WIDTH
        ? Math.min(stored, maxWidthForViewport())
        : DEFAULT_WIDTH
    } catch { return DEFAULT_WIDTH }
  })
  const widthRef = useRef(width)
  const draggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, width })
  useEffect(() => { widthRef.current = width }, [width])

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!draggingRef.current) return
      const delta = e.clientX - dragStartRef.current.x
      setWidth(Math.min(maxWidthForViewport(), Math.max(MIN_WIDTH, dragStartRef.current.width + delta)))
    }
    function onUp() {
      if (!draggingRef.current) return
      draggingRef.current = false
      try { localStorage.setItem(WIDTH_KEY, String(widthRef.current)) } catch { /* ignore */ }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])

  function onHandlePointerDown(e: React.PointerEvent) {
    e.preventDefault()
    draggingRef.current = true
    dragStartRef.current = { x: e.clientX, width }
  }

  return (
    <div
      className="flex flex-col h-full border-r border-gray-200 dark:border-slate-700 flex-shrink-0 relative"
      style={{ width }}
    >
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">Folders</span>
        <button
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400"
          title="New folder"
          onClick={() => onNewFolder('')}
        >
          <IconAdd className="w-3 h-3" strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-1 pb-2">
        {/* All items row */}
        <div
          className={`flex items-center gap-2 rounded-lg cursor-pointer px-2 py-1.5 min-h-[36px] transition-colors mb-0.5 ${
            selectedFolder === null
              ? 'bg-xero-green/10 text-xero-green dark:text-xero-green'
              : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
          onClick={() => onSelect(null)}
        >
          <span className="w-3 h-3 block flex-shrink-0" />
          <span className="text-xs flex-1 truncate">{allLabel}</span>
          <span className="text-[10px] text-gray-400 dark:text-slate-600">{totalCount}</span>
        </div>

        {/* Unsorted (root items) */}
        {tree.items.length > 0 && (
          <div
            className={`flex items-center gap-2 rounded-lg cursor-pointer px-2 py-1.5 min-h-[36px] transition-colors mb-0.5 ${
              selectedFolder === ''
                ? 'bg-xero-green/10 text-xero-green dark:text-xero-green'
                : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
            onClick={() => onSelect(selectedFolder === '' ? null : '')}
          >
            <span className="w-3 h-3 block flex-shrink-0" />
            <span className="text-xs flex-1 truncate italic text-gray-400 dark:text-slate-500">Unsorted</span>
            <span className="text-[10px] text-gray-400 dark:text-slate-600">{tree.items.length}</span>
          </div>
        )}

        {/* Folder tree */}
        {tree.children.map(child => (
          <FolderRow
            key={child.path}
            node={child}
            depth={0}
            selectedFolder={selectedFolder}
            onSelect={onSelect}
            onNewFolder={onNewFolder}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={onDeleteFolder}
          />
        ))}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        title="Drag to resize"
        className="group absolute top-0 h-full w-4 cursor-col-resize touch-none z-10"
        style={{ right: -12 }}
        onPointerDown={onHandlePointerDown}
      >
        {/* Visual rail sits exactly on the sidebar's true border; most of this
            handle's hit area bleeds into the neighboring pane's empty padding
            so it doesn't cover folder-row/header buttons near the edge. */}
        <div
          className="absolute top-0 h-full w-0.5 bg-transparent group-hover:bg-xero-green/30 group-active:bg-xero-green/50"
          style={{ left: 4 }}
        />
      </div>
    </div>
  )
}
