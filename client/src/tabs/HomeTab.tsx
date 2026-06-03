import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useDailyPlan } from '../hooks/useDailyPlan'
import { useMealLogs } from '../hooks/useMeal'
import { useAllReminders, useVocabulary } from '../hooks/useNotebook'
import {
  IconCalendarDay, IconBell, IconMeal, IconWorkout, IconBook, IconCart,
  IconChevronRight, IconZap, IconLog,
} from '../lib/icons'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function greet(name: string): string {
  const h = new Date().getHours()
  const first = name.split(' ')[0]
  if (h < 12) return `Good morning, ${first}`
  if (h < 18) return `Good afternoon, ${first}`
  return `Good evening, ${first}`
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ─── Widget shell ─────────────────────────────────────────────────────────────

function Widget({
  icon, label, to, children, accent = 'blue',
}: {
  icon: React.ReactNode
  label: string
  to: string
  children: React.ReactNode
  accent?: 'blue' | 'green' | 'amber' | 'purple' | 'rose' | 'cyan'
}) {
  const ring: Record<string, string> = {
    blue:   'hover:border-blue-400/40',
    green:  'hover:border-emerald-400/40',
    amber:  'hover:border-amber-400/40',
    purple: 'hover:border-purple-400/40',
    rose:   'hover:border-rose-400/40',
    cyan:   'hover:border-cyan-400/40',
  }
  const iconBg: Record<string, string> = {
    blue:   'bg-blue-500/10 text-blue-400',
    green:  'bg-emerald-500/10 text-emerald-400',
    amber:  'bg-amber-500/10 text-amber-400',
    purple: 'bg-purple-500/10 text-purple-400',
    rose:   'bg-rose-500/10 text-rose-400',
    cyan:   'bg-cyan-500/10 text-cyan-400',
  }

  return (
    <Link
      to={to}
      className={`group block bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 transition-all hover:shadow-md ${ring[accent]} hover:border-opacity-100`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg[accent]}`}>
            {icon}
          </span>
          <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
        </div>
        <IconChevronRight className="w-4 h-4 text-gray-300 dark:text-slate-600 group-hover:text-gray-500 transition-colors" strokeWidth={2} />
      </div>
      {children}
    </Link>
  )
}

// ─── Individual widgets ────────────────────────────────────────────────────────

function PlannerWidget() {
  const today = todayStr()
  const { plan } = useDailyPlan(today)
  const tasks = plan?.tasks ?? []
  const done  = tasks.filter(t => t.done).length
  const total = tasks.length

  return (
    <Widget icon={<IconCalendarDay className="w-4 h-4" strokeWidth={2} />} label="Planner" to="/planner" accent="blue">
      {total === 0 ? (
        <p className="text-sm text-gray-400 dark:text-slate-500">No tasks today</p>
      ) : (
        <>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-1">
            {done}<span className="text-base font-medium text-gray-400 dark:text-slate-500">/{total}</span>
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">tasks completed</p>
          <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-400 rounded-full transition-all"
              style={{ width: `${total ? (done / total) * 100 : 0}%` }}
            />
          </div>
        </>
      )}
    </Widget>
  )
}

function RemindersWidget() {
  const { reminders } = useAllReminders()
  const now     = new Date()
  const pending = reminders.filter(r => !r.done)
  const overdue = pending.filter(r => r.due_at && new Date(r.due_at) < now && !isSameDay(new Date(r.due_at), now))
  const today   = pending.filter(r => r.due_at && isSameDay(new Date(r.due_at), now))
  const total   = overdue.length + today.length

  return (
    <Widget icon={<IconBell className="w-4 h-4" strokeWidth={2} />} label="Reminders" to="/reminders" accent="amber">
      {total === 0 ? (
        <p className="text-sm text-gray-400 dark:text-slate-500">All clear</p>
      ) : (
        <div className="space-y-1.5">
          {overdue.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
              <p className="text-sm text-gray-700 dark:text-slate-300">
                <span className="font-semibold text-red-500">{overdue.length}</span> overdue
              </p>
            </div>
          )}
          {today.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
              <p className="text-sm text-gray-700 dark:text-slate-300">
                <span className="font-semibold text-amber-500">{today.length}</span> due today
              </p>
            </div>
          )}
          {pending.length - total > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-slate-600 flex-shrink-0" />
              <p className="text-sm text-gray-500 dark:text-slate-400">{pending.length - total} upcoming</p>
            </div>
          )}
        </div>
      )}
    </Widget>
  )
}

function MealWidget() {
  const today = todayStr()
  const { logs } = useMealLogs(today)
  const totalCal = logs.reduce((sum, log) =>
    sum + log.items.reduce((s, item) => s + item.calories, 0), 0
  )

  return (
    <Widget icon={<IconMeal className="w-4 h-4" strokeWidth={2} />} label="Meal" to="/life/meal" accent="green">
      {totalCal === 0 ? (
        <p className="text-sm text-gray-400 dark:text-slate-500">Nothing logged today</p>
      ) : (
        <>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {totalCal.toLocaleString()}<span className="text-base font-medium text-gray-400 dark:text-slate-500"> kcal</span>
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">today's intake</p>
        </>
      )}
    </Widget>
  )
}

function SportWidget() {
  return (
    <Widget icon={<IconWorkout className="w-4 h-4" strokeWidth={2} />} label="Sport" to="/life/sport" accent="rose">
      <p className="text-sm text-gray-700 dark:text-slate-300 font-medium">Track workouts</p>
      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Exercises · Targets · Weight</p>
    </Widget>
  )
}

function LearnWidget() {
  const { vocab } = useVocabulary()
  const today = todayStr()
  const due   = vocab.filter((c: { due_at: string }) => c.due_at.slice(0, 10) <= today).length

  return (
    <Widget icon={<IconBook className="w-4 h-4" strokeWidth={2} />} label="Learn" to="/learn/notes" accent="purple">
      {due === 0 ? (
        <p className="text-sm text-gray-400 dark:text-slate-500">No cards due</p>
      ) : (
        <>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {due}<span className="text-base font-medium text-gray-400 dark:text-slate-500"> cards</span>
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">due for review</p>
        </>
      )}
    </Widget>
  )
}

function FinanceWidget() {
  return (
    <Widget icon={<IconZap className="w-4 h-4" strokeWidth={2} />} label="Finance" to="/finance/overview" accent="cyan">
      <p className="text-sm text-gray-700 dark:text-slate-300 font-medium">P&L · Cash Flow · ETF</p>
      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Open dashboard →</p>
    </Widget>
  )
}

function ShoppingWidget() {
  return (
    <Widget icon={<IconCart className="w-4 h-4" strokeWidth={2} />} label="Shopping" to="/life/meal?view=shopping" accent="amber">
      <p className="text-sm text-gray-700 dark:text-slate-300 font-medium">Shopping list</p>
      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Add items · View history</p>
    </Widget>
  )
}

function LogWidget() {
  const today = todayStr()
  return (
    <Widget icon={<IconLog className="w-4 h-4" strokeWidth={2} />} label="Log" to="/life/log" accent="green">
      <p className="text-sm text-gray-700 dark:text-slate-300 font-medium">Daily journal</p>
      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{fmtDate(today)}</p>
    </Widget>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

// ─── Home page ────────────────────────────────────────────────────────────────

export function HomeTab() {
  const { user } = useAuth()
  const today = todayStr()

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-xero-bg">
      {/* Header */}
      <div className="px-6 md:px-10 pt-8 pb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-slate-100">
          {user ? greet(user.name) : 'Welcome back'}
        </h1>
        <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">{fmtDate(today)}</p>
      </div>

      {/* Widget grid */}
      <div className="px-6 md:px-10 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <PlannerWidget />
          <RemindersWidget />
          <MealWidget />
          <SportWidget />
          <LearnWidget />
          <FinanceWidget />
          <LogWidget />
          <ShoppingWidget />
        </div>
      </div>
    </div>
  )
}
