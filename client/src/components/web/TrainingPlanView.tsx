import { useState } from 'react'
import { useTrainingSchedule } from '../../hooks/useTrainingSchedule'
import type { TrainingScheduleEntry } from '../../hooks/useTrainingSchedule'
import { useExercises } from '../../hooks/useSport'
import type { Exercise, ExerciseType } from '../../hooks/useSport'

const DAYS      = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const TYPE_ICON: Record<ExerciseType, string> = {
  weights:      '🏋️',
  calisthenics: '🤸',
  cardio:       '🏃',
  flexibility:  '🧘',
}

const TYPE_LABEL: Record<ExerciseType, string> = {
  weights:      'Weights',
  calisthenics: 'Calisthenics',
  cardio:       'Cardio',
  flexibility:  'Flexibility',
}

const TYPE_ORDER: ExerciseType[] = ['weights', 'calisthenics', 'cardio', 'flexibility']

interface FormState {
  exercise_id:  string   // '' = none
  duration_min: string
  sets_count:   string
  reps:         string
  weight_kg:    string
  notes:        string
}

const EMPTY_FORM: FormState = { exercise_id: '', duration_min: '', sets_count: '', reps: '', weight_kg: '', notes: '' }

export function TrainingPlanView() {
  const { byDay, addEntry, updateEntry, deleteEntry } = useTrainingSchedule()
  const { exercises }                                  = useExercises()

  const [addingFor, setAddingFor] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm]           = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)

  function openAdd(dow: number) {
    setEditingId(null); setAddingFor(dow); setForm(EMPTY_FORM)
  }

  function openEdit(e: TrainingScheduleEntry) {
    setAddingFor(null); setEditingId(e.id)
    setForm({
      exercise_id:  e.exercise_id != null ? String(e.exercise_id) : '',
      duration_min: e.duration_min != null ? String(e.duration_min) : '',
      sets_count:   e.sets_count != null ? String(e.sets_count) : '',
      reps:         e.reps != null ? String(e.reps) : '',
      weight_kg:    e.weight_kg != null ? String(e.weight_kg) : '',
      notes:        e.notes ?? '',
    })
  }

  function cancelForm() { setAddingFor(null); setEditingId(null); setForm(EMPTY_FORM) }
  function field(key: keyof FormState, val: string) { setForm(f => ({ ...f, [key]: val })) }

  function exerciseName(id: string) {
    return exercises.find(e => e.id === Number(id))?.name ?? ''
  }

  async function submitAdd() {
    if (!form.exercise_id || addingFor === null) return
    setSaving(true)
    await addEntry({
      day_of_week:  addingFor,
      name:         exerciseName(form.exercise_id),
      exercise_id:  Number(form.exercise_id),
      duration_min: form.duration_min ? Number(form.duration_min) : null,
      sets_count:   form.sets_count ? Number(form.sets_count) : null,
      reps:         form.reps ? Number(form.reps) : null,
      weight_kg:    form.weight_kg ? Number(form.weight_kg) : null,
      notes:        form.notes.trim() || null,
    })
    setSaving(false)
    setForm(EMPTY_FORM)
  }

  async function submitEdit() {
    if (!form.exercise_id || editingId === null) return
    setSaving(true)
    await updateEntry(editingId, {
      name:         exerciseName(form.exercise_id),
      exercise_id:  Number(form.exercise_id),
      duration_min: form.duration_min ? Number(form.duration_min) : null,
      sets_count:   form.sets_count ? Number(form.sets_count) : null,
      reps:         form.reps ? Number(form.reps) : null,
      weight_kg:    form.weight_kg ? Number(form.weight_kg) : null,
      notes:        form.notes.trim() || null,
    })
    setSaving(false)
    cancelForm()
  }

  async function handleDelete(id: number) {
    await deleteEntry(id)
    if (editingId === id) cancelForm()
  }

  const hasAny = Object.keys(byDay).length > 0

  const exerciseById = Object.fromEntries(exercises.map(e => [e.id, e]))

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-2">
      {/* Week summary strip */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {DAYS_SHORT.map((d, i) => {
          const count = (byDay[i] ?? []).length
          return (
            <div
              key={d}
              onClick={() => openAdd(i)}
              className={`rounded-xl py-2 text-center cursor-pointer transition-colors select-none ${
                count > 0
                  ? 'bg-xero-green/10 border border-xero-green/30'
                  : 'bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 hover:border-xero-green/30'
              }`}
            >
              <p className="text-[10px] font-semibold text-gray-500 dark:text-slate-400">{d}</p>
              {count > 0
                ? <p className="text-sm font-bold text-xero-green">{count}</p>
                : <p className="text-base text-gray-300 dark:text-slate-600 leading-none mt-0.5">+</p>
              }
            </div>
          )
        })}
      </div>

      {exercises.length === 0 && (
        <div className="text-center py-8 text-gray-400 bg-amber-50/60 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20 px-4">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">No exercises in library</p>
          <p className="text-xs text-amber-600/70 dark:text-amber-500/70 mt-1">Add exercises in the <strong>Exercises</strong> tab first, then plan them here.</p>
        </div>
      )}

      {!hasAny && addingFor === null && exercises.length > 0 && (
        <div className="text-center py-10 text-gray-400">
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400">No training planned yet</p>
          <p className="text-xs text-gray-400 mt-1">Click a day above to add exercises</p>
        </div>
      )}

      {/* Day sections */}
      {DAYS.map((dayName, dow) => {
        const sessions     = byDay[dow] ?? []
        const isAddingHere = addingFor === dow
        const hasEditHere  = sessions.some(s => s.id === editingId)

        if (sessions.length === 0 && !isAddingHere) return (
          <div key={dow} className="flex items-center gap-3 py-1.5">
            <span className="text-xs font-semibold text-gray-300 dark:text-slate-600 w-10 flex-shrink-0">{DAYS_SHORT[dow]}</span>
            <span className="flex-1 h-px bg-gray-100 dark:bg-slate-800" />
            <button onClick={() => openAdd(dow)} className="text-xs text-gray-400 hover:text-xero-green transition-colors flex-shrink-0">
              + Add
            </button>
          </div>
        )

        return (
          <div key={dow} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-700 dark:text-slate-300">{dayName}</span>
              <span className="flex-1 h-px bg-gray-100 dark:bg-slate-800" />
              {!isAddingHere && !hasEditHere && (
                <button onClick={() => openAdd(dow)} className="text-xs text-gray-400 hover:text-xero-green transition-colors flex-shrink-0">
                  + Add
                </button>
              )}
            </div>

            {sessions.map(s =>
              s.id === editingId ? (
                <EntryForm
                  key={s.id}
                  form={form}
                  exercises={exercises}
                  saving={saving}
                  onChange={field}
                  onSubmit={submitEdit}
                  onCancel={cancelForm}
                  onDelete={() => handleDelete(s.id)}
                  isEdit
                />
              ) : (
                <SessionCard
                  key={s.id}
                  entry={s}
                  exercise={s.exercise_id != null ? exerciseById[s.exercise_id] : undefined}
                  onEdit={() => openEdit(s)}
                  onDelete={() => handleDelete(s.id)}
                  dimmed={editingId !== null}
                />
              )
            )}

            {isAddingHere && (
              <EntryForm
                form={form}
                exercises={exercises}
                saving={saving}
                onChange={field}
                onSubmit={submitAdd}
                onCancel={cancelForm}
                isEdit={false}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Session card ─────────────────────────────────────────────────────────────

function SessionCard({
  entry, exercise, onEdit, onDelete, dimmed,
}: {
  entry:    TrainingScheduleEntry
  exercise: Exercise | undefined
  onEdit:   () => void
  onDelete: () => void
  dimmed:   boolean
}) {
  const icon  = exercise ? TYPE_ICON[exercise.type]  : '🏋️'
  const label = exercise ? TYPE_LABEL[exercise.type] : null

  return (
    <div className={`bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl px-4 py-3 flex items-start gap-3 transition-opacity ${dimmed ? 'opacity-40 pointer-events-none' : ''}`}>
      <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-100 truncate">{entry.name}</p>
        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
          {label && (
            <span className="text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-medium">{label}</span>
          )}
          {exercise?.muscle_groups.map(mg => (
            <span key={mg} className="text-[10px] bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full capitalize">{mg}</span>
          ))}
          {entry.sets_count && entry.reps && (
            <span className="text-[11px] font-medium text-gray-500 dark:text-slate-400">
              {entry.sets_count} × {entry.reps} reps
            </span>
          )}
          {!entry.sets_count && entry.reps && (
            <span className="text-[11px] text-gray-400 dark:text-slate-500">{entry.reps} reps</span>
          )}
          {entry.weight_kg && (
            <span className="text-[11px] text-gray-400 dark:text-slate-500">{entry.weight_kg} kg</span>
          )}
          {entry.duration_min && (
            <span className="text-[11px] text-gray-400 dark:text-slate-500">{entry.duration_min} min</span>
          )}
          {entry.notes && (
            <span className="text-[11px] text-gray-400 dark:text-slate-500 truncate max-w-[160px]">{entry.notes}</span>
          )}
        </div>
      </div>
      <div className="flex gap-1 flex-shrink-0">
        <button onClick={onEdit}   className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 px-1.5 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Edit</button>
        <button onClick={onDelete} className="text-xs text-gray-400 hover:text-red-500 px-1.5 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">✕</button>
      </div>
    </div>
  )
}

// ─── Entry form ───────────────────────────────────────────────────────────────

function EntryForm({
  form, exercises, saving, onChange, onSubmit, onCancel, onDelete, isEdit,
}: {
  form:      FormState
  exercises: Exercise[]
  saving:    boolean
  onChange:  (key: keyof FormState, val: string) => void
  onSubmit:  () => void
  onCancel:  () => void
  onDelete?: () => void
  isEdit:    boolean
}) {
  const grouped = TYPE_ORDER.reduce<Record<ExerciseType, Exercise[]>>((acc, type) => {
    acc[type] = exercises.filter(e => e.type === type)
    return acc
  }, { weights: [], calisthenics: [], cardio: [], flexibility: [] })

  const canSubmit = !!form.exercise_id && !saving

  const inputCls = 'text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-xero-green bg-transparent text-gray-800 dark:text-slate-100 placeholder-gray-300 dark:placeholder-slate-600'

  return (
    <div className="bg-white dark:bg-slate-800 border border-xero-green/30 rounded-xl px-4 py-3 space-y-2.5">
      {/* Exercise picker */}
      <select
        autoFocus
        value={form.exercise_id}
        onChange={e => onChange('exercise_id', e.target.value)}
        className={`w-full ${inputCls} bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200`}
      >
        <option value="">Select exercise…</option>
        {TYPE_ORDER.map(type => {
          const group = grouped[type]
          if (group.length === 0) return null
          return (
            <optgroup key={type} label={`${TYPE_ICON[type]} ${TYPE_LABEL[type]}`}>
              {group.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </optgroup>
          )
        })}
      </select>

      {/* Sets / Reps / Weight / Duration */}
      <div className="grid grid-cols-4 gap-2">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Sets</p>
          <input type="number" value={form.sets_count} onChange={e => onChange('sets_count', e.target.value)}
            placeholder="—" min={1} className={`w-full ${inputCls}`} />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Reps</p>
          <input type="number" value={form.reps} onChange={e => onChange('reps', e.target.value)}
            placeholder="—" min={1} className={`w-full ${inputCls}`} />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Weight (kg)</p>
          <input type="number" value={form.weight_kg} onChange={e => onChange('weight_kg', e.target.value)}
            placeholder="—" min={0} step={0.5} className={`w-full ${inputCls}`} />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Duration (min)</p>
          <input type="number" value={form.duration_min} onChange={e => onChange('duration_min', e.target.value)}
            placeholder="—" min={1} className={`w-full ${inputCls}`} />
        </div>
      </div>

      <input
        value={form.notes}
        onChange={e => onChange('notes', e.target.value)}
        placeholder="Notes (optional)"
        className={`w-full ${inputCls}`}
      />

      <div className="flex items-center gap-2">
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="text-sm px-3 py-1.5 bg-xero-green text-white rounded-xl font-medium hover:bg-xero-green/90 disabled:opacity-40 transition-colors"
        >
          {saving ? 'Saving…' : isEdit ? 'Save' : 'Add exercise'}
        </button>
        <button onClick={onCancel} className="text-sm px-3 py-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
          Done
        </button>
        {isEdit && onDelete && (
          <button onClick={onDelete} className="text-sm px-3 py-1.5 text-red-400 hover:text-red-600 transition-colors ml-auto">
            Remove
          </button>
        )}
      </div>
    </div>
  )
}
