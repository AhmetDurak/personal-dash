import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useJournalEntry } from '../hooks/useJournal'
import { useDailyPlan } from '../hooks/useDailyPlan'
import type { PlanTask } from '../hooks/useDailyPlan'
import { useLanguage } from '../hooks/useLanguage'
import { useAllReminders } from '../hooks/useNotebook'
import { ChallengesView } from '../components/web/ChallengesView'
import { IconClose, IconChevronLeft, IconChevronRight, IconBell, IconCheck } from '../lib/icons'
import { useRoutineReminders } from '../hooks/useRoutineReminders'

// ─── Date helpers ─────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function offsetDay(base: string, delta: number): string {
  const d = new Date(base + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function currentWeekMonday(): string {
  const today = new Date()
  const dow = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dow + 6) % 7))
  return monday.toISOString().slice(0, 10)
}

function getWeekDays(weekStart?: string): string[] {
  const base = weekStart
    ? new Date(weekStart + 'T00:00:00')
    : new Date(currentWeekMonday() + 'T00:00:00')
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

function weekLabel(weekStart: string): string {
  const thisMonday = currentWeekMonday()
  if (weekStart === thisMonday) return 'This Week'
  const days = getWeekDays(weekStart)
  const s = new Date(days[0] + 'T00:00:00')
  const e = new Date(days[6] + 'T00:00:00')
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }
  return `${s.toLocaleDateString('en-GB', opts)} – ${e.toLocaleDateString('en-GB', opts)}`
}

function dayLabel(date: string, today: string): string {
  if (date === today) return 'Today'
  if (date === offsetDay(today, -1)) return 'Yesterday'
  if (date === offsetDay(today,  1)) return 'Tomorrow'
  return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
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

// ─── Task tag UI ──────────────────────────────────────────────────────────────

type TaskTag = 'task' | 'sport' | 'challenge'

const TAG_META: Record<TaskTag, { label: string; icon: string; color: string }> = {
  task:      { label: 'Task',      icon: '📋', color: 'bg-gray-100 text-gray-600' },
  sport:     { label: 'Sport',     icon: '🏋️', color: 'bg-blue-50 text-blue-600' },
  challenge: { label: 'Routine', icon: '🔁', color: 'bg-amber-50 text-amber-600' },
}

function TagBadge({ tag }: { tag: TaskTag }) {
  const m = TAG_META[tag]
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${m.color}`}>
      {m.icon} {m.label}
    </span>
  )
}

// ─── Plan panel (single day) ──────────────────────────────────────────────────

function PlanPanel({ date, listOnly = false, noHeader = false }: { date: string; listOnly?: boolean; noHeader?: boolean }) {
  const { t } = useLanguage()
  const { plan, save } = useDailyPlan(date)
  const { add: addReminder, reminders } = useAllReminders()
  const activeReminderTitles = new Set(reminders.filter(r => !r.done).map(r => r.title.toLowerCase()))
  const [tasks, setTasks]               = useState<PlanTask[]>([])
  const [notes, setNotes]               = useState('')
  const [input, setInput]               = useState('')
  const [saving, setSaving]             = useState(false)
  const [reminderDt, setReminderDt]     = useState('')
  const [showReminder, setShowReminder] = useState(false)
  const [editingId, setEditingId]       = useState<string | null>(null)
  const [editText, setEditText]         = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loaded = useRef(false)
  const prevTaskIds = useRef('')

  useEffect(() => {
    if (plan === null) return
    if (listOnly) {
      const ids = (plan.tasks ?? []).map(t => t.id).sort().join(',')
      if (ids !== prevTaskIds.current) {
        setTasks(plan.tasks ?? [])
        prevTaskIds.current = ids
      }
    } else {
      if (!loaded.current) {
        setTasks(plan?.tasks ?? [])
        setNotes(plan?.notes ?? '')
        loaded.current = true
      }
    }
  }, [plan, listOnly])

  function scheduleSave(ts: PlanTask[], n: string) {
    if (listOnly) {
      save(ts, plan?.notes ?? '')
      return
    }
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(async () => { await save(ts, n); setSaving(false) }, 600)
  }

  async function addTask() {
    const text = input.trim()
    if (!text) return
    const newTask: PlanTask = { id: crypto.randomUUID(), text, done: false }
    const next: PlanTask[] = [...tasks, newTask]
    setTasks(next); setInput('')
    scheduleSave(next, notes)
    if (reminderDt) {
      await addReminder({ title: text, due_at: reminderDt })
      setReminderDt(''); setShowReminder(false)
    }
  }

  function toggleReminderInput() {
    if (showReminder) { setShowReminder(false); setReminderDt('') }
    else { if (!reminderDt) setReminderDt(`${date}T09:00`); setShowReminder(true) }
  }

  function toggleTask(id: string) {
    const task    = tasks.find(tk => tk.id === id)
    const next    = tasks.map(tk => tk.id === id ? { ...tk, done: !tk.done } : tk)
    const updated = next.find(tk => tk.id === id)
    setTasks(next)
    scheduleSave(next, notes)
    if (task && updated?.done && task.trainingScheduleId) {
      const setCount = task.setsCount ?? 0
      const autoSets = setCount > 0
        ? [{ exercise_name: task.text, sets: Array.from({ length: setCount }, () => ({ reps: task.reps ?? 0, weight_kg: task.weightKg ?? null })) }]
        : []
      fetch('/api/sport/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, sets: autoSets, template_id: task.templateId ?? null, notes: task.text, duration_min: task.durationMin ?? null }),
      }).catch(() => {})
    }
  }

  function deleteTask(id: string) {
    const next = tasks.filter(tk => tk.id !== id)
    setTasks(next); scheduleSave(next, notes)
  }

  function startEdit(task: PlanTask) {
    if (task.done) return
    setEditingId(task.id); setEditText(task.text)
  }

  function commitEdit(id: string) {
    const text = editText.trim()
    if (!text) { setEditingId(null); return }
    const next = tasks.map(tk => tk.id === id ? { ...tk, text } : tk)
    setTasks(next); scheduleSave(next, notes); setEditingId(null)
  }

  const done  = tasks.filter(tk => tk.done).length
  const total = tasks.length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {!noHeader && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide">{t.planLabel}</p>
            {total > 0 && <p className="text-xs text-gray-400 mt-0.5">{done}/{total} {done === total && total > 0 ? '✓' : ''}</p>}
          </div>
          {saving && <span className="text-xs text-gray-400">{t.saving}</span>}
        </div>
      )}

      {total > 0 && (
        <div className="h-1 bg-gray-100 flex-shrink-0">
          <div className="h-full bg-xero-green transition-all duration-500" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {tasks.length === 0 && <p className="text-sm text-gray-400 text-center py-6">{t.noTasksYet}</p>}
        {tasks.map(task => (
          <div key={task.id} className="flex items-center gap-3 group bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl px-4 py-3 hover:border-gray-200 transition-colors">
            <button
              onClick={() => toggleTask(task.id)}
              className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                task.done ? 'bg-xero-green border-xero-green' : 'border-gray-300 hover:border-xero-green'
              }`}
            >
              {task.done && (
                <IconCheck className="w-3 h-3 text-white" strokeWidth={3} />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                {task.tag && <TagBadge tag={task.tag} />}
                {task.timeOfDay && (
                  <span className="text-[10px] bg-violet-50 dark:bg-violet-900/20 text-violet-500 px-1.5 py-0.5 rounded-full">
                    🕐 {task.timeOfDay}
                  </span>
                )}
                {task.chain != null && task.chain > 0 && (
                  <span className="text-[10px] bg-orange-50 dark:bg-orange-900/20 text-orange-500 px-1.5 py-0.5 rounded-full font-medium">
                    🔥 {task.chain} day{task.chain !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {editingId === task.id ? (
                <input
                  autoFocus
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onBlur={() => commitEdit(task.id)}
                  onKeyDown={e => { if (e.key === 'Enter') commitEdit(task.id); if (e.key === 'Escape') setEditingId(null) }}
                  className="block w-full text-sm border-0 border-b border-xero-green focus:outline-none bg-transparent text-gray-800 dark:text-slate-100 mt-0.5"
                />
              ) : (
                <span
                  onClick={() => startEdit(task)}
                  className={`block text-sm mt-0.5 ${task.done ? 'line-through text-gray-400' : 'text-gray-800 dark:text-slate-100 cursor-text'}`}
                >{task.text}</span>
              )}
              {task.tag === 'challenge' && task.description && (
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 line-clamp-1">{task.description}</p>
              )}
            </div>
            {activeReminderTitles.has(task.text.toLowerCase()) && (
              <span className="text-amber-400 flex-shrink-0 text-sm">🔔</span>
            )}
            <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-opacity text-xs flex-shrink-0">✕</button>
          </div>
        ))}
      </div>

      {!listOnly && (
        <div className="flex-shrink-0 px-6 pb-4 space-y-2">
          <form onSubmit={e => { e.preventDefault(); addTask() }} className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={t.addTask}
              className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-xero-green placeholder-gray-300"
            />
            <button type="button" onClick={toggleReminderInput} title="Set reminder"
              className={`flex-shrink-0 px-2.5 py-2 rounded-xl transition-colors ${
                showReminder ? 'bg-amber-100 text-amber-500' : 'bg-gray-100 text-gray-400 hover:text-amber-500 dark:bg-gray-700 dark:text-gray-500'
              }`}>
              <IconBell className="w-4 h-4" strokeWidth={2} />
            </button>
            <button type="submit" className="text-sm px-3 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium">
              {t.add}
            </button>
          </form>
          {showReminder && (
            <input type="datetime-local" value={reminderDt} onChange={e => setReminderDt(e.target.value)}
              className="w-full text-sm border border-amber-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-200 bg-amber-50/30" />
          )}
          <textarea
            value={notes}
            onChange={e => { setNotes(e.target.value); scheduleSave(tasks, e.target.value) }}
            placeholder={t.motivationalNotesPlaceholder}
            rows={3}
            className="w-full text-sm border border-amber-100 bg-amber-50/40 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-amber-200 resize-none placeholder-gray-400"
          />
        </div>
      )}
    </div>
  )
}

// ─── Week day row (compact, no accordion) ─────────────────────────────────────

function WeekDayRow({
  date, selected, onSelect,
}: { date: string; selected: boolean; onSelect: () => void }) {
  const { t } = useLanguage()
  const today    = date === todayStr()
  const tomorrow = date === offsetDay(todayStr(), 1)
  const { plan } = useDailyPlan(date)
  const tasks = plan?.tasks ?? []
  const done  = tasks.filter(tk => tk.done).length
  const total = tasks.length

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
        selected
          ? 'border-xero-green bg-emerald-50/60 dark:bg-emerald-900/20'
          : today
          ? 'border-xero-green/30 bg-white hover:bg-emerald-50/30'
          : 'border-gray-100 bg-white hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-semibold ${selected ? 'text-xero-green' : today ? 'text-xero-green' : 'text-gray-700'}`}>
            {fmtShort(date)}
          </span>
          {today    && <span className="text-[10px] bg-xero-green text-white px-1.5 py-0.5 rounded-full font-semibold">{t.todayLabel}</span>}
          {tomorrow && <span className="text-[10px] bg-amber-400 text-white px-1.5 py-0.5 rounded-full font-semibold">{t.tomorrow}</span>}
        </div>
        {total > 0
          ? done === total
            ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-500 flex-shrink-0">
                <IconCheck className="w-3.5 h-3.5" strokeWidth={3} />
                All done
              </span>
            : <span className="text-xs text-gray-400 flex-shrink-0">{done}/{total}</span>
          : <span className="text-xs text-gray-300 flex-shrink-0">{t.noTasksYet}</span>
        }
      </div>
      {total > 0 && (
        <div className={`h-1 rounded-full overflow-hidden mt-2 ${done === total ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-gray-100'}`}>
          <div
            className={`h-full transition-all ${done === total ? 'bg-emerald-500' : 'bg-xero-green'}`}
            style={{ width: `${(done / total) * 100}%` }}
          />
        </div>
      )}
    </button>
  )
}

function WeekPlanView({
  weekStart, selectedDay, onSelectDay,
}: { weekStart: string; selectedDay: string | null; onSelectDay: (d: string) => void }) {
  const days = getWeekDays(weekStart)
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
      {days.map(date => (
        <WeekDayRow
          key={date}
          date={date}
          selected={selectedDay === date}
          onSelect={() => onSelectDay(date)}
        />
      ))}
    </div>
  )
}

function MonthDayListView({
  year, month, selectedDay, onSelectDay,
}: {
  year: number; month: number
  selectedDay: string | null; onSelectDay: (d: string) => void
}) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: string[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
      {days.map(date => (
        <WeekDayRow
          key={date}
          date={date}
          selected={selectedDay === date}
          onSelect={() => onSelectDay(date)}
        />
      ))}
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

function JournalPanel({ date, noHeader = false }: { date?: string; noHeader?: boolean }) {
  const { t } = useLanguage()
  const d = date ?? todayStr()
  const { entry, save } = useJournalEntry(d)
  const [content, setContent]   = useState('')
  const [wentWell, setWentWell] = useState<string[]>([])
  const [wentBad, setWentBad]   = useState<string[]>([])
  const [saving, setSaving]     = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loaded = useRef(false)

  useEffect(() => {
    loaded.current = false; setContent(''); setWentWell([]); setWentBad([])
  }, [d])

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
      {!noHeader && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <p className="text-xs font-semibold text-xero-green uppercase tracking-wide">{t.todayLog}</p>
          {saving && <span className="text-xs text-gray-400">{t.saving}</span>}
        </div>
      )}
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
  const firstDow = new Date(year, month, 1).getDay()
  const startOffset = (firstDow + 6) % 7
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

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']

function YearCalendarView({
  year, onYearChange, selected, onSelect,
}: {
  year: number; onYearChange: (y: number) => void
  selected: string | null; onSelect: (d: string) => void
}) {
  const today = todayStr()
  const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-center gap-4 mb-6">
        <button onClick={() => onYearChange(year - 1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition-colors"><IconChevronLeft  className="w-4 h-4" strokeWidth={2} /></button>
        <p className="text-base font-bold text-gray-800 dark:text-slate-100">{year}</p>
        <button onClick={() => onYearChange(year + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition-colors"><IconChevronRight className="w-4 h-4" strokeWidth={2} /></button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {SHORT_MONTHS.map((name, mi) => (
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

// ─── Accordion section ────────────────────────────────────────────────────────

function AccordionSection({ title, open, onToggle, children, grow = true }: {
  title: string; open: boolean; onToggle: () => void
  children: React.ReactNode; grow?: boolean
}) {
  return (
    <div className={`flex flex-col min-h-0 border-b border-gray-100 dark:border-slate-800 ${open && grow ? 'flex-1' : 'flex-shrink-0'}`}>
      <button
        onClick={onToggle}
        className="flex-shrink-0 flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <span className="text-xs font-semibold text-amber-500 dark:text-amber-400 uppercase tracking-wide">{title}</span>
        <IconChevronRight
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
          strokeWidth={2}
        />
      </button>
      {open && (
        <div className={`min-h-0 ${grow ? 'flex-1 overflow-hidden' : 'overflow-y-auto max-h-64'}`}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Plan entry (add-task form + notes, for day scope right panel) ────────────

function PlanEntry({ date }: { date: string }) {
  const { t } = useLanguage()
  const { plan, save } = useDailyPlan(date)
  const { add: addReminder } = useAllReminders()
  const [input, setInput]               = useState('')
  const [reminderDt, setReminderDt]     = useState('')
  const [showReminder, setShowReminder] = useState(false)
  const [notes, setNotes]               = useState('')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const notesLoaded = useRef(false)

  useEffect(() => { notesLoaded.current = false; setNotes('') }, [date])
  useEffect(() => {
    if (plan !== null && !notesLoaded.current) {
      setNotes(plan?.notes ?? '')
      notesLoaded.current = true
    }
  }, [plan])

  function scheduleNotesSave(n: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { save(plan?.tasks ?? [], n) }, 600)
  }

  async function addTask() {
    const text = input.trim()
    if (!text) return
    const newTask: PlanTask = { id: crypto.randomUUID(), text, done: false }
    await save([...(plan?.tasks ?? []), newTask], notes)
    setInput('')
    if (reminderDt) {
      await addReminder({ title: text, due_at: reminderDt })
      setReminderDt(''); setShowReminder(false)
    }
  }

  function toggleReminderInput() {
    if (showReminder) { setShowReminder(false); setReminderDt('') }
    else { if (!reminderDt) setReminderDt(`${date}T09:00`); setShowReminder(true) }
  }

  return (
    <div className="px-5 py-4 space-y-2">
      <form onSubmit={e => { e.preventDefault(); addTask() }} className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t.addTask}
          className="flex-1 text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-xero-green placeholder-gray-300 dark:bg-slate-800 dark:text-slate-100"
        />
        <button type="button" onClick={toggleReminderInput} title="Set reminder"
          className={`flex-shrink-0 px-2.5 py-2 rounded-xl transition-colors ${
            showReminder ? 'bg-amber-100 text-amber-500' : 'bg-gray-100 text-gray-400 hover:text-amber-500 dark:bg-slate-700 dark:text-slate-400'
          }`}>
          <IconBell className="w-4 h-4" strokeWidth={2} />
        </button>
        <button type="submit" className="text-sm px-3 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium">
          {t.add}
        </button>
      </form>
      {showReminder && (
        <input type="datetime-local" value={reminderDt} onChange={e => setReminderDt(e.target.value)}
          className="w-full text-sm border border-amber-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-200 bg-amber-50/30" />
      )}
      <textarea
        value={notes}
        onChange={e => { setNotes(e.target.value); scheduleNotesSave(e.target.value) }}
        placeholder={t.motivationalNotesPlaceholder}
        rows={4}
        className="w-full text-sm border border-amber-100 dark:border-amber-900/30 bg-amber-50/40 dark:bg-amber-900/10 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-amber-200 resize-none placeholder-gray-400"
      />
    </div>
  )
}

// ─── Right panel (accordion Plan + Log) ───────────────────────────────────────

function RightPanel({
  scope, weekDay, selectedDate, dayDate,
}: { scope: PlanScope; weekDay: string | null; selectedDate: string | null; dayDate: string }) {
  const [planOpen, setPlanOpen] = useState(true)
  const [logOpen, setLogOpen]   = useState(true)

  const placeholder = (
    <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
      <div className="text-center">
        <p className="text-3xl mb-2">📅</p>
        <p>Select a day to view its plan</p>
      </div>
    </div>
  )

  if (scope === 'week' && !weekDay) return placeholder
  if (scope === 'month' && !selectedDate) return placeholder

  const activeDate = scope === 'week' ? weekDay! : scope === 'month' ? selectedDate! : dayDate

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AccordionSection title="Plan" open={planOpen} onToggle={() => setPlanOpen(v => !v)}>
        {scope === 'day'
          ? <PlanEntry key={activeDate} date={activeDate} />
          : <PlanPanel key={activeDate} date={activeDate} noHeader />
        }
      </AccordionSection>
      <AccordionSection
        title={scope === 'day' ? "Today's Log" : "Day's Log"}
        open={logOpen}
        onToggle={() => setLogOpen(v => !v)}
      >
        <JournalPanel date={activeDate} noHeader />
      </AccordionSection>
    </div>
  )
}

type TodayMode = 'plan' | 'challenges'
type PlanScope = 'day' | 'week' | 'month' | 'year'
type Panel     = 'plan' | 'journal'

export function TodayTab() {
  const { t } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()
  const [mobilePanel, setMobilePanel] = useState<Panel>('plan')

  const today      = todayStr()
  useRoutineReminders(today)
  const mode       = (searchParams.get('mode')  as TodayMode) ?? 'plan'
  const scope      = (searchParams.get('scope') as PlanScope) ?? 'day'
  const dayDate    = searchParams.get('date')      ?? today
  const selectedDate = searchParams.get('selected')

  // week scope
  const weekStart  = searchParams.get('weekStart') ?? currentWeekMonday()
  const weekDay    = searchParams.get('weekDay')   // selected day within week view

  // month scope
  const viewMonthStr = searchParams.get('viewMonth') ?? today.slice(0, 7)
  const [viewMonthYear, viewMonthMon] = viewMonthStr.split('-').map(Number)

  // year scope
  const viewYear = Number(searchParams.get('viewYear') ?? today.slice(0, 4))

  function up(updates: Record<string, string | null>) {
    setSearchParams(p => {
      Object.entries(updates).forEach(([k, v]) => v !== null ? p.set(k, v) : p.delete(k))
      return p
    })
  }

  const showYearSelectedDay = scope === 'year' && selectedDate !== null

  // Week header navigation
  function prevWeek() { up({ weekStart: offsetDay(weekStart, -7), weekDay: null }) }
  function nextWeek() { up({ weekStart: offsetDay(weekStart,  7), weekDay: null }) }

  // Month header navigation
  function prevMonth() {
    let y = viewMonthYear, m = viewMonthMon - 2 // 0-indexed
    if (m < 0) { m = 11; y-- }
    up({ viewMonth: `${y}-${String(m + 1).padStart(2, '0')}`, selected: null })
  }
  function nextMonth() {
    let y = viewMonthYear, m = viewMonthMon // 0-indexed (already +1 from string)
    if (m > 11) { m = 0; y++ }
    up({ viewMonth: `${y}-${String(m + 1).padStart(2, '0')}`, selected: null })
  }

  const headerSub =
    showYearSelectedDay   ? fmtFull(selectedDate!) :
    scope === 'week'      ? weekLabel(weekStart) :
    scope === 'month'     ? `${MONTH_NAMES[viewMonthMon - 1]} ${viewMonthYear}` :
    scope === 'year'      ? String(viewYear) :
    fmtFull(dayDate)

  const SCOPES: { key: PlanScope; label: string }[] = [
    { key: 'day',   label: 'Today'    },
    { key: 'week',  label: t.thisWeek },
    { key: 'month', label: 'Month'    },
    { key: 'year',  label: 'Year'     },
  ]

  function handleScopeChange(s: PlanScope) { up({ scope: s, selected: null }) }
  function prevDay() { up({ scope: 'day', date: offsetDay(dayDate, -1), selected: null }) }
  function nextDay() { up({ scope: 'day', date: offsetDay(dayDate,  1), selected: null }) }

  function renderPlanContent() {
    if (scope === 'week') return (
      <WeekPlanView
        weekStart={weekStart}
        selectedDay={weekDay}
        onSelectDay={d => up({ weekDay: d })}
      />
    )
    if (scope === 'month') return (
      <MonthDayListView
        year={viewMonthYear} month={viewMonthMon - 1}
        selectedDay={selectedDate}
        onSelectDay={d => up({ selected: d })}
      />
    )
    return <PlanPanel key={dayDate} date={dayDate} listOnly />
  }

  function renderYearCalendar() {
    return (
      <YearCalendarView
        year={viewYear} onYearChange={y => up({ viewYear: String(y), selected: null })}
        selected={selectedDate} onSelect={d => up({ selected: d })}
      />
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-xero-bg">
      {/* Header */}
      <header className="flex flex-col px-4 md:px-6 py-2.5 bg-white border-b border-xero-border flex-shrink-0 gap-1.5 overflow-hidden">
        {/* Title + back button */}
        <div className="flex items-center gap-2 min-w-0">
          {showYearSelectedDay && (
            <button
              onClick={() => up({ selected: null })}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors flex-shrink-0"
            >
              ‹ Year
            </button>
          )}
          <div className="min-w-0">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide leading-none mb-0.5">
              {mode === 'challenges' ? 'Routine' : t.planner}
            </p>
            <h1 className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">
              {mode === 'challenges' ? '🔁 My Routines' : headerSub}
            </h1>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {/* Mode switcher */}
          <div className="flex gap-0.5 bg-gray-100 dark:bg-slate-700 rounded-xl p-1 flex-shrink-0">
            <button
              onClick={() => up({ mode: 'plan' })}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                mode === 'plan' ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
              }`}
            >{t.planLabel}</button>
            <button
              onClick={() => up({ mode: 'challenges' })}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                mode === 'challenges' ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
              }`}
            >🔁 Routine</button>
          </div>

          {/* Day navigator */}
          {mode === 'plan' && scope === 'day' && (
            <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-slate-700 rounded-xl p-1 flex-shrink-0">
              <button onClick={prevDay} className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-600 hover:shadow-sm transition-colors">
                <IconChevronLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
              <button
                onClick={() => up({ scope: 'day', date: today, selected: null })}
                className="text-xs px-2 py-1 rounded-lg font-medium transition-colors whitespace-nowrap min-w-[72px] text-center bg-white dark:bg-slate-600 text-gray-900 dark:text-slate-100 shadow-sm"
              >{dayLabel(dayDate, today)}</button>
              <button onClick={nextDay} className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-600 hover:shadow-sm transition-colors">
                <IconChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            </div>
          )}

          {/* Week navigator */}
          {mode === 'plan' && scope === 'week' && (
            <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-slate-700 rounded-xl p-1 flex-shrink-0">
              <button onClick={prevWeek} className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-600 hover:shadow-sm transition-colors">
                <IconChevronLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
              <button
                onClick={() => up({ weekStart: currentWeekMonday(), weekDay: null })}
                className="text-xs px-2 py-1 rounded-lg font-medium whitespace-nowrap min-w-[80px] text-center bg-white dark:bg-slate-600 text-gray-900 dark:text-slate-100 shadow-sm"
              >{weekLabel(weekStart)}</button>
              <button onClick={nextWeek} className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-600 hover:shadow-sm transition-colors">
                <IconChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            </div>
          )}

          {/* Month navigator */}
          {mode === 'plan' && scope === 'month' && (
            <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-slate-700 rounded-xl p-1 flex-shrink-0">
              <button onClick={prevMonth} className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-600 hover:shadow-sm transition-colors">
                <IconChevronLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
              <span className="text-xs px-2 py-1 rounded-lg font-medium whitespace-nowrap bg-white dark:bg-slate-600 text-gray-900 dark:text-slate-100 shadow-sm">
                {MONTH_NAMES[viewMonthMon - 1].slice(0, 3)} {viewMonthYear}
              </span>
              <button onClick={nextMonth} className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-600 hover:shadow-sm transition-colors">
                <IconChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            </div>
          )}

          {/* Scope pills (Week / Month / Year) */}
          {mode === 'plan' && (
            <div className="flex gap-0.5 bg-gray-100 dark:bg-slate-700 rounded-xl p-1 flex-shrink-0">
              {SCOPES.map(s => (
                <button
                  key={s.key}
                  onClick={() => handleScopeChange(s.key)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    scope === s.key ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
                  }`}
                >{s.label}</button>
              ))}
            </div>
          )}

          {/* Mobile plan/journal switcher (day scope only) */}
          {mode === 'plan' && scope === 'day' && (
            <div className="flex md:hidden gap-0.5 bg-gray-100 dark:bg-slate-700 rounded-xl p-1 flex-shrink-0">
              {(['plan', 'journal'] as Panel[]).map(p => (
                <button
                  key={p}
                  onClick={() => setMobilePanel(p)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    mobilePanel === p ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
                  }`}
                >{p === 'plan' ? t.planLabel : t.todayLog}</button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {mode === 'challenges' ? (
          <ChallengesView scope="general" />
        ) : scope === 'year' && !showYearSelectedDay ? (
          renderYearCalendar()
        ) : scope === 'year' && showYearSelectedDay ? (
          <div className="h-full bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
            <PlanPanel key={selectedDate!} date={selectedDate!} />
          </div>
        ) : (
          /* Day / Week / Month — split view */
          <>
            <div className="hidden md:flex h-full">
              <div className="flex-1 border-r border-xero-border bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
                {renderPlanContent()}
              </div>
              <div className="flex-1 bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
                <RightPanel
                  scope={scope}
                  weekDay={weekDay}
                  selectedDate={selectedDate}
                  dayDate={dayDate}
                />
              </div>
            </div>
            {/* Mobile */}
            <div className="md:hidden h-full bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
              {scope === 'week' && weekDay ? (
                <div className="flex flex-col h-full">
                  <button onClick={() => up({ weekDay: null })} className="flex items-center gap-1 px-4 py-2.5 text-xs text-gray-400 hover:text-gray-600 border-b border-gray-100">
                    ‹ Week
                  </button>
                  <PlanPanel key={weekDay} date={weekDay} />
                </div>
              ) : scope === 'month' && selectedDate ? (
                <div className="flex flex-col h-full">
                  <button onClick={() => up({ selected: null })} className="flex items-center gap-1 px-4 py-2.5 text-xs text-gray-400 hover:text-gray-600 border-b border-gray-100">
                    ‹ Month
                  </button>
                  <PlanPanel key={selectedDate} date={selectedDate} />
                </div>
              ) : scope === 'day' ? (
                mobilePanel === 'plan' ? renderPlanContent() : <JournalPanel date={dayDate} />
              ) : (
                renderPlanContent()
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
