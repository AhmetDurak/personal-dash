import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { IconEdit, IconClose } from '../lib/icons'
import { useExercises, useTemplates, useWorkoutLogs, useFitnessTargets, useBodyWeight } from '../hooks/useSport'
import type { ExerciseType, MuscleGroup, WorkoutSetGroup, SetEntry } from '../hooks/useSport'
import { ConfirmDialog } from '../components/web/ConfirmDialog'
import { ChallengesView } from '../components/web/ChallengesView'
import { useLanguage } from '../hooks/useLanguage'
import { useDarkMode } from '../hooks/useDarkMode'

// ─── Constants ────────────────────────────────────────────────────────────────

const EXERCISE_TYPES: { id: ExerciseType; label: string; icon: string }[] = [
  { id: 'calisthenics', label: 'Calisthenics', icon: '🤸' },
  { id: 'weights',      label: 'Weights',      icon: '🏋️' },
  { id: 'cardio',       label: 'Cardio',       icon: '🏃' },
  { id: 'flexibility',  label: 'Flexibility',  icon: '🧘' },
]

const MUSCLE_GROUPS: MuscleGroup[] = ['arm', 'chest', 'back', 'leg', 'core', 'shoulder']

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard() {
  const month = currentMonth()
  const { logs } = useWorkoutLogs(month)
  const { templates } = useTemplates()

  const thisWeek = logs.filter(l => {
    const d = new Date(l.date)
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    return d >= weekStart
  })

  const totalSets = logs.reduce((s, l) => s + l.sets.reduce((ss, g) => ss + g.sets.length, 0), 0)

  // simple streak: consecutive days with a workout ending today
  const logDates = new Set(logs.map(l => l.date))
  let streak = 0
  const today = todayStr()
  const d = new Date(today)
  while (logDates.has(d.toISOString().slice(0, 10))) {
    streak++
    d.setDate(d.getDate() - 1)
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'This week', value: thisWeek.length, unit: 'workouts' },
          { label: 'Streak',    value: streak,          unit: 'days' },
          { label: 'Total sets', value: totalSets,      unit: 'this month' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.unit}</p>
            <p className="text-[10px] font-semibold text-gray-500 mt-1 uppercase tracking-wide">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent workouts — grouped by date */}
      {logs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent workouts</p>
          <div className="space-y-2">
            {Object.entries(
              logs.reduce<Record<string, typeof logs>>((acc, log) => {
                const d = log.date.slice(0, 10)
                ;(acc[d] ??= []).push(log)
                return acc
              }, {})
            )
              .sort(([a], [b]) => b.localeCompare(a))
              .slice(0, 5)
              .map(([date, dayLogs]) => {
                const allExercises = dayLogs.flatMap(l => l.sets.map(g => g.exercise_name))
                const uniqueExercises = [...new Set(allExercises)]
                const totalDuration = dayLogs.reduce((s, l) => s + (l.duration_min ?? 0), 0)
                const totalSets = dayLogs.reduce((s, l) => s + l.sets.reduce((ss, g) => ss + g.sets.length, 0), 0)
                return (
                  <div key={date} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-800">
                        {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </p>
                      <div className="flex items-center gap-2">
                        {totalDuration > 0 && <span className="text-xs text-gray-400">{totalDuration} min</span>}
                        <span className="text-xs text-gray-400">{totalSets} sets</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{uniqueExercises.join(' · ')}</p>
                  </div>
                )
              })
            }
          </div>
        </div>
      )}

      {/* Quick-start routines */}
      {templates.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick start</p>
          <div className="flex flex-wrap gap-2">
            {templates.map(t => (
              <div key={t.id} className="bg-white rounded-xl border border-xero-green/30 px-4 py-2.5 text-sm font-medium text-xero-green">
                {t.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {logs.length === 0 && templates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">💪</p>
          <p className="text-sm font-medium text-gray-600">No workouts logged yet.</p>
          <p className="text-xs text-gray-400 mt-1">Add exercises, build a routine, and log your first session.</p>
        </div>
      )}
    </div>
  )
}

// ─── Exercises view ───────────────────────────────────────────────────────────

function ExercisesView() {
  const { exercises, isLoading, addExercise, updateExercise, deleteExercise } = useExercises()
  const [typeFilter, setTypeFilter] = useState<ExerciseType | null>(null)
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | null>(null)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [form, setForm] = useState<{ name: string; type: ExerciseType; muscle_groups: MuscleGroup[]; description: string }>({
    name: '', type: 'calisthenics', muscle_groups: [], description: '',
  })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<{ name: string; type: ExerciseType; muscle_groups: MuscleGroup[]; description: string }>({
    name: '', type: 'calisthenics', muscle_groups: [], description: '',
  })

  const filtered = exercises.filter(e =>
    (!typeFilter || e.type === typeFilter) &&
    (!muscleFilter || e.muscle_groups.includes(muscleFilter)) &&
    e.name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleAdd(ev: React.FormEvent) {
    ev.preventDefault()
    if (!form.name.trim()) return
    await addExercise({ ...form, description: form.description || undefined })
    setForm({ name: '', type: 'calisthenics', muscle_groups: [], description: '' })
    setShowAdd(false)
  }

  async function handleEditSave(ev: React.FormEvent) {
    ev.preventDefault()
    if (!editForm.name.trim() || editingId === null) return
    await updateExercise(editingId, { ...editForm, description: editForm.description || undefined })
    setEditingId(null)
  }

  function toggleMuscle(m: MuscleGroup) {
    setForm(p => ({
      ...p,
      muscle_groups: p.muscle_groups.includes(m)
        ? p.muscle_groups.filter(x => x !== m)
        : [...p.muscle_groups, m],
    }))
  }

  function toggleEditMuscle(m: MuscleGroup) {
    setEditForm(p => ({
      ...p,
      muscle_groups: p.muscle_groups.includes(m)
        ? p.muscle_groups.filter(x => x !== m)
        : [...p.muscle_groups, m],
    }))
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-36 focus:outline-none focus:ring-1 focus:ring-xero-green" />
        {EXERCISE_TYPES.map(t => (
          <button key={t.id} onClick={() => setTypeFilter(typeFilter === t.id ? null : t.id)}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${typeFilter === t.id ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {t.icon} {t.label}
          </button>
        ))}
        {MUSCLE_GROUPS.map(m => (
          <button key={m} onClick={() => setMuscleFilter(muscleFilter === m ? null : m)}
            className={`text-xs px-2.5 py-1 rounded-full capitalize transition-colors ${muscleFilter === m ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
            {m}
          </button>
        ))}
        <button onClick={() => setShowAdd(v => !v)}
          className="text-xs bg-xero-green text-white px-3 py-1.5 rounded-lg font-medium hover:bg-xero-green-dark transition-colors ml-auto">
          + Add Exercise
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-gray-50 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Exercise name *"
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 flex-1 min-w-[180px] focus:outline-none focus:ring-1 focus:ring-xero-green" />
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as ExerciseType }))}
              className="text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none">
              {EXERCISE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-1.5">Muscle groups</p>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLE_GROUPS.map(m => (
                <button key={m} type="button" onClick={() => toggleMuscle(m)}
                  className={`text-xs px-2.5 py-1 rounded-full capitalize transition-colors ${
                    form.muscle_groups.includes(m) ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'
                  }`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            placeholder="Description (optional)"
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-xero-green" />
          <div className="flex gap-2">
            <button type="submit" className="text-sm bg-xero-green text-white px-4 py-2 rounded-lg font-medium">Add</button>
            <button type="button" onClick={() => setShowAdd(false)} className="text-sm text-gray-400 hover:text-gray-600 px-2">Cancel</button>
          </div>
        </form>
      )}

      {isLoading && <p className="text-sm text-gray-400">Loading…</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(ex => {
          const typeInfo = EXERCISE_TYPES.find(t => t.id === ex.type)
          return (
            <div key={ex.id} className="bg-white rounded-xl border border-gray-100 p-4 group hover:shadow-sm transition-shadow relative">
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={() => { setEditingId(ex.id); setEditForm({ name: ex.name, type: ex.type, muscle_groups: [...ex.muscle_groups], description: ex.description ?? '' }) }}
                  className="p-1 text-gray-300 hover:text-blue-400 transition-colors rounded"
                  title="Edit"
                ><IconEdit className="w-3.5 h-3.5" strokeWidth={2} /></button>
                <button onClick={() => setConfirmId(ex.id)}
                  className="p-1 text-gray-300 hover:text-red-400 transition-colors rounded">
                  <IconClose className="w-3.5 h-3.5" strokeWidth={2} />
                </button>
              </div>
              <div className="flex items-start gap-2 mb-2">
                <span className="text-lg">{typeInfo?.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{ex.name}</p>
                  <p className="text-[10px] text-gray-400">{typeInfo?.label}</p>
                </div>
              </div>
              {ex.muscle_groups.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {ex.muscle_groups.map(m => (
                    <span key={m} className="text-[9px] bg-indigo-50 text-indigo-500 rounded-full px-1.5 py-0.5 capitalize">{m}</span>
                  ))}
                </div>
              )}
              {ex.description && <p className="text-[10px] text-gray-400 mt-1.5 line-clamp-2">{ex.description}</p>}
              {confirmId === ex.id && (
                <ConfirmDialog
                  message={`"${ex.name}" will be deleted.`}
                  confirmLabel="Delete"
                  onConfirm={() => { deleteExercise(ex.id); setConfirmId(null) }}
                  onCancel={() => setConfirmId(null)}
                />
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && !isLoading && (
        <p className="text-sm text-gray-400 text-center py-12">No exercises. Add your first one!</p>
      )}

      {/* Edit modal */}
      {editingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditingId(null)}>
          <form onSubmit={handleEditSave} className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-3" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-gray-800">Edit Exercise</p>
            <div className="flex flex-wrap gap-3">
              <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Exercise name *"
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 flex-1 min-w-[180px] focus:outline-none focus:ring-1 focus:ring-xero-green" />
              <select value={editForm.type} onChange={e => setEditForm(p => ({ ...p, type: e.target.value as ExerciseType }))}
                className="text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none">
                {EXERCISE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-1.5">Muscle groups</p>
              <div className="flex flex-wrap gap-1.5">
                {MUSCLE_GROUPS.map(m => (
                  <button key={m} type="button" onClick={() => toggleEditMuscle(m)}
                    className={`text-xs px-2.5 py-1 rounded-full capitalize transition-colors ${
                      editForm.muscle_groups.includes(m) ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <input value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Description (optional)"
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-1 focus:ring-xero-green" />
            <div className="flex gap-2 pt-1">
              <button type="submit" className="flex-1 text-sm bg-xero-green text-white py-2 rounded-lg font-medium">Save</button>
              <button type="button" onClick={() => setEditingId(null)} className="flex-1 text-sm bg-gray-100 text-gray-600 py-2 rounded-lg font-medium">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

// ─── Log workout ──────────────────────────────────────────────────────────────

function LogWorkout() {
  const month = currentMonth()
  const { templates } = useTemplates()
  const { logs, logWorkout, updateLog, deleteLog } = useWorkoutLogs(month)
  const { exercises } = useExercises()
  const [templateId, setTemplateId] = useState<number | null>(null)
  const [date, setDate] = useState(todayStr())
  const [durationMin, setDurationMin] = useState('')
  const [notes, setNotes] = useState('')
  const [sets, setSets] = useState<WorkoutSetGroup[]>([])
  const [saved, setSaved] = useState(false)
  const [editingLogId, setEditingLogId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  function loadLogForEdit(log: (typeof logs)[0]) {
    setEditingLogId(log.id)
    setDate(log.date)
    setDurationMin(log.duration_min ? String(log.duration_min) : '')
    setNotes(log.notes ?? '')
    setSets(log.sets.map(g => ({ ...g, sets: g.sets.map(s => ({ ...s })) })))
    setTemplateId(log.template_id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingLogId(null)
    setDate(todayStr())
    setDurationMin('')
    setNotes('')
    setSets([])
    setTemplateId(null)
  }

  const template = templates.find(t => t.id === templateId)

  function startFromTemplate(t: typeof template) {
    if (!t) return
    setTemplateId(t.id)
    setSets(t.exercises.map(e => ({
      exercise_name: e.name,
      sets: Array.from({ length: e.sets }, () => ({ reps: e.reps, weight_kg: null })),
    })))
  }

  function updateSet(groupIdx: number, setIdx: number, field: keyof SetEntry, value: string) {
    setSets(prev => prev.map((g, gi) => gi !== groupIdx ? g : {
      ...g,
      sets: g.sets.map((s, si) => si !== setIdx ? s : { ...s, [field]: field === 'weight_kg' ? (value === '' ? null : Number(value)) : Number(value) }),
    }))
  }

  function addExerciseGroup(ex: typeof exercises[0]) {
    setSets(prev => [...prev, { exercise_name: ex.name, sets: [{ reps: 10, weight_kg: null }] }])
  }

  function addSet(groupIdx: number) {
    setSets(prev => prev.map((g, gi) => gi !== groupIdx ? g : {
      ...g,
      sets: [...g.sets, { reps: g.sets[g.sets.length - 1]?.reps ?? 10, weight_kg: g.sets[g.sets.length - 1]?.weight_kg ?? null }],
    }))
  }

  function removeSet(groupIdx: number, setIdx: number) {
    setSets(prev => prev.map((g, gi) => gi !== groupIdx ? g : {
      ...g,
      sets: g.sets.filter((_, si) => si !== setIdx),
    }))
  }

  async function handleSave() {
    const payload = {
      template_id: templateId ?? undefined,
      date,
      sets,
      notes: notes.trim() || undefined,
      duration_min: durationMin ? Number(durationMin) : undefined,
    }
    if (editingLogId !== null) {
      await updateLog(editingLogId, payload)
      cancelEdit()
    } else {
      await logWorkout(payload)
      setSets([])
      setNotes('')
      setDurationMin('')
      setTemplateId(null)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">
      {/* Header controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none" />
        <input type="number" value={durationMin} onChange={e => setDurationMin(e.target.value)}
          placeholder="Duration (min)" min={1}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-36 focus:outline-none" />
      </div>

      {/* Pick template */}
      {templates.length > 0 && sets.length === 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Start from routine</p>
          <div className="flex flex-wrap gap-2">
            {templates.map(t => (
              <button key={t.id} onClick={() => startFromTemplate(t)}
                className="text-xs bg-white border border-xero-green/30 text-xero-green px-3 py-1.5 rounded-lg font-medium hover:bg-xero-green/5 transition-colors">
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Exercise sets */}
      {sets.map((group, gi) => (
        <div key={gi} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <p className="text-sm font-semibold text-gray-800">{group.exercise_name}</p>
            <button onClick={() => setSets(p => p.filter((_, i) => i !== gi))}
              className="p-1 text-gray-300 hover:text-red-400 transition-colors rounded"><IconClose className="w-3.5 h-3.5" strokeWidth={2} /></button>
          </div>
          <div className="p-4 space-y-2">
            <div className="grid grid-cols-[2rem_1fr_1fr_1.5rem] gap-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              <span>Set</span><span>Reps</span><span>Weight (kg)</span><span />
            </div>
            {group.sets.map((s, si) => (
              <div key={si} className="grid grid-cols-[2rem_1fr_1fr_1.5rem] gap-2 items-center">
                <span className="text-xs text-gray-400">#{si + 1}</span>
                <input type="number" value={s.reps} onChange={e => updateSet(gi, si, 'reps', e.target.value)} min={1}
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:ring-1 focus:ring-xero-green" />
                <input type="number" value={s.weight_kg ?? ''} onChange={e => updateSet(gi, si, 'weight_kg', e.target.value)} placeholder="—"
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-center focus:outline-none focus:ring-1 focus:ring-xero-green" />
                <button onClick={() => removeSet(gi, si)}
                  className="p-1 text-gray-300 hover:text-red-400 transition-colors rounded justify-self-center"><IconClose className="w-3.5 h-3.5" strokeWidth={2} /></button>
              </div>
            ))}
            <button onClick={() => addSet(gi)} className="text-xs text-xero-green hover:underline mt-1">+ Add set</button>
          </div>
        </div>
      ))}

      {/* Add exercise */}
      {exercises.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Add exercise</p>
          <div className="flex flex-wrap gap-2">
            {exercises.slice(0, 12).map(ex => (
              <button key={ex.id} onClick={() => addExerciseGroup(ex)}
                className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                {ex.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <textarea value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="Notes (optional)…"
        rows={2}
        className="w-full text-sm border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-xero-green resize-none" />

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={sets.length === 0}
          className="text-sm bg-xero-green text-white px-6 py-2.5 rounded-xl font-medium hover:bg-xero-green-dark transition-colors disabled:opacity-40">
          {editingLogId !== null ? 'Update workout' : 'Save workout'}
        </button>
        {editingLogId !== null && (
          <button onClick={cancelEdit} className="text-sm text-gray-400 hover:text-gray-600 px-2">
            Cancel edit
          </button>
        )}
        {saved && <span className="text-sm text-xero-green font-medium">Saved!</span>}
      </div>

      {/* History — grouped by date */}
      {logs.length > 0 && (
        <div className="border-t border-gray-100 pt-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">This month</p>
          <div className="space-y-4">
            {Object.entries(
              logs.reduce<Record<string, typeof logs>>((acc, log) => {
                const d = log.date.slice(0, 10)
                ;(acc[d] ??= []).push(log)
                return acc
              }, {})
            )
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([date, dayLogs]) => (
                <div key={date}>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5 pl-1">
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                  </p>
                  <div className="space-y-2">
                    {dayLogs.map(log => (
                      <div key={log.id} className={`bg-white rounded-xl border px-4 py-3 group relative ${editingLogId === log.id ? 'border-xero-green/50 ring-1 ring-xero-green/30' : 'border-gray-100'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-gray-800">
                            {log.sets.map(g => g.exercise_name).slice(0, 2).join(', ')}
                            {log.sets.length > 2 && ` +${log.sets.length - 2}`}
                            {editingLogId === log.id && <span className="ml-2 text-[10px] text-xero-green font-medium">editing</span>}
                          </p>
                          <div className="flex items-center gap-2">
                            {log.duration_min && <span className="text-xs text-gray-400">{log.duration_min} min</span>}
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={() => loadLogForEdit(log)} className="p-1 text-gray-300 hover:text-blue-400 transition-colors rounded" title="Edit"><IconEdit  className="w-3.5 h-3.5" strokeWidth={2} /></button>
                              <button onClick={() => setConfirmDeleteId(log.id)} className="p-1 text-gray-300 hover:text-red-400 transition-colors rounded" title="Delete"><IconClose className="w-3.5 h-3.5" strokeWidth={2} /></button>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400">{log.sets.map(g => `${g.exercise_name} ×${g.sets.length}`).join(' · ')}</p>
                        {confirmDeleteId === log.id && (
                          <ConfirmDialog
                            message="This workout log will be deleted."
                            confirmLabel="Delete"
                            onConfirm={() => { deleteLog(log.id); setConfirmDeleteId(null); if (editingLogId === log.id) cancelEdit() }}
                            onCancel={() => setConfirmDeleteId(null)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Targets view ─────────────────────────────────────────────────────────────

function TargetsView() {
  const { targets, isLoading, addTarget, updateTarget, deleteTarget } = useFitnessTargets()
  const [showAdd, setShowAdd] = useState(false)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', unit: 'reps', target_value: '' })
  const [editing, setEditing] = useState<{ id: number; value: string } | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.target_value) return
    await addTarget({ name: form.name, unit: form.unit, target_value: Number(form.target_value) })
    setForm({ name: '', unit: 'reps', target_value: '' })
    setShowAdd(false)
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(v => !v)}
          className="text-xs bg-xero-green text-white px-3 py-1.5 rounded-lg font-medium hover:bg-xero-green-dark transition-colors">
          + Add Target
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-gray-50 rounded-xl p-4 flex flex-wrap gap-3 items-end">
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="Target name *"
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 flex-1 min-w-[160px] focus:outline-none focus:ring-1 focus:ring-xero-green" />
          <input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
            placeholder="Unit (reps, kg, min…)"
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-32 focus:outline-none focus:ring-1 focus:ring-xero-green" />
          <input type="number" value={form.target_value} onChange={e => setForm(p => ({ ...p, target_value: e.target.value }))}
            placeholder="Goal *" min={0}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-24 focus:outline-none focus:ring-1 focus:ring-xero-green" />
          <button type="submit" className="text-sm bg-xero-green text-white px-4 py-2 rounded-lg font-medium">Add</button>
          <button type="button" onClick={() => setShowAdd(false)} className="text-sm text-gray-400 hover:text-gray-600 px-1">Cancel</button>
        </form>
      )}

      {isLoading && <p className="text-sm text-gray-400">Loading…</p>}

      <div className="space-y-3">
        {targets.map(target => {
          const pct = Math.min(100, Math.round((Number(target.current_value) / Number(target.target_value)) * 100))
          return (
            <div key={target.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-800">{target.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">
                    {editing?.id === target.id ? (
                      <input
                        type="number"
                        value={editing.value}
                        onChange={e => setEditing(p => p && ({ ...p, value: e.target.value }))}
                        onBlur={() => { if (editing) { updateTarget(target.id, Number(editing.value)); setEditing(null) } }}
                        onKeyDown={e => { if (e.key === 'Enter') { updateTarget(target.id, Number(editing!.value)); setEditing(null) } }}
                        className="w-16 text-center border border-xero-green rounded px-1 py-0.5 text-sm focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <button onClick={() => setEditing({ id: target.id, value: String(target.current_value) })}
                        className="hover:text-xero-green transition-colors" title="Click to update">
                        {target.current_value}
                      </button>
                    )}
                    <span className="text-gray-400 font-normal"> / {target.target_value} {target.unit}</span>
                  </span>
                  <span className="text-xs font-bold text-xero-green">{pct}%</span>
                  <button onClick={() => setConfirmId(target.id)} className="p-1 text-gray-300 hover:text-red-400 transition-colors rounded"><IconClose className="w-3.5 h-3.5" strokeWidth={2} /></button>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-xero-green rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              {confirmId === target.id && (
                <ConfirmDialog
                  message={`"${target.name}" target will be deleted.`}
                  confirmLabel="Delete"
                  onConfirm={() => { deleteTarget(target.id); setConfirmId(null) }}
                  onCancel={() => setConfirmId(null)}
                />
              )}
            </div>
          )
        })}
      </div>

      {targets.length === 0 && !isLoading && (
        <p className="text-sm text-gray-400 text-center py-12">No targets yet. Set your first fitness goal!</p>
      )}
    </div>
  )
}

// ─── Weight tracker ───────────────────────────────────────────────────────────

function WeightView() {
  const { entries, isLoading, addEntry, deleteEntry } = useBodyWeight()
  const { dark } = useDarkMode()
  const today = todayStr()
  const [date, setDate] = useState(today)
  const [weight, setWeight] = useState('')
  const [note, setNote] = useState('')
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const kg = parseFloat(weight)
    if (!date || isNaN(kg) || kg <= 0) return
    await addEntry(date, kg, note.trim() || undefined)
    setWeight('')
    setNote('')
    setDate(today)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const chartData = useMemo(() => entries.map(e => ({
    date:  new Date(e.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    dateRaw: e.date,
    kg:    Number(e.weight_kg),
  })), [entries])

  const latest   = entries.at(-1)
  const prev     = entries.at(-2)
  const diff     = latest && prev ? Number(latest.weight_kg) - Number(prev.weight_kg) : null
  const minKg    = entries.length ? Math.min(...entries.map(e => Number(e.weight_kg))) - 1 : 50
  const maxKg    = entries.length ? Math.max(...entries.map(e => Number(e.weight_kg))) + 1 : 100

  const axisColor  = dark ? '#64748B' : '#94A3B8'
  const gridColor  = dark ? '#1E293B' : '#F1F5F9'
  const tooltipBg  = dark ? '#1E293B' : '#ffffff'
  const tooltipClr = dark ? '#F1F5F9' : '#111827'

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">

      {/* Stats row */}
      {latest && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{Number(latest.weight_kg).toFixed(1)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">kg · latest</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 text-center">
            <p className={`text-2xl font-bold ${diff === null ? 'text-gray-400' : diff > 0 ? 'text-red-500' : diff < 0 ? 'text-xero-green' : 'text-gray-400'}`}>
              {diff === null ? '—' : `${diff > 0 ? '+' : ''}${diff.toFixed(1)}`}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">kg change</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{entries.length}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">entries</p>
          </div>
        </div>
      )}

      {/* Chart */}
      {entries.length >= 2 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-4">Weight over time</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false} />
              <YAxis domain={[minKg, maxKg]} tick={{ fontSize: 10, fill: axisColor }} tickLine={false} axisLine={false}
                tickFormatter={v => `${v}kg`} />
              <Tooltip
                contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${dark ? '#334155' : '#E8EBF0'}`, borderRadius: 10, color: tooltipClr, fontSize: 12 }}
                itemStyle={{ color: tooltipClr }}
                formatter={(v: number) => [`${v.toFixed(1)} kg`, 'Weight']}
              />
              {latest && (
                <ReferenceLine y={Number(latest.weight_kg)} stroke="#00B08744" strokeDasharray="4 4" />
              )}
              <Line type="monotone" dataKey="kg" stroke="#00B087" strokeWidth={2.5}
                dot={{ r: 3, fill: '#00B087', strokeWidth: 0 }}
                activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Add entry form */}
      <form onSubmit={handleAdd} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Log weight</p>
        <div className="flex flex-wrap gap-3">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-xero-green bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100" />
          <div className="flex items-center gap-1.5 border border-gray-200 dark:border-slate-600 rounded-xl px-3 focus-within:ring-1 focus-within:ring-xero-green bg-white dark:bg-slate-700">
            <input type="number" value={weight} onChange={e => setWeight(e.target.value)}
              placeholder="0.0" step="0.1" min="20" max="300"
              className="text-sm py-2 w-20 focus:outline-none bg-transparent text-gray-900 dark:text-slate-100" />
            <span className="text-sm text-gray-400">kg</span>
          </div>
          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 flex-1 min-w-[140px] focus:outline-none focus:ring-1 focus:ring-xero-green bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100" />
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={!weight || !date}
            className="text-sm bg-xero-green text-white px-5 py-2 rounded-xl font-medium hover:bg-xero-green-dark transition-colors disabled:opacity-40">
            Save
          </button>
          {saved && <span className="text-sm text-xero-green font-medium">Saved!</span>}
        </div>
      </form>

      {/* History list */}
      {isLoading && <p className="text-sm text-gray-400">Loading…</p>}
      {entries.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">History</p>
          <div className="space-y-2">
            {[...entries].reverse().map(e => (
              <div key={e.id} className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 px-4 py-3 group">
                <p className="text-sm text-gray-500 dark:text-slate-400 w-24 flex-shrink-0">
                  {new Date(e.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
                <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{Number(e.weight_kg).toFixed(1)} kg</p>
                {e.note && <p className="text-xs text-gray-400 dark:text-slate-500 flex-1 truncate">{e.note}</p>}
                <button onClick={() => setConfirmId(e.id)}
                  className="p-1 text-gray-300 dark:text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 ml-auto flex-shrink-0 rounded"><IconClose className="w-3.5 h-3.5" strokeWidth={2} /></button>
                {confirmId === e.id && (
                  <ConfirmDialog
                    message={`Delete entry for ${e.date}?`}
                    confirmLabel="Delete"
                    onConfirm={() => { deleteEntry(e.id); setConfirmId(null) }}
                    onCancel={() => setConfirmId(null)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {entries.length === 0 && !isLoading && (
        <p className="text-sm text-gray-400 text-center py-12">No weight entries yet. Log your first measurement!</p>
      )}
    </div>
  )
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

type View = 'dashboard' | 'exercises' | 'log' | 'targets' | 'challenges' | 'weight'

export function SportTab({ onMenuClick }: { onMenuClick?: () => void }) {
  const { t } = useLanguage()
  const [view, setView] = useState<View>('dashboard')
  const VIEWS: { id: View; label: string }[] = [
    { id: 'dashboard',  label: t.sportDashboard },
    { id: 'exercises',  label: t.exercises },
    { id: 'log',        label: t.logWorkout },
    { id: 'targets',    label: t.targets },
    { id: 'challenges', label: '🏆 Challenges' },
    { id: 'weight',     label: '⚖️ Weight' },
  ]

  return (
    <div className="flex flex-col h-full bg-xero-bg overflow-hidden">
      <header className="flex items-center gap-1 px-3 py-2.5 bg-white border-b border-xero-border flex-shrink-0 overflow-hidden">
        {onMenuClick && (
          <button onClick={onMenuClick} className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        )}
        <span className="text-sm font-semibold text-gray-800 flex-shrink-0 mr-1">{t.sport}</span>
        <div className="flex overflow-x-auto gap-1 flex-1" style={{ scrollbarWidth: 'none' }}>
          {VIEWS.map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                view === v.id ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </header>
      <div className="flex-1 overflow-y-auto">
        {view === 'dashboard'  && <Dashboard />}
        {view === 'exercises'  && <ExercisesView />}
        {view === 'log'        && <LogWorkout />}
        {view === 'targets'    && <TargetsView />}
        {view === 'challenges' && <ChallengesView scope="sport" />}
        {view === 'weight'     && <WeightView />}
      </div>
    </div>
  )
}
