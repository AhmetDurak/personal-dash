import { useState, useEffect, useRef } from 'react'
import { useJournalEntry } from '../hooks/useJournal'
import { useDailyPlan, PlanTask } from '../hooks/useDailyPlan'
import { useLanguage } from '../hooks/useLanguage'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function fmt(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
}

// ─── Plan panel ───────────────────────────────────────────────────────────────

function PlanPanel() {
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
    saveTimer.current = setTimeout(async () => { await save(t, n); setSaving(false) }, 600)
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

  const done  = tasks.filter(t => t.done).length
  const total = tasks.length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
        <div>
          <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide">{t.planLabel}</p>
          {total > 0 && <p className="text-xs text-gray-400 mt-0.5">{done}/{total} {done === total && total > 0 ? '✓' : ''}</p>}
        </div>
        {saving && <span className="text-xs text-gray-400">{t.saving}</span>}
      </div>

      {total > 0 && (
        <div className="h-1 bg-gray-100 flex-shrink-0">
          <div
            className="h-full bg-xero-green transition-all duration-500"
            style={{ width: `${(done / total) * 100}%` }}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {tasks.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">{t.noTasksYet}</p>
        )}
        {tasks.map(task => (
          <div
            key={task.id}
            className="flex items-center gap-3 group bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-gray-200 transition-colors"
          >
            <button
              onClick={() => toggleTask(task.id)}
              className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                task.done ? 'bg-xero-green border-xero-green' : 'border-gray-300 hover:border-xero-green'
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
              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-opacity text-xs"
            >✕</button>
          </div>
        ))}
      </div>

      <div className="flex-shrink-0 px-6 pb-4 space-y-3">
        <form onSubmit={e => { e.preventDefault(); addTask() }} className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={t.addTask}
            className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-xero-green placeholder-gray-300"
          />
          <button type="submit" className="text-sm px-3 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium">
            {t.add}
          </button>
        </form>

        <textarea
          value={notes}
          onChange={e => { setNotes(e.target.value); scheduleSave(tasks, e.target.value) }}
          placeholder={t.motivationalNotesPlaceholder}
          rows={3}
          className="w-full text-sm border border-amber-100 bg-amber-50/40 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-amber-200 resize-none placeholder-gray-400"
        />
      </div>
    </div>
  )
}

// ─── Journal panel ────────────────────────────────────────────────────────────

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
      <div className="flex flex-wrap gap-1.5">
        {items.map(item => (
          <span
            key={item}
            className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
              green ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {item}
            <button onClick={() => onChange(items.filter(i => i !== item))} className="opacity-60 hover:opacity-100">×</button>
          </span>
        ))}
        {items.length < max && (
          <form onSubmit={e => { e.preventDefault(); add() }} className="flex gap-1">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={placeholder}
              className={`text-xs border rounded-full px-2.5 py-1 w-36 focus:outline-none focus:ring-1 ${
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

function JournalPanel() {
  const { t } = useLanguage()
  const date = todayStr()
  const { entry, save } = useJournalEntry(date)
  const [content, setContent]   = useState('')
  const [wentWell, setWentWell] = useState<string[]>([])
  const [wentBad, setWentBad]   = useState<string[]>([])
  const [saving, setSaving]     = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loaded = useRef(false)

  useEffect(() => {
    if (entry !== null && entry !== undefined && !loaded.current) {
      setContent(entry.content)
      setWentWell(entry.went_well)
      setWentBad(entry.went_bad)
      loaded.current = true
    }
  }, [entry])

  function scheduleSave(c: string, ww: string[], wb: string[]) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(async () => { await save(c, ww, wb); setSaving(false) }, 800)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
        <p className="text-xs font-semibold text-xero-green uppercase tracking-wide">{t.todayLog}</p>
        {saving && <span className="text-xs text-gray-400">{t.saving}</span>}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <textarea
          value={content}
          onChange={e => { setContent(e.target.value); scheduleSave(e.target.value, wentWell, wentBad) }}
          placeholder={t.writeAboutDay}
          className="w-full text-sm border border-gray-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-xero-green resize-none placeholder-gray-300 h-48"
        />

        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">{t.wentWell}</p>
          <PillList
            items={wentWell}
            onChange={ww => { setWentWell(ww); scheduleSave(content, ww, wentBad) }}
            max={3}
            color="green"
            placeholder={t.addHighlight}
          />
        </div>

        <div>
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">{t.wasHard}</p>
          <PillList
            items={wentBad}
            onChange={wb => { setWentBad(wb); scheduleSave(content, wentWell, wb) }}
            max={3}
            color="red"
            placeholder={t.addChallenge}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

type Panel = 'plan' | 'journal'

export function TodayTab() {
  const { t } = useLanguage()
  // Mobile: tab between panels. Desktop: side-by-side.
  const [mobilePanel, setMobilePanel] = useState<Panel>('plan')

  return (
    <div className="flex flex-col h-full overflow-hidden bg-xero-bg">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-xero-border flex-shrink-0">
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{t.todayLabel}</p>
          <h1 className="text-lg font-semibold text-gray-900">{fmt(todayStr())}</h1>
        </div>
        {/* Mobile tab switcher */}
        <div className="flex md:hidden gap-1">
          {(['plan', 'journal'] as Panel[]).map(p => (
            <button
              key={p}
              onClick={() => setMobilePanel(p)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                mobilePanel === p ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {p === 'plan' ? t.planLabel : t.todayLabel}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* Desktop: side-by-side */}
        <div className="hidden md:flex h-full">
          <div className="flex-1 border-r border-xero-border bg-white overflow-hidden">
            <PlanPanel />
          </div>
          <div className="flex-1 bg-white overflow-hidden">
            <JournalPanel />
          </div>
        </div>

        {/* Mobile: single panel */}
        <div className="md:hidden h-full bg-white overflow-hidden">
          {mobilePanel === 'plan' ? <PlanPanel /> : <JournalPanel />}
        </div>
      </div>
    </div>
  )
}
