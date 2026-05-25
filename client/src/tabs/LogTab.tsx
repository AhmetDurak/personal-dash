import { useState, useEffect, useRef } from 'react'
import { useJournalEntry, useRecentJournal } from '../hooks/useJournal'
import { useDailyPlan, PlanTask } from '../hooks/useDailyPlan'
import { useLanguage } from '../hooks/useLanguage'

type View = 'today' | 'plan' | 'calendar' | 'history'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function fmt(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Highlight pills ──────────────────────────────────────────────────────────

interface PillListProps {
  items: string[]
  onChange: (items: string[]) => void
  max: number
  color: 'green' | 'red'
  placeholder: string
}

function PillList({ items, onChange, max, color, placeholder }: PillListProps) {
  const [input, setInput] = useState('')
  const green = color === 'green'

  function add() {
    const v = input.trim()
    if (!v || items.includes(v) || items.length >= max) return
    onChange([...items, v])
    setInput('')
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <span
            key={item}
            className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
              green ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {item}
            <button
              onClick={() => onChange(items.filter(i => i !== item))}
              className="opacity-60 hover:opacity-100 leading-none"
            >×</button>
          </span>
        ))}
        {items.length < max && (
          <form onSubmit={e => { e.preventDefault(); add() }} className="flex gap-1">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={placeholder}
              className={`text-xs border rounded-full px-2.5 py-1 w-40 focus:outline-none focus:ring-1 ${
                green ? 'border-emerald-200 focus:ring-emerald-300' : 'border-red-200 focus:ring-red-300'
              }`}
            />
            <button
              type="submit"
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                green ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >+</button>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Today view ───────────────────────────────────────────────────────────────

function TodayView() {
  const { t } = useLanguage()
  const date = todayStr()
  const { entry, save } = useJournalEntry(date)
  const [content, setContent] = useState('')
  const [wentWell, setWentWell] = useState<string[]>([])
  const [wentBad, setWentBad] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loaded = useRef(false)

  useEffect(() => {
    if (entry && !loaded.current) {
      setContent(entry.content)
      setWentWell(entry.went_well)
      setWentBad(entry.went_bad)
      loaded.current = true
    }
  }, [entry])

  function scheduleSave(c: string, ww: string[], wb: string[]) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(async () => {
      await save(c, ww, wb)
      setSaving(false)
    }, 800)
  }

  function handleContent(v: string) {
    setContent(v)
    scheduleSave(v, wentWell, wentBad)
  }

  function handleWell(items: string[]) {
    setWentWell(items)
    scheduleSave(content, items, wentBad)
  }

  function handleBad(items: string[]) {
    setWentBad(items)
    scheduleSave(content, wentWell, items)
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{fmt(date)}</h2>
          <p className="text-xs text-gray-400">{t.todayLog}</p>
        </div>
        {saving && <span className="text-xs text-gray-400">{t.saving}</span>}
      </div>

      <textarea
        value={content}
        onChange={e => handleContent(e.target.value)}
        placeholder={t.writeAboutDay}
        rows={8}
        className="w-full text-sm border border-gray-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-xero-green resize-none text-gray-800 placeholder-gray-300"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">{t.wentWell}</p>
          <PillList items={wentWell} onChange={handleWell} max={3} color="green" placeholder={t.addHighlight} />
        </div>
        <div>
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">{t.wasHard}</p>
          <PillList items={wentBad} onChange={handleBad} max={3} color="red" placeholder={t.addChallenge} />
        </div>
      </div>
    </div>
  )
}

// ─── Plan view ────────────────────────────────────────────────────────────────

function PlanView() {
  const { t } = useLanguage()
  const date = todayStr()
  const { plan, save } = useDailyPlan(date)
  const [tasks, setTasks]   = useState<PlanTask[]>([])
  const [notes, setNotes]   = useState('')
  const [input, setInput]   = useState('')
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loaded = useRef(false)

  useEffect(() => {
    if (plan !== null && !loaded.current) {
      setTasks(plan?.tasks ?? [])
      setNotes(plan?.notes ?? '')
      loaded.current = true
    }
  }, [plan])

  function scheduleSave(t: PlanTask[], n: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(async () => {
      await save(t, n)
      setSaving(false)
    }, 600)
  }

  function addTask() {
    const text = input.trim()
    if (!text) return
    const next: PlanTask[] = [...tasks, { id: crypto.randomUUID(), text, done: false }]
    setTasks(next)
    setInput('')
    scheduleSave(next, notes)
  }

  function toggleTask(id: string) {
    const next = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t)
    setTasks(next)
    scheduleSave(next, notes)
  }

  function deleteTask(id: string) {
    const next = tasks.filter(t => t.id !== id)
    setTasks(next)
    scheduleSave(next, notes)
  }

  function handleNotes(v: string) {
    setNotes(v)
    scheduleSave(tasks, v)
  }

  const done  = tasks.filter(t => t.done).length
  const total = tasks.length

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{fmt(date)}</h2>
          <p className="text-xs text-gray-400">{t.todayPlan}</p>
        </div>
        <div className="flex items-center gap-3">
          {total > 0 && (
            <span className="text-xs font-medium text-gray-500">{done}/{total}</span>
          )}
          {saving && <span className="text-xs text-gray-400">{t.saving}</span>}
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-xero-green rounded-full transition-all duration-500"
            style={{ width: `${(done / total) * 100}%` }}
          />
        </div>
      )}

      {/* Task list */}
      <div className="space-y-2">
        {tasks.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">{t.noTasksYet}</p>
        )}
        {tasks.map(task => (
          <div
            key={task.id}
            className="flex items-center gap-3 group bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-gray-200 transition-colors"
          >
            <button
              onClick={() => toggleTask(task.id)}
              className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                task.done
                  ? 'bg-xero-green border-xero-green'
                  : 'border-gray-300 hover:border-xero-green'
              }`}
            >
              {task.done && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <span className={`flex-1 text-sm ${task.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
              {task.text}
            </span>
            <button
              onClick={() => deleteTask(task.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-opacity text-xs leading-none"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Add task input */}
      <form
        onSubmit={e => { e.preventDefault(); addTask() }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t.addTask}
          className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-xero-green placeholder-gray-300"
        />
        <button
          type="submit"
          className="text-sm px-4 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium"
        >
          {t.add}
        </button>
      </form>

      {/* Motivational notes */}
      <div>
        <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-2">{t.motivationalNotes}</p>
        <textarea
          value={notes}
          onChange={e => handleNotes(e.target.value)}
          placeholder={t.motivationalNotesPlaceholder}
          rows={4}
          className="w-full text-sm border border-amber-100 bg-amber-50/50 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-amber-200 resize-none text-gray-800 placeholder-gray-400"
        />
      </div>
    </div>
  )
}

// ─── Calendar view ────────────────────────────────────────────────────────────

function CalendarView({ onSelectDate }: { onSelectDate: (d: string) => void }) {
  const { data: entries } = useRecentJournal(90)
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const entryDates = new Set((entries ?? []).map(e => e.date.slice(0, 10)))
  const today = todayStr()

  const firstDay = new Date(cursor.year, cursor.month, 1).getDay()
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
  const blanks = Array.from({ length: firstDay })
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  function dateStr(d: number) {
    return `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  function prev() { setCursor(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }) }
  function next() { setCursor(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }) }

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div className="max-w-sm mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev} className="p-1 text-gray-400 hover:text-gray-700">‹</button>
        <p className="text-sm font-semibold text-gray-800">{monthLabel}</p>
        <button onClick={next} className="p-1 text-gray-400 hover:text-gray-700">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <p key={d} className="text-[10px] text-gray-400 font-medium">{d}</p>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {blanks.map((_, i) => <div key={`b${i}`} />)}
        {days.map(d => {
          const ds = dateStr(d)
          const hasEntry = entryDates.has(ds)
          const isToday = ds === today
          return (
            <button
              key={d}
              onClick={() => onSelectDate(ds)}
              className={`relative aspect-square rounded-lg text-xs font-medium flex items-center justify-center transition-colors ${
                isToday ? 'bg-xero-green text-white' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              {d}
              {hasEntry && (
                <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isToday ? 'bg-white' : 'bg-xero-green'}`} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── History view ─────────────────────────────────────────────────────────────

function HistoryView({ onSelectDate }: { onSelectDate: (d: string) => void }) {
  const { t } = useLanguage()
  const { data: entries, isLoading } = useRecentJournal(30)

  if (isLoading) return <p className="text-sm text-gray-400 p-6">Loading…</p>
  if (!entries?.length) return <p className="text-sm text-gray-400 p-6 text-center">{t.noEntriesYet}</p>

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-3">
      {entries.map(e => (
        <button
          key={e.id}
          onClick={() => onSelectDate(e.date.slice(0, 10))}
          className="w-full text-left bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-start justify-between gap-4 mb-2">
            <p className="text-xs font-semibold text-gray-500">{fmt(e.date.slice(0, 10))}</p>
            <div className="flex gap-1 flex-shrink-0">
              {e.went_well.slice(0, 2).map(w => (
                <span key={w} className="text-[10px] bg-emerald-50 text-emerald-600 rounded-full px-2 py-0.5">{w}</span>
              ))}
              {e.went_bad.slice(0, 1).map(w => (
                <span key={w} className="text-[10px] bg-red-50 text-red-500 rounded-full px-2 py-0.5">{w}</span>
              ))}
            </div>
          </div>
          {e.content && (
            <p className="text-sm text-gray-600 line-clamp-2">{e.content}</p>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Entry view (past date) ───────────────────────────────────────────────────

function EntryView({ date, onBack }: { date: string; onBack: () => void }) {
  const { t } = useLanguage()
  const { entry, save } = useJournalEntry(date)
  const [content, setContent] = useState('')
  const [wentWell, setWentWell] = useState<string[]>([])
  const [wentBad, setWentBad] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loaded = useRef(false)

  useEffect(() => {
    if (!loaded.current) {
      setContent(entry?.content ?? '')
      setWentWell(entry?.went_well ?? [])
      setWentBad(entry?.went_bad ?? [])
      if (entry !== undefined) loaded.current = true
    }
  }, [entry])

  function scheduleSave(c: string, ww: string[], wb: string[]) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(async () => { await save(c, ww, wb); setSaving(false) }, 800)
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-xs text-gray-400 hover:text-gray-600">← Back</button>
        <h2 className="text-lg font-semibold text-gray-900">{fmt(date)}</h2>
        {saving && <span className="text-xs text-gray-400 ml-auto">{t.saving}</span>}
      </div>
      <textarea
        value={content}
        onChange={e => { setContent(e.target.value); scheduleSave(e.target.value, wentWell, wentBad) }}
        placeholder={t.writeAboutDay}
        rows={8}
        className="w-full text-sm border border-gray-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-xero-green resize-none"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">{t.wentWell}</p>
          <PillList items={wentWell} onChange={ww => { setWentWell(ww); scheduleSave(content, ww, wentBad) }} max={3} color="green" placeholder={t.addHighlight} />
        </div>
        <div>
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">{t.wasHard}</p>
          <PillList items={wentBad} onChange={wb => { setWentBad(wb); scheduleSave(content, wentWell, wb) }} max={3} color="red" placeholder={t.addChallenge} />
        </div>
      </div>
    </div>
  )
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export function LogTab({ onMenuClick }: { onMenuClick?: () => void }) {
  const { t } = useLanguage()
  const [view, setView] = useState<View>('today')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  function handleSelectDate(d: string) {
    setSelectedDate(d)
  }

  function handleBack() {
    setSelectedDate(null)
  }

  const VIEWS: { id: View; label: string }[] = [
    { id: 'today',    label: t.todayLabel },
    { id: 'plan',     label: t.planLabel },
    { id: 'calendar', label: t.calendar },
    { id: 'history',  label: t.history },
  ]

  return (
    <div className="flex flex-col h-full bg-xero-bg overflow-hidden">
      <header className="flex items-center gap-1 px-4 py-2.5 bg-white border-b border-xero-border flex-shrink-0">
        {onMenuClick && (
          <button onClick={onMenuClick} className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors mr-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        )}
        <span className="text-base font-semibold text-gray-800 mr-3">{t.dailyLog}</span>
        {VIEWS.map(v => (
          <button
            key={v.id}
            onClick={() => { setView(v.id); setSelectedDate(null) }}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              view === v.id && !selectedDate ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {v.label}
          </button>
        ))}
      </header>

      <div className="flex-1 overflow-y-auto">
        {selectedDate && selectedDate !== todayStr() ? (
          <EntryView date={selectedDate} onBack={handleBack} />
        ) : view === 'today' || (selectedDate === todayStr()) ? (
          <TodayView />
        ) : view === 'plan' ? (
          <PlanView />
        ) : view === 'calendar' ? (
          <CalendarView onSelectDate={d => { handleSelectDate(d); setView('today') }} />
        ) : (
          <HistoryView onSelectDate={d => { handleSelectDate(d) }} />
        )}
      </div>
    </div>
  )
}
