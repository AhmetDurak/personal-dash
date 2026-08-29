import { useState } from 'react'
import { usePublications } from '../hooks/usePublications'
import { formatDate } from '../utils/format'
import { IconUpdates, IconDelete, IconCheck } from '../lib/icons'
import type { Publication } from '../types'

type Filter = 'all' | 'unread' | 'news' | 'improvement'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all',         label: 'All' },
  { id: 'unread',      label: 'Unread' },
  { id: 'news',        label: 'News' },
  { id: 'improvement', label: 'Improvements' },
]

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  news:        { label: 'News',        cls: 'bg-blue-100 text-blue-700' },
  improvement: { label: 'Improvement', cls: 'bg-xero-green/10 text-xero-green' },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}d ago`
  return formatDate(iso)
}

function UpdateCard({ item, onToggleRead, onDelete }: {
  item: Publication
  onToggleRead: (id: number, read: boolean) => void
  onDelete: (id: number) => void
}) {
  const badge = TYPE_BADGE[item.type] ?? { label: item.type, cls: 'bg-gray-100 text-gray-600' }
  return (
    <div
      onClick={() => !item.read && onToggleRead(item.id, true)}
      className={`flex gap-3 bg-white border rounded-xl p-4 transition-colors cursor-pointer ${
        item.read ? 'border-xero-border' : 'border-xero-green/40 bg-xero-green/[0.03]'
      }`}
    >
      {!item.read && <span className="w-2 h-2 rounded-full bg-xero-green flex-shrink-0 mt-2" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${badge.cls}`}>
            {badge.label}
          </span>
          <span className="text-xs text-gray-400">{timeAgo(item.createdAt)}</span>
        </div>
        <p className={`text-sm leading-snug ${item.read ? 'text-gray-700 font-medium' : 'text-gray-900 font-semibold'}`}>
          {item.title}
        </p>
        {item.body && <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap break-words">{item.body}</p>}
        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-xs text-xero-green hover:underline mt-1.5 inline-block"
          >
            Open link →
          </a>
        )}
      </div>
      <div className="flex items-start gap-2 flex-shrink-0">
        <button
          onClick={e => { e.stopPropagation(); onToggleRead(item.id, !item.read) }}
          title={item.read ? 'Mark unread' : 'Mark read'}
          className="p-2.5 rounded-lg text-gray-400 hover:text-xero-green hover:bg-gray-50 transition-colors"
        >
          <IconCheck className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete(item.id) }}
          title="Delete"
          className="p-2.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-50 transition-colors"
        >
          <IconDelete className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}

export function UpdatesTab() {
  const [filter, setFilter] = useState<Filter>('all')
  const { publications, unreadCount, isLoading, markRead, markAllRead, remove } = usePublications()

  const filtered = publications.filter(p =>
    filter === 'all' ? true : filter === 'unread' ? !p.read : p.type === filter
  )

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === f.id ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
              {f.id === 'unread' && unreadCount > 0 && <span className="ml-1.5 opacity-70">{unreadCount}</span>}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead()}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-50 border border-xero-border rounded-xl p-4 h-20 animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(item => (
            <UpdateCard
              key={item.id}
              item={item}
              onToggleRead={(id, read) => markRead(id, read)}
              onDelete={remove}
            />
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 text-sm text-gray-400">
          <IconUpdates className="w-8 h-8 mx-auto mb-3 opacity-40" strokeWidth={1.5} />
          <p className="font-medium text-gray-600 mb-1">No updates</p>
          <p>{filter === 'unread' ? "You're all caught up." : 'Nothing published yet.'}</p>
        </div>
      )}
    </div>
  )
}
