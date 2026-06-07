import { useState } from 'react'
import { useTrainingSchedule } from '../../hooks/useTrainingSchedule'
import { useTemplates } from '../../hooks/useSport'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface FormState {
  name:         string
  template_id:  string   // '' = none
  duration_min: string
  notes:        string
}

const EMPTY_FORM: FormState = { name: '', template_id: '', duration_min: '', notes: '' }

export function TrainingPlanView() {
  const { byDay, addEntry, updateEntry, deleteEntry } = useTrainingSchedule()
  const { templates } = useTemplates()

  const [addingFor, setAddingFor]   = useState<number | null>(null)
  const [editingId, setEditingId]   = useState<number | null>(null)
  const [form, setForm]             = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)

  function openAdd(dow: number) {
    setEditingId(null)
    setAddingFor(dow)
    setForm(EMPTY_FORM)
  }

  function openEdit(e: { id: number; day_of_week: number; name: string; template_id: number | null; duration_min: number | null; notes: string | null }) {
    setAddingFor(null)
    setEditingId(e.id)
    setForm({
      name:         e.name,
      template_id:  e.template_id != null ? String(e.template_id) : '',
      duration_min: e.duration_min != null ? String(e.duration_min) : '',
      notes:        e.notes ?? '',
    })
  }

  function cancelForm() { setAddingFor(null); setEditingId(null); setForm(EMPTY_FORM) }

  function field(key: keyof FormState, value: string) { setForm(f => ({ ...f, [key]: value })) }

  async function submitAdd() {
    if (!form.name.trim() || addingFor === null) return
    setSaving(true)
    await addEntry({
      day_of_week:  addingFor,
      name:         form.name.trim(),
      template_id:  form.template_id ? Number(form.template_id) : null,
      duration_min: form.duration_min ? Number(form.duration_min) : null,
      notes:        form.notes.trim() || null,
    })
    setSaving(false)
    cancelForm()
  }

  async function submitEdit() {
    if (!form.name.trim() || editingId === null) return
    setSaving(true)
    await updateEntry(editingId, {
      name:         form.name.trim(),
      template_id:  form.template_id ? Number(form.template_id) : null,
      duration_min: form.duration_min ? Number(form.duration_min) : null,
      notes:        form.notes.trim() || null,
    })
    setSaving(false)
    cancelForm()
  }

  async function handleDelete(id: number) {
    await deleteEntry(id)
    if (editingId === id) cancelForm()
  }

  const hasAnySession = Object.keys(byDay).length > 0

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-2">
      {/* Week summary strip */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {DAYS_SHORT.map((d, i) => {
          const count = (byDay[i] ?? []).length
          return (
            <div
              key={d}
              className={`rounded-xl py-2 text-center cursor-pointer transition-colors ${
                count > 0
                  ? 'bg-xero-green/10 border border-xero-green/30'
                  : 'bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700'
              }`}
              onClick={() => openAdd(i)}
            >
              <p className="text-[10px] font-semibold text-gray-500 dark:text-slate-400">{d}</p>
              {count > 0
                ? <p className="text-sm font-bold text-xero-green">{count}</p>
                : <p className="text-sm text-gray-300 dark:text-slate-600">+</p>
              }
            </div>
          )
        })}
      </div>

      {!hasAnySession && addingFor === null && (
        <div className="text-center py-10 text-gray-400">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400">No training sessions planned</p>
          <p className="text-xs text-gray-400 mt-1">Click a day above or "+ Add" below to schedule training</p>
        </div>
      )}

      {/* Day sections */}
      {DAYS.map((dayName, dow) => {
        const sessions = byDay[dow] ?? []
        const isAddingHere  = addingFor === dow
        const hasEditHere   = sessions.some(s => s.id === editingId)

        if (sessions.length === 0 && !isAddingHere) return (
          <div key={dow} className="flex items-center gap-3 py-1.5">
            <span className="text-xs font-semibold text-gray-300 dark:text-slate-600 w-10 flex-shrink-0">{DAYS_SHORT[dow]}</span>
            <span className="flex-1 h-px bg-gray-100 dark:bg-slate-800" />
            <button onClick={() => openAdd(dow)} className="text-xs text-gray-400 hover:text-xero-green transition-colors flex items-center gap-0.5 flex-shrink-0">
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
                <button onClick={() => openAdd(dow)} className="text-xs text-gray-400 hover:text-xero-green transition-colors flex-shrink-0">+ Add</button>
              )}
            </div>

            {sessions.map(s => (
              s.id === editingId ? (
                <EntryForm
                  key={s.id}
                  form={form}
                  templates={templates}
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
                  templateName={templates.find(t => t.id === s.template_id)?.name}
                  onEdit={() => openEdit(s)}
                  onDelete={() => handleDelete(s.id)}
                  dimmed={editingId !== null || isAddingHere}
                />
              )
            ))}

            {isAddingHere && (
              <EntryForm
                form={form}
                templates={templates}
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
  entry, templateName, onEdit, onDelete, dimmed,
}: {
  entry: { name: string; duration_min: number | null; notes: string | null }
  templateName?: string
  onEdit: () => void
  onDelete: () => void
  dimmed: boolean
}) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl px-4 py-3 flex items-start gap-3 transition-opacity ${dimmed ? 'opacity-40' : ''}`}
    >
      <span className="text-xl flex-shrink-0 mt-0.5">🏋️</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-100 truncate">{entry.name}</p>
        <div className="flex flex-wrap gap-2 mt-0.5">
          {entry.duration_min && (
            <span className="text-[11px] text-gray-400 dark:text-slate-500">{entry.duration_min} min</span>
          )}
          {templateName && (
            <span className="text-[11px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
              {templateName}
            </span>
          )}
          {entry.notes && (
            <span className="text-[11px] text-gray-400 dark:text-slate-500 truncate max-w-[200px]">{entry.notes}</span>
          )}
        </div>
      </div>
      {!dimmed && (
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={onEdit} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 px-1.5 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Edit</button>
          <button onClick={onDelete} className="text-xs text-gray-400 hover:text-red-500 px-1.5 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">✕</button>
        </div>
      )}
    </div>
  )
}

// ─── Entry form ───────────────────────────────────────────────────────────────

function EntryForm({
  form, templates, saving, onChange, onSubmit, onCancel, onDelete, isEdit,
}: {
  form: FormState
  templates: { id: number; name: string }[]
  saving: boolean
  onChange: (key: keyof FormState, value: string) => void
  onSubmit: () => void
  onCancel: () => void
  onDelete?: () => void
  isEdit: boolean
}) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-xero-green/30 rounded-xl px-4 py-3 space-y-3">
      <div className="flex gap-2">
        <input
          autoFocus
          value={form.name}
          onChange={e => onChange('name', e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSubmit() }}
          placeholder="Session name (e.g. Leg Day, Morning Run)"
          className="flex-1 text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-xero-green bg-transparent text-gray-800 dark:text-slate-100 placeholder-gray-300 dark:placeholder-slate-600"
        />
        <input
          type="number"
          value={form.duration_min}
          onChange={e => onChange('duration_min', e.target.value)}
          placeholder="min"
          min={1}
          className="w-20 text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-xero-green bg-transparent text-gray-800 dark:text-slate-100 placeholder-gray-300 dark:placeholder-slate-600"
        />
      </div>

      {templates.length > 0 && (
        <select
          value={form.template_id}
          onChange={e => onChange('template_id', e.target.value)}
          className="w-full text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-xero-green bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200"
        >
          <option value="">No template</option>
          {templates.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      )}

      <input
        value={form.notes}
        onChange={e => onChange('notes', e.target.value)}
        placeholder="Notes (optional)"
        className="w-full text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-xero-green bg-transparent text-gray-800 dark:text-slate-100 placeholder-gray-300 dark:placeholder-slate-600"
      />

      <div className="flex items-center gap-2">
        <button
          onClick={onSubmit}
          disabled={!form.name.trim() || saving}
          className="text-sm px-3 py-1.5 bg-xero-green text-white rounded-xl font-medium hover:bg-xero-green/90 disabled:opacity-40 transition-colors"
        >
          {saving ? 'Saving…' : isEdit ? 'Save' : 'Add'}
        </button>
        <button onClick={onCancel} className="text-sm px-3 py-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">Cancel</button>
        {isEdit && onDelete && (
          <button onClick={onDelete} className="text-sm px-3 py-1.5 text-red-400 hover:text-red-600 transition-colors ml-auto">Delete</button>
        )}
      </div>
    </div>
  )
}
