import { useState, useRef, useEffect, useContext, createContext, type ReactNode } from 'react'
import { IconChevronRight, IconFolder, IconAdd } from '../../lib/icons'
import { collectFolderPaths, type FolderNode } from '../../lib/folderTree'

export const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)

// A generic, reusable nested folder tree — one row per folder (expand/collapse,
// rename, new subfolder, delete) with items as leaf rows underneath. Shared by
// every "browse a tree, open one thing at a time" view (Notes, Memory Palace,
// Vocabulary, Sentences, Scenarios) so the interaction pattern — and its touch
// fixes — only exist in one place.
//
// A folder only exists once something is filed into it (there's no separate
// "create empty folder" primitive) — creating a folder is just creating a new
// item with that folder path, same as Notes does.

interface AnyItem { id: number | string; folder: string | null }

interface TreeCtxType<T extends AnyItem> {
  selectedId: T['id'] | null
  onSelectItem: (item: T) => void
  itemLabel: (item: T) => string
  itemIcon?: ReactNode
  newItemLabel: string
  onNewItem: (folder: string | null) => void
  onDeleteItem?: (item: T) => void
  onRenameFolder: (oldPath: string, newPath: string) => void
  onDeleteFolder: (path: string) => void
  onMoveItemToFolder: (id: T['id'], folder: string | null) => void
  onMoveFolder: (dragPath: string, targetPath: string | null) => void
  showItems: boolean
  selectedFolder?: string | null
  onSelectFolder?: (path: string) => void
  allFolderPaths: string[]
  expanded: Set<string>
  onToggle: (path: string) => void
  renaming: { path: string; val: string } | null
  setRenaming: (v: { path: string; val: string } | null) => void
  commitRename: () => void
  addingFolderIn: string | null
  startAddingFolder: (parentPath: string) => void
  folderInputVal: string
  setFolderInputVal: (v: string) => void
  commitFolderAdd: () => void
  ctxMenu: { x: number; y: number; type: 'folder' | 'item'; folderPath?: string; itemId?: T['id'] } | null
  openCtx: (e: React.MouseEvent, type: 'folder' | 'item', folderPath?: string, itemId?: T['id']) => void
  closeCtx: () => void
}
// Context value is generic per-tree-instance; each ItemFolderTree provides its own.
const TreeCtx = createContext<TreeCtxType<AnyItem> | null>(null)
function useTreeCtx<T extends AnyItem>() {
  return useContext(TreeCtx) as unknown as TreeCtxType<T>
}

function FolderTreeRow<T extends AnyItem>({ node, depth }: { node: FolderNode<T>; depth: number }) {
  const ctx = useTreeCtx<T>()
  const isOpen = ctx.expanded.has(node.path)
  const isRenaming = ctx.renaming?.path === node.path
  const isActiveFolder = ctx.selectedFolder === node.path
  const [dragOver, setDragOver] = useState(false)

  return (
    <>
      <div
        {...(!isTouch && {
          draggable: true,
          onDragStart: (e: React.DragEvent) => { e.stopPropagation(); e.dataTransfer.setData('folderPath', node.path); e.dataTransfer.effectAllowed = 'move' },
        })}
        style={{ paddingLeft: depth * 14 + 4 }}
        className={`group flex items-center gap-1 py-1.5 pr-1 ${isTouch ? 'min-h-[44px]' : ''} rounded-lg cursor-pointer select-none transition-colors ${dragOver ? 'bg-xero-green/10 dark:bg-xero-green/20 ring-1 ring-xero-green/30 dark:ring-xero-green/50' : isActiveFolder ? 'bg-xero-green/10 dark:bg-xero-green/20' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`}
        onClick={() => { if (!isOpen) ctx.onToggle(node.path); ctx.onSelectFolder?.(node.path) }}
        onContextMenu={e => { e.preventDefault(); ctx.openCtx(e, 'folder', node.path) }}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false) }}
        onDrop={e => {
          e.preventDefault(); e.stopPropagation(); setDragOver(false)
          const itemId = e.dataTransfer.getData('treeItemId')
          if (itemId) { ctx.onMoveItemToFolder(itemId as T['id'], node.path); return }
          const folderPath = e.dataTransfer.getData('folderPath')
          if (folderPath && folderPath !== node.path && !node.path.startsWith(folderPath + '/')) ctx.onMoveFolder(folderPath, node.path)
        }}
      >
        <IconChevronRight
          className={`w-3 h-3 text-gray-400 flex-shrink-0 transition-transform duration-100 ${isOpen ? 'rotate-90' : ''}`}
          strokeWidth={2.5}
          onClick={e => { e.stopPropagation(); ctx.onToggle(node.path) }}
        />
        <IconFolder className="w-3.5 h-3.5 text-amber-400 dark:text-amber-500 flex-shrink-0" strokeWidth={1.75} />
        {isRenaming ? (
          <input
            autoFocus draggable={false}
            value={ctx.renaming!.val}
            onChange={e => ctx.setRenaming({ path: node.path, val: e.target.value })}
            onKeyDown={e => { e.stopPropagation(); if (e.key === 'Escape') ctx.setRenaming(null) }}
            onBlur={ctx.commitRename}
            onClick={e => e.stopPropagation()}
            className="flex-1 min-w-0 text-xs bg-white dark:bg-slate-700 border border-xero-green rounded px-2 py-1.5 outline-none"
          />
        ) : (
          <span className={`text-xs flex-1 truncate ${isActiveFolder ? 'text-xero-green font-medium' : 'text-gray-700 dark:text-slate-300'}`}>{node.name}</span>
        )}
        {!isRenaming && (
          <div className={`flex items-center gap-2 flex-shrink-0 ml-auto ${isTouch ? '' : 'opacity-30 group-hover:opacity-100'}`}>
            <button title={ctx.newItemLabel} onClick={e => { e.stopPropagation(); ctx.onNewItem(node.path) }} className={`${isTouch ? 'p-3 min-w-[44px] min-h-[44px]' : 'p-1.5'} rounded flex items-center justify-center text-gray-400 hover:text-xero-green`}>
              <IconAdd className="w-3 h-3" strokeWidth={2.5} />
            </button>
            <button title="More" onClick={e => { e.stopPropagation(); ctx.openCtx(e, 'folder', node.path) }} className={`${isTouch ? 'p-3 min-w-[44px] min-h-[44px]' : 'p-1.5'} rounded flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 text-[10px] leading-none font-bold`}>•••</button>
          </div>
        )}
      </div>
      {isOpen && (
        <>
          {ctx.addingFolderIn === node.path && (
            <div style={{ paddingLeft: (depth + 1) * 14 + 4 }} className="flex items-center gap-1 py-0.5 pr-1">
              <span className="w-3 flex-shrink-0" />
              <IconFolder className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" strokeWidth={1.75} />
              <input
                autoFocus value={ctx.folderInputVal}
                onChange={e => ctx.setFolderInputVal(e.target.value)}
                onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') ctx.commitFolderAdd(); if (e.key === 'Escape') ctx.startAddingFolder('') }}
                onBlur={ctx.commitFolderAdd}
                placeholder="Folder name…"
                className="flex-1 text-xs bg-white dark:bg-slate-700 border border-xero-green rounded px-2 py-1.5 outline-none"
              />
            </div>
          )}
          {node.children.map(c => <FolderTreeRow<T> key={c.path} node={c} depth={depth + 1} />)}
          {ctx.showItems && node.items.map(item => <ItemTreeRow<T> key={item.id} item={item} depth={depth + 1} />)}
        </>
      )}
    </>
  )
}

function ItemTreeRow<T extends AnyItem>({ item, depth }: { item: T; depth: number }) {
  const ctx = useTreeCtx<T>()
  const active = ctx.selectedId === item.id
  return (
    <div
      {...(!isTouch && {
        draggable: true,
        onDragStart: (e: React.DragEvent) => { e.dataTransfer.setData('treeItemId', String(item.id)); e.dataTransfer.effectAllowed = 'move' },
      })}
      style={{ paddingLeft: depth * 14 + 4 }}
      className={`group flex items-center gap-1.5 py-1.5 pr-1 ${isTouch ? 'min-h-[44px]' : ''} rounded-lg cursor-pointer ${active ? 'bg-xero-green/10 dark:bg-xero-green/20' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`}
      onClick={() => ctx.onSelectItem(item)}
      onContextMenu={e => { e.preventDefault(); ctx.openCtx(e, 'item', undefined, item.id) }}
    >
      <span className="w-3 flex-shrink-0" />
      {ctx.itemIcon}
      <span className={`text-xs flex-1 truncate ${active ? 'text-xero-green font-medium' : 'text-gray-600 dark:text-slate-400'}`}>{ctx.itemLabel(item)}</span>
      <button onClick={e => { e.stopPropagation(); ctx.openCtx(e, 'item', undefined, item.id) }}
        className={`${isTouch ? 'p-3 min-w-[44px] min-h-[44px]' : 'p-1.5 opacity-30 group-hover:opacity-100'} rounded flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 text-[10px] font-bold leading-none`}>•••</button>
    </div>
  )
}

export interface ItemFolderTreeProps<T extends AnyItem> {
  tree: FolderNode<T>
  selectedId: T['id'] | null
  itemLabel: (item: T) => string
  itemIcon?: ReactNode
  newItemLabel: string
  onSelectItem: (item: T) => void
  /** Called both for "new item in this folder" and to instantiate a brand-new folder (folder = the freshly-typed path). */
  onNewItem: (folder: string | null) => void
  onDeleteItem?: (item: T) => void
  onRenameFolder: (oldPath: string, newPath: string) => void
  onDeleteFolder: (path: string) => void
  onMoveItemToFolder: (id: T['id'], folder: string | null) => void
  /** When false, items aren't rendered as tree leaves — use for large flat collections
   *  (e.g. hundreds of vocabulary words) where a row per item would flood the sidebar.
   *  Pair with selectedFolder/onSelectFolder to drive a separate item-list view showing
   *  the active folder's contents. Defaults to true (items shown inline, as in Notes). */
  showItems?: boolean
  /** Highlights the given folder path as active. Only meaningful with showItems=false. */
  selectedFolder?: string | null
  /** Called when a folder row is clicked, alongside the default expand/collapse. */
  onSelectFolder?: (path: string) => void
}

export function ItemFolderTree<T extends AnyItem>({
  tree, selectedId, itemLabel, itemIcon, newItemLabel,
  onSelectItem, onNewItem, onDeleteItem, onRenameFolder, onDeleteFolder, onMoveItemToFolder,
  showItems = true, selectedFolder, onSelectFolder,
}: ItemFolderTreeProps<T>) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [renaming, setRenaming] = useState<{ path: string; val: string } | null>(null)
  const [addingFolderIn, setAddingFolderIn] = useState<string | null>(null)
  const [folderInputVal, setFolderInputVal] = useState('')
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; type: 'folder' | 'item'; folderPath?: string; itemId?: T['id'] } | null>(null)
  const [folderPickerFor, setFolderPickerFor] = useState<T['id'] | null>(null)
  const [folderMovePickerOpen, setFolderMovePickerOpen] = useState(false)
  const ctxMenuRef = useRef<HTMLDivElement>(null)

  const allFolderPaths = collectFolderPaths(tree)

  useEffect(() => {
    if (!ctxMenu) return
    function dismiss(ev: MouseEvent) { if (!ctxMenuRef.current?.contains(ev.target as Node)) { setCtxMenu(null); setFolderPickerFor(null); setFolderMovePickerOpen(false) } }
    document.addEventListener('mousedown', dismiss)
    return () => document.removeEventListener('mousedown', dismiss)
  }, [ctxMenu])

  function startAddingFolder(parentPath: string) {
    setAddingFolderIn(parentPath)
    setFolderInputVal('')
    if (parentPath) setExpanded(s => new Set([...s, parentPath]))
  }

  function commitFolderAdd() {
    if (addingFolderIn === null) return
    if (!folderInputVal.trim()) { setAddingFolderIn(null); return }
    const name = folderInputVal.trim()
    const newPath = addingFolderIn ? `${addingFolderIn}/${name}` : name
    setAddingFolderIn(null)
    setFolderInputVal('')
    onNewItem(newPath)
    setExpanded(s => new Set([...s, newPath]))
  }

  function commitRename() {
    const r = renaming
    setRenaming(null)
    if (!r) return
    const newName = r.val.trim()
    if (!newName || newName === r.path.split('/').pop()) return
    const parts = r.path.split('/')
    parts[parts.length - 1] = newName
    const newPath = parts.join('/')
    onRenameFolder(r.path, newPath)
    setExpanded(s => { const n = new Set(s); n.delete(r.path); n.add(newPath); return n })
  }

  function handleMoveFolder(dragPath: string, targetPath: string | null) {
    if (targetPath !== null && (targetPath === dragPath || targetPath.startsWith(dragPath + '/'))) return
    const name = dragPath.split('/').pop()!
    const newPath = targetPath ? `${targetPath}/${name}` : name
    if (newPath === dragPath) return
    onRenameFolder(dragPath, newPath)
    setExpanded(s => { const n = new Set(s); n.delete(dragPath); n.add(newPath); return n })
  }

  function openCtx(e: React.MouseEvent, type: 'folder' | 'item', folderPath?: string, itemId?: T['id']) {
    const x = Math.min(e.clientX, window.innerWidth - 175)
    const y = Math.min(e.clientY, window.innerHeight - 260)
    setCtxMenu({ x, y, type, folderPath, itemId })
  }

  const ctxValue: TreeCtxType<T> = {
    selectedId, onSelectItem, itemLabel, itemIcon, newItemLabel,
    onNewItem, onDeleteItem, onRenameFolder, onDeleteFolder, onMoveItemToFolder, onMoveFolder: handleMoveFolder,
    showItems, selectedFolder, onSelectFolder,
    allFolderPaths,
    expanded, onToggle: path => setExpanded(s => { const n = new Set(s); n.has(path) ? n.delete(path) : n.add(path); return n }),
    renaming, setRenaming, commitRename,
    addingFolderIn, startAddingFolder, folderInputVal, setFolderInputVal, commitFolderAdd,
    ctxMenu, openCtx, closeCtx: () => setCtxMenu(null),
  }

  const ctxItem = ctxMenu?.type === 'item'
    ? [...tree.children.flatMap(function flat(n): T[] { return [...n.items, ...n.children.flatMap(flat)] }), ...tree.items].find(i => i.id === ctxMenu.itemId) ?? null
    : null

  return (
    <TreeCtx.Provider value={ctxValue as unknown as TreeCtxType<AnyItem>}>
      <div className="flex-1 overflow-y-auto p-2 relative">
        <button onClick={() => onNewItem(null)} className="w-full text-left text-xs text-gray-400 hover:text-xero-green transition-colors px-2 py-2 flex items-center gap-1.5">
          <IconAdd className="w-3.5 h-3.5" strokeWidth={2.5} /> {newItemLabel}
        </button>
        {addingFolderIn === '' && (
          <div className="flex items-center gap-1 py-0.5 pr-1 pl-2">
            <IconFolder className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" strokeWidth={1.75} />
            <input
              autoFocus value={folderInputVal}
              onChange={e => setFolderInputVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitFolderAdd(); if (e.key === 'Escape') setAddingFolderIn(null) }}
              onBlur={commitFolderAdd}
              placeholder="Folder name…"
              className="flex-1 text-xs bg-white dark:bg-slate-700 border border-xero-green rounded px-2 py-1.5 outline-none"
            />
          </div>
        )}
        {tree.children.map(c => <FolderTreeRow<T> key={c.path} node={c} depth={0} />)}
        {showItems && tree.items.map(item => <ItemTreeRow<T> key={item.id} item={item} depth={0} />)}
        <button onClick={() => startAddingFolder('')} className="w-full text-left text-xs text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors px-2 py-2 mt-1 flex items-center gap-1.5">
          <IconFolder className="w-3 h-3" strokeWidth={2} /> New folder
        </button>
        {tree.children.length === 0 && (!showItems || tree.items.length === 0) && (
          <p className="text-xs text-gray-400 px-2 py-2">Nothing here yet.</p>
        )}

        {ctxMenu && (
          <div ref={ctxMenuRef} className="fixed z-40 bg-white dark:bg-slate-800 border border-xero-border dark:border-slate-700 rounded-xl shadow-2xl py-1 min-w-[160px] max-h-[min(320px,calc(100vh-1rem))] overflow-y-auto"
            style={{ left: ctxMenu.x, top: Math.max(8, ctxMenu.y) }} onClick={e => e.stopPropagation()}>
            {ctxMenu.type === 'folder' ? (
              <>
                <button onClick={() => { startAddingFolder(ctxMenu.folderPath!); setCtxMenu(null) }}
                  className="w-full text-left text-xs px-3 py-2.5 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700">New subfolder</button>
                <button onClick={() => { setRenaming({ path: ctxMenu.folderPath!, val: ctxMenu.folderPath!.split('/').pop()! }); setCtxMenu(null) }}
                  className="w-full text-left text-xs px-3 py-2.5 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700">Rename</button>
                <button onClick={() => setFolderMovePickerOpen(v => !v)}
                  className="w-full text-left text-xs px-3 py-2.5 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-between">
                  Move to folder <IconChevronRight className={`w-3 h-3 flex-shrink-0 transition-transform ${folderMovePickerOpen ? 'rotate-90' : ''}`} strokeWidth={2.5} />
                </button>
                {folderMovePickerOpen && (
                  <div className="bg-gray-50 dark:bg-slate-900/50 max-h-40 overflow-y-auto border-y border-gray-100 dark:border-slate-700">
                    <button onClick={() => { handleMoveFolder(ctxMenu.folderPath!, null); setFolderMovePickerOpen(false); setCtxMenu(null) }}
                      className="w-full text-left text-xs pl-6 pr-3 py-2.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700">Root (no folder)</button>
                    {allFolderPaths
                      .filter(f => f !== ctxMenu.folderPath && !f.startsWith(ctxMenu.folderPath + '/'))
                      .map(f => (
                        <button key={f} onClick={() => { handleMoveFolder(ctxMenu.folderPath!, f); setFolderMovePickerOpen(false); setCtxMenu(null) }}
                          className="w-full text-left text-xs pl-6 pr-3 py-2.5 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 truncate">{f}</button>
                      ))}
                  </div>
                )}
                <button onClick={() => { onDeleteFolder(ctxMenu.folderPath!); setCtxMenu(null) }}
                  className="w-full text-left text-xs px-3 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">Delete folder</button>
              </>
            ) : (
              <>
                <button onClick={() => setFolderPickerFor(folderPickerFor === ctxMenu.itemId ? null : ctxMenu.itemId!)}
                  className="w-full text-left text-xs px-3 py-2.5 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-between">
                  Move to folder <IconChevronRight className={`w-3 h-3 flex-shrink-0 transition-transform ${folderPickerFor === ctxMenu.itemId ? 'rotate-90' : ''}`} strokeWidth={2.5} />
                </button>
                {folderPickerFor === ctxMenu.itemId && (
                  <div className="bg-gray-50 dark:bg-slate-900/50 max-h-40 overflow-y-auto border-y border-gray-100 dark:border-slate-700">
                    <button onClick={() => { onMoveItemToFolder(ctxMenu.itemId!, null); setFolderPickerFor(null); setCtxMenu(null) }}
                      className="w-full text-left text-xs pl-6 pr-3 py-2.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700">No folder</button>
                    {allFolderPaths.map(f => (
                      <button key={f} onClick={() => { onMoveItemToFolder(ctxMenu.itemId!, f); setFolderPickerFor(null); setCtxMenu(null) }}
                        className="w-full text-left text-xs pl-6 pr-3 py-2.5 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 truncate">{f}</button>
                    ))}
                  </div>
                )}
                {onDeleteItem && ctxItem && (
                  <button onClick={() => { onDeleteItem(ctxItem); setCtxMenu(null) }}
                    className="w-full text-left text-xs px-3 py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">Delete</button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </TreeCtx.Provider>
  )
}
