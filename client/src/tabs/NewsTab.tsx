import { useState } from 'react'
import { useNewsFeed } from '../hooks/useETF'
import type { NewsItem, MetalPrice } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'gerade eben'
  if (m < 60) return `vor ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `vor ${h}h`
  return `vor ${Math.floor(h / 24)}d`
}

function fmtMetal(price: number, currency: string) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency, maximumFractionDigits: 2 }).format(price)
}

// ── Category config ───────────────────────────────────────────────────────────

type Category = 'all' | 'etf' | 'metals' | 'ai' | 'politics'

const CATEGORIES: { id: Category; label: string; color: string }[] = [
  { id: 'all',      label: 'Alle',           color: 'bg-gray-800 text-white' },
  { id: 'etf',      label: 'Watchlist ETFs', color: 'bg-xero-green text-white' },
  { id: 'metals',   label: 'Rohstoffe',      color: 'bg-amber-500 text-white' },
  { id: 'ai',       label: 'AI & Tech',      color: 'bg-violet-600 text-white' },
  { id: 'politics', label: 'Börse & Politik', color: 'bg-blue-600 text-white' },
]

const CAT_BADGE: Record<string, { label: string; cls: string }> = {
  etf:      { label: 'ETF',       cls: 'bg-xero-green/10 text-xero-green' },
  metals:   { label: 'Rohstoffe', cls: 'bg-amber-100 text-amber-700' },
  ai:       { label: 'AI & Tech', cls: 'bg-violet-100 text-violet-700' },
  politics: { label: 'Börse',     cls: 'bg-blue-100 text-blue-700' },
}

// ── Metal price strip ─────────────────────────────────────────────────────────

const METAL_ICONS: Record<string, string> = {
  'GC=F': '🥇', 'SI=F': '🥈', 'HG=F': '🟤', 'CL=F': '🛢️', 'PL=F': '⬜', 'ALI=F': '🔩',
}

function MetalStrip({ metals }: { metals: MetalPrice[] }) {
  if (!metals.length) return null
  return (
    <div className="flex gap-4 overflow-x-auto pb-1 mb-6 flex-wrap">
      {metals.map(m => {
        const pos = m.changePct >= 0
        return (
          <div key={m.symbol} className="flex items-center gap-2 bg-white border border-xero-border rounded-xl px-4 py-2.5 flex-shrink-0">
            <span className="text-lg">{METAL_ICONS[m.symbol] ?? '◆'}</span>
            <div>
              <p className="text-xs font-semibold text-gray-700">{m.name}</p>
              <p className="text-sm font-bold text-gray-900">{fmtMetal(m.price, m.currency)}</p>
            </div>
            <span className={`text-xs font-semibold ml-1 ${pos ? 'text-emerald-600' : 'text-red-500'}`}>
              {pos ? '+' : ''}{m.changePct.toFixed(2)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── News card ─────────────────────────────────────────────────────────────────

function NewsCard({ item }: { item: NewsItem }) {
  const badge = CAT_BADGE[item.category]
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-4 bg-white border border-xero-border rounded-xl p-4 hover:shadow-md hover:border-gray-300 transition-all group"
    >
      {item.thumbnail && (
        <img
          src={item.thumbnail}
          alt=""
          className="w-20 h-20 object-cover rounded-lg flex-shrink-0 bg-gray-100"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          {badge && (
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${badge.cls}`}>
              {badge.label}
            </span>
          )}
          {item.relatedTicker && (
            <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
              {item.relatedTicker}
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-gray-900 leading-snug group-hover:text-xero-green transition-colors line-clamp-2">
          {item.title}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs text-gray-400">{item.publisher}</span>
          <span className="text-gray-200">·</span>
          <span className="text-xs text-gray-400">{timeAgo(item.publishedAt)}</span>
        </div>
      </div>
    </a>
  )
}

// ── Main NewsTab ──────────────────────────────────────────────────────────────

export function NewsTab() {
  const [category, setCategory] = useState<Category>('all')
  const { data, isLoading, mutate } = useNewsFeed()

  const filtered = (data?.news ?? []).filter(n => category === 'all' || n.category === category)

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Metal strip */}
      {data?.metals && <MetalStrip metals={data.metals} />}

      {/* Category filter + refresh */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                category === c.id ? c.color : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {c.label}
              {c.id !== 'all' && data && (
                <span className="ml-1.5 opacity-70">
                  {data.news.filter(n => n.category === c.id).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => mutate()}
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1.5 transition-colors"
        >
          ↻ Aktualisieren
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-50 border border-xero-border rounded-xl p-4 h-24 animate-pulse" />
          ))}
        </div>
      )}

      {/* News list */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(item => <NewsCard key={item.id} item={item} />)}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 text-sm text-gray-400">
          <p className="text-3xl mb-3">📰</p>
          <p className="font-medium text-gray-600 mb-1">Keine Nachrichten</p>
          <p>
            {category === 'etf'
              ? 'ETFs zur Watchlist hinzufügen, um ETF-News zu sehen.'
              : 'Momentan keine Nachrichten verfügbar.'}
          </p>
        </div>
      )}
    </div>
  )
}
