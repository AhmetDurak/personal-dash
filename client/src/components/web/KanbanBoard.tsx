import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTickets, type Ticket, type TicketStatus, type Story } from '../../hooks/useKanban'
import { IconAdd, IconClose, IconDelete } from '../../lib/icons'
import { isTouch } from './ItemFolderTree'
import { ConfirmDialog } from './ConfirmDialog'

const COLUMNS: { status: TicketStatus; label: string }[] = [
  { status: 'todo', label: 'To Do' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'done', label: 'Done' },
]

interface Props {
  story: Story
  onUpdateStory: (updates: { title?: string; description?: string }) => void
}

export function KanbanBoard({ story, onUpdateStory }: Props) {
  const { tickets, addTicket, updateTicket, moveTicket, deleteTicket } = useTickets(story.id)
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null)
  const [confirmDeleteTicket, setConfirmDeleteTicket] = useState<Ticket | null>(null)
  const [newTicketTitle, setNewTicketTitle] = useState('')
  const [addingTicket, setAddingTicket] = useState(false)
  const [descOpen, setDescOpen] = useState(story.description.trim().length > 0)
  const [dragOverStatus, setDragOverStatus] = useState<TicketStatus | null>(null)
  const [localTitle, setLocalTitle] = useState(story.title)
  const [localDescription, setLocalDescription] = useState(story.description)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setLocalTitle(story.title); setLocalDescription(story.description) }, [story.id, story.title, story.description])
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  function scheduleSave(title: string, description: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => onUpdateStory({ title, description }), 800)
  }

  function handleTitleChange(value: string) {
    setLocalTitle(value)
    scheduleSave(value, localDescription)
  }

  function handleDescriptionChange(value: string) {
    setLocalDescription(value)
    scheduleSave(localTitle, value)
  }

  const total = tickets.length
  const done = tickets.filter(t => t.status === 'done').length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)

  async function submitNewTicket(e: React.FormEvent) {
    e.preventDefault()
    if (!newTicketTitle.trim()) return
    await addTicket(newTicketTitle.trim())
    setNewTicketTitle('')
    setAddingTicket(false)
  }

  function handleDrop(e: React.DragEvent, status: TicketStatus) {
    e.preventDefault()
    setDragOverStatus(null)
    const id = Number(e.dataTransfer.getData('ticketId'))
    if (!id) return
    const columnTickets = tickets.filter(t => t.status === status && t.id !== id)
    const nextPosition = columnTickets.length ? Math.max(...columnTickets.map(t => t.position)) + 1 : 0
    moveTicket(id, status, nextPosition)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Story header + progress */}
      <div className="px-4 md:px-6 py-3 border-b border-gray-100 dark:border-slate-700 flex-shrink-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <input
            value={localTitle}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder="Story title…"
            className="text-sm font-semibold text-gray-900 dark:text-slate-100 bg-transparent dark:bg-transparent outline-none flex-1 min-w-0 placeholder-gray-300 dark:placeholder-slate-600"
          />
          <span className="text-xs text-gray-400 dark:text-slate-500 flex-shrink-0">{done}/{total} done</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden">
          <div className="h-full bg-xero-green transition-all" style={{ width: `${pct}%` }} />
        </div>
        <button
          onClick={() => setDescOpen(o => !o)}
          className="inline-flex items-center min-h-[44px] -my-2.5 py-2.5 text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
        >
          {descOpen ? '▾ Plan' : '▸ Plan'}
        </button>
        {descOpen && (
          <textarea
            value={localDescription}
            onChange={e => handleDescriptionChange(e.target.value)}
            placeholder="What needs to be done…"
            rows={3}
            className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 resize-none focus:outline-none focus:ring-1 focus:ring-xero-green"
          />
        )}
      </div>

      {/* Columns */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full min-w-max md:min-w-0 md:grid md:grid-cols-3">
          {COLUMNS.map(col => {
            const colTickets = tickets.filter(t => t.status === col.status).sort((a, b) => a.position - b.position)
            return (
              <div
                key={col.status}
                onDragOver={e => { e.preventDefault(); setDragOverStatus(col.status) }}
                onDragLeave={() => setDragOverStatus(s => (s === col.status ? null : s))}
                onDrop={e => handleDrop(e, col.status)}
                className={`w-64 md:w-auto flex-shrink-0 flex flex-col border-r last:border-r-0 border-gray-100 dark:border-slate-700 transition-colors ${
                  dragOverStatus === col.status ? 'bg-xero-green/5 dark:bg-xero-green/10' : ''
                }`}
              >
                <div className="flex items-center justify-between px-3 py-2 flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-600 dark:text-slate-300">{col.label}</span>
                  <span className="text-[10px] text-gray-400 dark:text-slate-500">{colTickets.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1.5">
                  {colTickets.map(ticket => (
                    <div
                      key={ticket.id}
                      draggable={!isTouch}
                      onDragStart={e => { e.dataTransfer.setData('ticketId', String(ticket.id)); e.dataTransfer.effectAllowed = 'move' }}
                      onClick={() => setEditingTicket(ticket)}
                      className={`group bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-2.5 py-2 cursor-pointer hover:shadow-sm transition-shadow ${isTouch ? 'min-h-[44px]' : ''}`}
                    >
                      <p className="text-xs text-gray-800 dark:text-slate-200 break-words">{ticket.title}</p>
                    </div>
                  ))}
                  {col.status === 'todo' && (
                    addingTicket ? (
                      <form onSubmit={submitNewTicket} className="flex flex-col gap-1.5">
                        <input
                          autoFocus
                          value={newTicketTitle}
                          onChange={e => setNewTicketTitle(e.target.value)}
                          onBlur={() => { if (!newTicketTitle.trim()) setAddingTicket(false) }}
                          onKeyDown={e => { if (e.key === 'Escape') { setAddingTicket(false); setNewTicketTitle('') } }}
                          placeholder="Ticket title…"
                          className="text-xs px-2.5 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-xero-green min-h-[44px]"
                        />
                      </form>
                    ) : (
                      <button
                        onClick={() => setAddingTicket(true)}
                        className={`w-full flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500 hover:text-xero-green px-2.5 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${isTouch ? 'min-h-[44px]' : ''}`}
                      >
                        <IconAdd className="w-3.5 h-3.5" strokeWidth={2} /> Add ticket
                      </button>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {editingTicket && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditingTicket(null)} />
          <form
            onSubmit={async e => {
              e.preventDefault()
              await updateTicket(editingTicket.id, { title: editingTicket.title, description: editingTicket.description })
              const originalStatus = tickets.find(t => t.id === editingTicket.id)?.status
              if (editingTicket.status !== originalStatus) {
                const columnTickets = tickets.filter(t => t.status === editingTicket.status && t.id !== editingTicket.id)
                const nextPosition = columnTickets.length ? Math.max(...columnTickets.map(t => t.position)) + 1 : 0
                await moveTicket(editingTicket.id, editingTicket.status, nextPosition)
              }
              setEditingTicket(null)
            }}
            className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 p-5 w-96 max-w-[calc(100vw-2rem)] flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Ticket</span>
              <button type="button" onClick={() => setEditingTicket(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 p-1 -m-1 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <IconClose className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
            <div className="flex gap-1">
              {COLUMNS.map(col => (
                <button
                  key={col.status}
                  type="button"
                  onClick={() => setEditingTicket({ ...editingTicket, status: col.status })}
                  className={`flex-1 text-xs py-2.5 rounded-lg min-h-[44px] font-medium transition-colors ${
                    editingTicket.status === col.status
                      ? 'bg-xero-green text-white'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
                  }`}
                >{col.label}</button>
              ))}
            </div>
            <input
              value={editingTicket.title}
              onChange={e => setEditingTicket({ ...editingTicket, title: e.target.value })}
              className="text-sm font-medium px-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-xero-green"
            />
            <textarea
              value={editingTicket.description}
              onChange={e => setEditingTicket({ ...editingTicket, description: e.target.value })}
              placeholder="Description…"
              rows={4}
              className="text-xs px-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 resize-none focus:outline-none focus:ring-1 focus:ring-xero-green"
            />
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => { setConfirmDeleteTicket(editingTicket); setEditingTicket(null) }}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 px-2.5 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors min-h-[44px]"
              >
                <IconDelete className="w-3.5 h-3.5" strokeWidth={2} /> Delete
              </button>
              <button type="submit" className="text-xs bg-xero-green text-white px-4 py-2.5 rounded-lg font-medium hover:bg-xero-green-dark transition-colors min-h-[44px]">
                Save
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {confirmDeleteTicket && (
        <ConfirmDialog
          message={`Delete "${confirmDeleteTicket.title}"? This can't be undone.`}
          confirmLabel="Delete"
          onCancel={() => setConfirmDeleteTicket(null)}
          onConfirm={() => { deleteTicket(confirmDeleteTicket.id); setConfirmDeleteTicket(null) }}
        />
      )}
    </div>
  )
}
