import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLinks, type EntityLink } from '../../hooks/useLinks'
import { useNotes, type Note } from '../../hooks/useNotebook'
import { useLanguage } from '../../hooks/useLanguage'
import { IconLink, IconAdd, IconClose, IconChevronRight } from '../../lib/icons'

interface Props {
  noteId: number | string | null
  onSelect: (id: number | string) => void
}

export function ConnectionsPanel({ noteId, onSelect }: Props) {
  const { t } = useLanguage()
  const { notes } = useNotes()
  const { links, isLoading, createLink, deleteLink } = useLinks('note', noteId)
  const [expanded, setExpanded] = useState(false)
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset the "add" flow when the user jumps to a different note — otherwise
  // it stays open (and pre-filled) on whatever note is opened next.
  useEffect(() => {
    setAdding(false)
    setQuery('')
  }, [noteId])

  useEffect(() => {
    if (!adding || !inputRef.current) { setDropdownRect(null); return }
    const rect = inputRef.current.getBoundingClientRect()
    setDropdownRect({ top: rect.bottom + 4, left: rect.left, width: rect.width })
  }, [adding])

  if (noteId === null) return null
  const noteIdStr = String(noteId)

  function otherSide(link: EntityLink) {
    return link.aType === 'note' && link.aId === noteIdStr
      ? { type: link.bType, id: link.bId }
      : { type: link.aType, id: link.aId }
  }

  const resolved = links
    .map(link => {
      const other = otherSide(link)
      const otherNote = other.type === 'note' ? notes.find(n => String(n.id) === other.id) : undefined
      return otherNote ? { link, otherNote } : null
    })
    .filter((x): x is { link: EntityLink; otherNote: Note } => x !== null)

  const linkedIds = new Set(resolved.map(r => String(r.otherNote.id)))
  const candidates = notes
    .filter(n => String(n.id) !== noteIdStr && !linkedIds.has(String(n.id)) && n.title.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8)

  return (
    <div className="border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex-shrink-0">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-1.5 px-4 md:px-6 py-3 min-h-[44px] text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
      >
        <IconChevronRight className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} strokeWidth={2.5} />
        <IconLink className="w-3 h-3" strokeWidth={2} />
        <span>{t.connections}{links.length > 0 ? ` (${links.length})` : ''}</span>
        {isLoading && <span className="text-gray-400">…</span>}
      </button>

      {expanded && (
        <div className="px-4 md:px-6 pb-3 space-y-2">
          {resolved.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-slate-500">{t.noConnections}</p>
          )}
          {resolved.map(({ link, otherNote }) => (
            <div key={link.id} className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg px-3 border border-gray-100 dark:border-slate-700">
              <button onClick={() => onSelect(otherNote.id)} className="flex-1 min-w-0 text-left py-2.5 min-h-[44px] flex flex-col justify-center">
                <p className="text-xs font-medium text-gray-800 dark:text-slate-200 truncate">{otherNote.title || 'Untitled'}</p>
                {link.note && <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate">{link.note}</p>}
              </button>
              {link.createdBy === 'ai' && (
                <span title={t.createdByAI} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex-shrink-0">
                  AI
                </span>
              )}
              <button
                onClick={() => deleteLink(link.id)}
                title={t.removeConnection}
                aria-label={t.removeConnection}
                className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
              >
                <IconClose className="w-3 h-3" strokeWidth={2} />
              </button>
            </div>
          ))}

          {adding ? (
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              onBlur={() => setTimeout(() => setAdding(false), 150)}
              placeholder={t.searchNotesToLink}
              className="w-full text-xs border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-2.5 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-300 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-xero-green/30 focus:border-xero-green"
            />
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500 hover:text-xero-green transition-colors py-2.5 min-h-[44px]"
            >
              <IconAdd className="w-3 h-3" strokeWidth={2.5} /> {t.linkANote}
            </button>
          )}
        </div>
      )}

      {adding && query && dropdownRect && createPortal(
        <div
          className="fixed z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg max-h-40 overflow-y-auto"
          style={{ top: dropdownRect.top, left: dropdownRect.left, width: dropdownRect.width }}
        >
          {candidates.length === 0 && <p className="text-xs text-gray-400 dark:text-slate-500 px-3 py-2.5">—</p>}
          {candidates.map(n => (
            <button
              key={n.id}
              onPointerDown={() => { createLink('note', n.id); setQuery(''); setAdding(false) }}
              className="w-full text-left text-xs px-3 py-2.5 min-h-[44px] hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 truncate"
            >
              {n.title || 'Untitled'}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
