import { useState, useEffect, useRef } from 'react'
import { useJournalEntry } from '../hooks/useJournal'
import { useDailyPlan, PlanTask } from '../hooks/useDailyPlan'
import { useLanguage } from '../hooks/useLanguage'
import { ChallengesView } from '../components/web/ChallengesView'
import { IconClose, IconChevronLeft, IconChevronRight } from '../lib/icons'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function tomorrowStr() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

function getWeekDays(): string[] {
  const today = new Date()
  const dow = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dow + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

function fmtFull(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
}

function fmtShort(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short',
  })
}

// ─── Plan panel (single day) ──────────────────────────────────────────────────

function PlanPanel({ date }: { date: string }) {
  const { t } = useLanguage()
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

  function scheduleSave(ts: PlanTask[], n: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(async () => { await save(ts, n); setSaving(false) }, 600)
  }

  function addTask() {
    const text = input.trim()
    if (!text) return
    const next: PlanTask[] = [...tasks, { id: crypto.randomUUID(), text, done: false }]
    setTasks(next); setInput('')
    scheduleSave(next, notes)
  }

  function toggleTask(id: string) {
    const next = tasks.map(tk => tk.id === id ? { ...tk, done: !tk.done } : tk)
    setTasks(next); scheduleSave(next, notes)
  }

  function deleteTask(id: string) {
    const next = tasks.filter(tk => tk.id !== id)
    setTasks(next); scheduleSave(next, notes)
  }

  const done  = tasks.filter(tk => tk.done).length
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
          <div className="h-full bg-xero-green transition-all duration-500" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {tasks.length === 0 && <p className="text-sm text-gray-400 text-center py-6">{t.noTasksYet}</p>}
        {tasks.map(task => (
          <div key={task.id} className="flex items-center gap-3 group bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-gray-200 transition-colors">
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
            <span className={`flex-1 text-sm ${task.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.text}</span>
            <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-opacity text-xs">✕</button>
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

// ─── Week view ────────────────────────────────────────────────────────────────

function DayRow({ date }: { date: string }) {
  const { t } = useLanguage()
  const today     = date === todayStr()
  const tomorrow  = date === tomorrowStr()
  const [expanded, setExpanded] = useState(today)
  const [input, setInput]       = useState('')
  const [saving, setSaving]     = useState(false)
  const { plan, save } = useDailyPlan(date)
  const [tasks, setTasks] = useState<PlanTask[]>([])
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loaded = useRef(false)

  useEffect(() => {
    if (plan !== null && !loaded.current) {
      setTasks(plan?.tasks ?? [])
      loaded.current = true
    }
  }, [plan])

  function scheduleSave(ts: PlanTask[]) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(async () => { await save(ts, plan?.notes ?? ''); setSaving(false) }, 600)
  }

  function addTask() {
    const text = input.trim()
    if (!text) return
    const next: PlanTask[] = [...tasks, { id: crypto.randomUUID(), text, done: false }]
    setTasks(next); setInput('')
    scheduleSave(next)
  }

  function toggleTask(id: string) {
    const next = tasks.map(tk => tk.id === id ? { ...tk, done: !tk.done } : tk)
    setTasks(next); scheduleSave(next)
  }

  function deleteTask(id: string) {
    const next = tasks.filter(tk => tk.id !== id)
    setTasks(next); scheduleSave(next)
  }

  const done  = tasks.filter(tk => tk.done).length
  const total = tasks.length

  return (
    <div className={`rounded-xl border overflow-hidden ${today ? 'border-xero-green/40' : 'border-gray-100'}`}>
      <button
        onClick={() => setExpanded(v => !v)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${today ? 'bg-emerald-50/60' : 'bg-white hover:bg-gray-50'}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${today ? 'text-xero-green' : 'text-gray-700'}`}>{fmtShort(date)}</span>
            {today     && <span className="text-[10px] bg-xero-green text-white px-1.5 py-0.5 rounded-full font-semibold">{t.todayLabel}</span>}
            {tomorrow  && <span className="text-[10px] bg-amber-400 text-white px-1.5 py-0.5 rounded-full font-semibold">{t.tomorrow}</span>}
            {saving    && <span className="text-[10px] text-gray-400">{t.saving}</span>}
          </div>
          {total > 0 ? (
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-xero-green transition-all" style={{ width: `${(done / total) * 100}%` }} />
              </div>
              <span className="text-[10px] text-gray-400 flex-shrink-0">{done}/{total}</span>
            </div>
          ) : (
            <p className="text-xs text-gray-400 mt-0.5">{t.noTasksYet}</p>
          )}
        </div>
        <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 bg-white space-y-2">
          {tasks.map(task => (
            <div key={task.id} className="flex items-center gap-2 group">
              <button
                onClick={() => toggleTask(task.id)}
                className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  task.done ? 'bg-xero-green border-xero-green' : 'border-gray-300 hover:border-xero-green'
                }`}
              >
                {task.done && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <span className={`flex-1 text-sm ${task.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.text}</span>
              <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 text-xs">✕</button>
            </div>
          ))}
          <form onSubmit={e => { e.preventDefault(); addTask() }} className="flex gap-2 pt-1">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={t.addTask}
              className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-xero-green placeholder-gray-300"
            />
            <button type="submit" className="text-xs px-2.5 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium">+</button>
          </form>
        </div>
      )}
    </div>
  )
}

function WeekPlanView() {
  const days = getWeekDays()
  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
      {days.map(date => <DayRow key={date} date={date} />)}
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
          <span key={item} className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${green ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {item}
            <button onClick={() => onChange(items.filter(i => i !== item))} className="opacity-60 hover:opacity-100"><IconClose className="w-3 h-3" strokeWidth={2.5} /></button>
          </span>
        ))}
        {items.length < max && (
          <form onSubmit={e => { e.preventDefault(); add() }} className="flex gap-1">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={placeholder}
              className={`text-xs border rounded-full px-2.5 py-1 w-36 focus:outline-none focus:ring-1 ${green ? 'border-emerald-200 focus:ring-emerald-300' : 'border-red-200 focus:ring-red-300'}`}
            />
            <button type="submit" className={`text-xs px-2 py-1 rounded-full font-medium ${green ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>+</button>
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

// ─── Month calendar ───────────────────────────────────────────────────────────

function getMonthDays(year: number, month: number): (string | null)[] {
  const firstDow = new Date(year, month, 1).getDay() // 0=Sun
  const startOffset = (firstDow + 6) % 7             // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = Array(startOffset).fill(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function MonthGrid({
  year, month, today, selected, onSelect,
}: { year: number; month: number; today: string; selected: string | null; onSelect: (d: string) => void }) {
  const cells = getMonthDays(year, month)
  const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {DOW.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-400 dark:text-slate-500 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={i} />
          const isToday    = dateStr === today
          const isSelected = dateStr === selected
          const isPast     = dateStr < today
          return (
            <button
              key={dateStr}
              onClick={() => onSelect(dateStr)}
              className={`rounded-lg text-xs py-1.5 font-medium transition-colors ${
                isSelected
                  ? 'bg-xero-green text-white'
                  : isToday
                  ? 'bg-xero-green/10 text-xero-green ring-1 ring-xero-green/30'
                  : isPast
                  ? 'text-gray-300 dark:text-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'
                  : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              {Number(dateStr.slice(8))}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MonthCalendarView({ selected, onSelect }: { selected: string | null; onSelect: (d: string) => void }) {
  const today = todayStr()
  const initYear  = today.slice(0, 4)
  const initMonth = today.slice(5, 7)
  const [year, setYear]   = useState(Number(initYear))
  const [month, setMonth] = useState(Number(initMonth) - 1)

  const MONTH_NAMES = ['January','February','March','April','May','June',
                       'July','August','September','October','November','December']

  function prev() { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  function next() { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  return (
    <div className="p-4 md:p-6 max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition-colors"><IconChevronLeft  className="w-4 h-4" strokeWidth={2} /></button>
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">{MONTH_NAMES[month]} {year}</p>
        <button onClick={next} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition-colors"><IconChevronRight className="w-4 h-4" strokeWidth={2} /></button>
      </div>
      <MonthGrid year={year} month={month} today={today} selected={selected} onSelect={onSelect} />
    </div>
  )
}

function YearCalendarView({ selected, onSelect }: { selected: string | null; onSelect: (d: string) => void }) {
  const today = todayStr()
  const [year, setYear] = useState(Number(today.slice(0, 4)))
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-center gap-4 mb-6">
        <button onClick={() => setYear(y => y - 1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition-colors"><IconChevronLeft  className="w-4 h-4" strokeWidth={2} /></button>
        <p className="text-base font-bold text-gray-800 dark:text-slate-100">{year}</p>
        <button onClick={() => setYear(y => y + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition-colors"><IconChevronRight className="w-4 h-4" strokeWidth={2} /></button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {MONTH_NAMES.map((name, mi) => (
          <div key={mi} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2 uppercase tracking-wide">{name}</p>
            <MonthGrid year={year} month={mi} today={today} selected={selected} onSelect={onSelect} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

type TodayMode = 'plan' | 'challenges'
type PlanScope = 'today' | 'tomorrow' | 'week' | 'month' | 'year'
type Panel     = 'plan' | 'journal'

export function TodayTab() {
  const { t } = useLanguage()
  const [mode, setMode]               = useState<TodayMode>('plan')
  const [scope, setScope]             = useState<PlanScope>('today')
  const [mobilePanel, setMobilePanel] = useState<Panel>('plan')
  // When user picks a specific date from the month/year calendar
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const today = todayStr()

  // Which date drives the day plan panel
  const planDate =
    selectedDate       ? selectedDate :
    scope === 'tomorrow' ? tomorrowStr() :
    today

  const isCalendarScope = scope === 'month' || scope === 'year'
  // In calendar scopes, if a date is selected, show the plan for it
  const showSelectedDayPlan = isCalendarScope && selectedDate !== null

  const headerSub =
    selectedDate       ? fmtFull(selectedDate) :
    scope === 'week'   ? t.thisWeek :
    scope === 'tomorrow' ? fmtFull(tomorrowStr()) :
    scope === 'month'  ? new Date(today + 'T00:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) :
    scope === 'year'   ? String(new Date().getFullYear()) :
    fmtFull(today)

  const SCOPES: { key: PlanScope; label: string }[] = [
    { key: 'today',    label: t.todayLabel },
    { key: 'tomorrow', label: t.tomorrow   },
    { key: 'week',     label: t.thisWeek   },
    { key: 'month',    label: 'Month' },
    { key: 'year',     label: 'Year' },
  ]

  function handleScopeChange(s: PlanScope) {
    setScope(s)
    setSelectedDate(null)  // clear date selection when switching scope
  }

  function handleCalendarSelect(date: string) {
    setSelectedDate(date)
  }

  function backToCalendar() {
    setSelectedDate(null)
  }

  function renderPlanContent() {
    if (scope === 'week' && !selectedDate) return <WeekPlanView />
    return <PlanPanel key={planDate} date={planDate} />
  }

  function renderCalendarContent() {
    if (scope === 'month') return <MonthCalendarView selected={selectedDate} onSelect={handleCalendarSelect} />
    return <YearCalendarView selected={selectedDate} onSelect={handleCalendarSelect} />
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-xero-bg">
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3 bg-white border-b border-xero-border flex-shrink-0 gap-2 flex-wrap">
        <div className="min-w-0 flex items-center gap-2">
          {/* Back button when viewing a specific day from calendar */}
          {showSelectedDayPlan && (
            <button
              onClick={backToCalendar}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors flex-shrink-0"
            >
              ‹ {scope === 'month' ? 'Month' : 'Year'}
            </button>
          )}
          <div className="min-w-0">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              {mode === 'challenges' ? 'Challenges' : t.planner}
            </p>
            <h1 className="text-base font-semibold text-gray-900 dark:text-slate-100 truncate">
              {mode === 'challenges' ? '🏆 My Challenges' : headerSub}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
          {/* Mode switcher */}
          <div className="flex gap-0.5 bg-gray-100 dark:bg-slate-700 rounded-xl p-1">
            <button
              onClick={() => setMode('plan')}
              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                mode === 'plan' ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
              }`}
            >
              {t.planLabel}
            </button>
            <button
              onClick={() => setMode('challenges')}
              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                mode === 'challenges' ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
              }`}
            >
              🏆 Challenges
            </button>
          </div>

          {/* Scope switcher — only in plan mode, only when no specific date selected */}
          {mode === 'plan' && !showSelectedDayPlan && (
            <div className="flex overflow-x-auto gap-0.5 bg-gray-100 dark:bg-slate-700 rounded-xl p-1" style={{ scrollbarWidth: 'none' }}>
              {SCOPES.map(s => (
                <button
                  key={s.key}
                  onClick={() => handleScopeChange(s.key)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    scope === s.key ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Mobile plan/journal switcher — only in day/week plan views */}
          {mode === 'plan' && !isCalendarScope && (
            <div className="flex md:hidden gap-0.5 bg-gray-100 dark:bg-slate-700 rounded-xl p-1">
              {(['plan', 'journal'] as Panel[]).map(p => (
                <button
                  key={p}
                  onClick={() => setMobilePanel(p)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                    mobilePanel === p ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
                  }`}
                >
                  {p === 'plan' ? t.planLabel : t.todayLog}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {mode === 'challenges' ? (
          <ChallengesView scope="general" />
        ) : isCalendarScope && !showSelectedDayPlan ? (
          /* Calendar view (month or year) */
          renderCalendarContent()
        ) : isCalendarScope && showSelectedDayPlan ? (
          /* Selected day from calendar — show plan only (no journal split) */
          <div className="h-full bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
            {renderPlanContent()}
          </div>
        ) : (
          /* Normal day/tomorrow/week plan + journal */
          <>
            <div className="hidden md:flex h-full">
              <div className="flex-1 border-r border-xero-border bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
                {renderPlanContent()}
              </div>
              <div className="flex-1 bg-white dark:bg-slate-900 overflow-hidden">
                <JournalPanel />
              </div>
            </div>
            <div className="md:hidden h-full bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
              {mobilePanel === 'plan' ? renderPlanContent() : <JournalPanel />}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
