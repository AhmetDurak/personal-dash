import { useState, useRef, useEffect } from 'react'
import { useNotifications } from '../../hooks/useNotifications'
import { requestNotificationPermission } from '../../hooks/useReminderNotifications'
import { ConfirmDialog } from './ConfirmDialog'

function fmtEur(cents: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(cents / 100)
}

function fmtPct(v: number) {
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}

function dueSoon(due: string | null): boolean {
  if (!due) return false
  return new Date(due).getTime() <= Date.now() + 24 * 60 * 60 * 1000
}

function fmtDue(due: string | null): string {
  if (!due) return ''
  const d = new Date(due)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff < 0)  return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

// ── Panel ──────────────────────────────────────────────────────────────────────

export function NotificationsPanel() {
  const [open, setOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDue, setNewDue] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [permState, setPermState] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  )
  const panelRef = useRef<HTMLDivElement>(null)
  const { data, isLoading, badgeCount, addReminder, toggleDone, deleteReminder } = useNotifications()

  async function handleEnableNotifications() {
    const perm = await requestNotificationPermission()
    setPermState(perm)
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    await addReminder({ title: newTitle.trim(), due_at: newDue || undefined })
    setNewTitle(''); setNewDue('')
  }

  const summary   = data?.summary ?? null
  const alerts    = data?.etfAlerts ?? []
  const reminders = data?.reminders ?? []

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <span className="text-lg">🔔</span>
        {badgeCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 w-96 bg-white border border-xero-border rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>

          {'Notification' in window && permState === 'default' && (
            <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between gap-3">
              <p className="text-xs text-amber-700 flex-1">Enable browser notifications to get alerts for due reminders.</p>
              <button
                onClick={handleEnableNotifications}
                className="text-xs bg-xero-green text-white px-3 py-1.5 rounded-lg font-medium hover:bg-xero-green-dark transition-colors flex-shrink-0"
              >
                Enable
              </button>
            </div>
          )}
          {'Notification' in window && permState === 'denied' && (
            <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100">
              <p className="text-xs text-gray-400">Notifications blocked — allow them in your browser settings to receive reminder alerts.</p>
            </div>
          )}
          {'Notification' in window && permState === 'granted' && (
            <div className="px-5 py-2 border-b border-gray-100 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-xero-green flex-shrink-0" />
              <p className="text-[10px] text-gray-400">Browser notifications active</p>
            </div>
          )}

          <div className="max-h-[70vh] overflow-y-auto">

            {/* ── Monthly Summary ── */}
            {summary && (
              <section className="px-5 py-4 border-b border-gray-100">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-3">📊 Monthly Overview — {summary.month}</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Income',    value: fmtEur(summary.income),        color: 'text-xero-green' },
                    { label: 'Expenses',  value: fmtEur(summary.totalExpenses),  color: 'text-amber-500' },
                    { label: 'Net',       value: fmtEur(summary.net),            color: summary.net >= 0 ? 'text-emerald-600' : 'text-red-500' },
                    { label: 'Saved',     value: `${(summary.savingsRate * 100).toFixed(1)}%`, color: 'text-sky-500' },
                  ].map(k => (
                    <div key={k.label} className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-[10px] text-gray-400 mb-0.5">{k.label}</p>
                      <p className={`text-sm font-bold ${k.color}`}>{k.value}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── ETF Alerts ── */}
            {alerts.length > 0 && (
              <section className="px-5 py-4 border-b border-gray-100">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-3">📈 ETF Alerts (±2% today)</p>
                <div className="space-y-2">
                  {alerts.map(a => (
                    <div key={a.ticker} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-gray-50">
                      <div>
                        <span className="text-xs font-bold text-gray-800 font-mono">{a.ticker}</span>
                        <p className="text-[10px] text-gray-400 truncate max-w-[160px]">{a.name}</p>
                      </div>
                      <span className={`text-sm font-bold ${a.direction === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {a.direction === 'up' ? '▲' : '▼'} {fmtPct(a.changePct)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Reminders ── */}
            <section className="px-5 py-4">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-3">📝 Reminders</p>

              {isLoading && <p className="text-xs text-gray-400 py-2">Loading…</p>}

              {!isLoading && reminders.length === 0 && (
                <p className="text-xs text-gray-400 py-1">No pending reminders.</p>
              )}

              <div className="space-y-1.5 mb-3">
                {reminders.map(r => (
                  <div key={r.id} className="flex items-start gap-2 group">
                    <button
                      onClick={() => toggleDone(r.id)}
                      className="mt-0.5 flex-shrink-0 w-4 h-4 rounded border-2 border-gray-300 hover:border-xero-green transition-colors"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 leading-snug">{r.title}</p>
                      {r.due_at && (
                        <p className={`text-[10px] font-medium ${dueSoon(r.due_at) ? 'text-red-500' : 'text-gray-400'}`}>
                          {fmtDue(r.due_at)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setConfirmDeleteId(r.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-base leading-none flex-shrink-0"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Add reminder form */}
              <form onSubmit={handleAdd} className="flex gap-2 mt-2">
                <input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="New reminder…"
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-xero-green focus:border-xero-green"
                />
                <input
                  type="date"
                  value={newDue}
                  onChange={e => setNewDue(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-xero-green w-[110px]"
                />
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="text-xs bg-xero-green text-white px-3 py-1.5 rounded-lg font-medium disabled:opacity-40 hover:bg-xero-green-dark transition-colors flex-shrink-0"
                >
                  Add
                </button>
              </form>
            </section>

          </div>
        </div>
      )}
    {confirmDeleteId !== null && (
      <ConfirmDialog
        message="This reminder will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={() => { deleteReminder(confirmDeleteId); setConfirmDeleteId(null) }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    )}
    </div>
  )
}
