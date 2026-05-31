import { useState } from 'react'
import { useChallenges } from '../../hooks/useChallenges'
import type { Challenge, Checkpoint, ChallengeScope, RepeatCycle } from '../../hooks/useChallenges'
import { ConfirmDialog } from './ConfirmDialog'
import { IconTrophy as Trophy, IconFlag as Flag, IconAdd as Plus, IconChevronDown as ChevronDown, IconChevronUp as ChevronUp, IconCheck as Check, IconDelete as Trash2, IconEdit as Pencil, IconClose as X } from '../../lib/icons'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isPast(dateStr: string) {
  return dateStr < new Date().toISOString().slice(0, 10)
}

function newCpId() {
  return `cp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

const REPEAT_LABELS: Record<RepeatCycle, string> = {
  none: 'No repeat', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly',
}

// ─── Checkpoint item ──────────────────────────────────────────────────────────

function CheckpointItem({
  cp, onToggle, onRemove, overdue,
}: { cp: Checkpoint; onToggle: () => void; onRemove: () => void; overdue: boolean }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
      cp.completed
        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40'
        : overdue
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40'
        : 'bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-slate-700'
    }`}>
      <button
        onClick={onToggle}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          cp.completed
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-gray-300 dark:border-slate-500 hover:border-emerald-400'
        }`}
      >
        {cp.completed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${cp.completed ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-800 dark:text-slate-100'}`}>
          {cp.label}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className={`text-[11px] ${overdue && !cp.completed ? 'text-red-500 font-semibold' : 'text-gray-400 dark:text-slate-500'}`}>
            {overdue && !cp.completed ? '⚠ Overdue · ' : ''}{fmtDate(cp.target_date)}
          </span>
          {cp.target_value !== null && (
            <span className="text-[11px] text-gray-400 dark:text-slate-500">Goal: {cp.target_value}</span>
          )}
          {cp.completed_at && (
            <span className="text-[11px] text-emerald-600">Done {fmtDate(cp.completed_at.slice(0, 10))}</span>
          )}
        </div>
      </div>
      <button onClick={onRemove} className="text-gray-300 dark:text-slate-600 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Challenge card ───────────────────────────────────────────────────────────

function ChallengeCard({
  challenge,
  onUpdate,
  onDelete,
  onToggleCheckpoint,
}: {
  challenge:          Challenge
  onUpdate:           (partial: Partial<Challenge>) => void
  onDelete:           () => void
  onToggleCheckpoint: (cpId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [addingCp, setAddingCp] = useState(false)
  const [cpForm, setCpForm] = useState({ label: '', target_date: '', target_value: '' })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(challenge.title)
  const [editDesc, setEditDesc] = useState(challenge.description ?? '')

  const done  = challenge.checkpoints.filter(c => c.completed).length
  const total = challenge.checkpoints.length
  const pct   = total === 0 ? 0 : Math.round((done / total) * 100)
  const isActive = challenge.status === 'active'

  function addCheckpoint() {
    if (!cpForm.label.trim() || !cpForm.target_date) return
    const newCp: Checkpoint = {
      id:           newCpId(),
      label:        cpForm.label.trim(),
      target_date:  cpForm.target_date,
      target_value: cpForm.target_value ? Number(cpForm.target_value) : null,
      completed:    false,
      completed_at: null,
    }
    onUpdate({ checkpoints: [...challenge.checkpoints, newCp] })
    setCpForm({ label: '', target_date: '', target_value: '' })
    setAddingCp(false)
  }

  function removeCheckpoint(id: string) {
    onUpdate({ checkpoints: challenge.checkpoints.filter(c => c.id !== id) })
  }

  const statusColors: Record<string, string> = {
    active:    'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
    completed: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
    abandoned: 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400',
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border transition-shadow hover:shadow-sm ${
      isActive ? 'border-gray-100 dark:border-slate-700' : 'border-gray-100 dark:border-slate-700 opacity-70'
    }`}>
      {/* Top strip */}
      <div className={`h-1 rounded-t-2xl ${isActive ? 'bg-gradient-to-r from-violet-500 to-indigo-400' : 'bg-gray-200 dark:bg-slate-600'}`} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-4 h-4 text-violet-500" />
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-2">
                <input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="text-sm font-semibold w-full border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                  autoFocus
                />
                <input
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  placeholder="Description…"
                  className="text-xs w-full border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-300"
                />
                <div className="flex gap-2">
                  <button onClick={() => { onUpdate({ title: editTitle, description: editDesc || null }); setEditing(false) }}
                    className="text-xs bg-violet-500 text-white px-3 py-1 rounded-lg font-medium">Save</button>
                  <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600 px-2">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">{challenge.title}</p>
                {challenge.description && (
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 line-clamp-2">{challenge.description}</p>
                )}
              </>
            )}
          </div>
          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${statusColors[challenge.status]}`}>
              {challenge.status}
            </span>
            {!editing && (
              <button onClick={() => setEditing(true)} className="p-1 text-gray-300 dark:text-slate-600 hover:text-violet-400 transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={() => setConfirmDelete(true)} className="p-1 text-gray-300 dark:text-slate-600 hover:text-red-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Meta: dates, repeat */}
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="text-[11px] text-gray-400 dark:text-slate-500">
            {fmtDate(challenge.start_date)}{challenge.end_date ? ` → ${fmtDate(challenge.end_date)}` : ''}
          </span>
          {challenge.repeat_cycle !== 'none' && (
            <span className="text-[11px] bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full">
              🔁 {REPEAT_LABELS[challenge.repeat_cycle]}
            </span>
          )}
          {challenge.target_value !== null && (
            <span className="text-[11px] bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
              🎯 {challenge.target_value} {challenge.target_unit ?? ''}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-[11px] text-gray-400 dark:text-slate-500 mb-1">
              <span>{done}/{total} checkpoints</span>
              <span className="font-semibold text-violet-500">{pct}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-400 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* Status actions */}
        {isActive && (
          <div className="flex gap-1.5 mb-3 flex-wrap">
            <button onClick={() => onUpdate({ status: 'completed' })}
              className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors">
              ✓ Complete
            </button>
            <button onClick={() => onUpdate({ status: 'abandoned' })}
              className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
              Abandon
            </button>
          </div>
        )}
        {!isActive && (
          <button onClick={() => onUpdate({ status: 'active' })}
            className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors mb-3">
            ↩ Reactivate
          </button>
        )}

        {/* Checkpoints toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors w-full"
        >
          <Flag className="w-3 h-3" />
          <span>{total} checkpoint{total !== 1 ? 's' : ''}</span>
          {expanded ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
        </button>

        {/* Checkpoint list */}
        {expanded && (
          <div className="mt-3 space-y-2">
            {challenge.checkpoints
              .slice()
              .sort((a, b) => a.target_date.localeCompare(b.target_date))
              .map(cp => (
                <CheckpointItem
                  key={cp.id}
                  cp={cp}
                  overdue={isPast(cp.target_date)}
                  onToggle={() => onToggleCheckpoint(cp.id)}
                  onRemove={() => removeCheckpoint(cp.id)}
                />
              ))}

            {/* Add checkpoint */}
            {addingCp ? (
              <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-3 space-y-2">
                <input value={cpForm.label} onChange={e => setCpForm(p => ({ ...p, label: e.target.value }))}
                  placeholder="Checkpoint label *"
                  className="text-sm w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100" />
                <div className="flex gap-2">
                  <input type="date" value={cpForm.target_date} onChange={e => setCpForm(p => ({ ...p, target_date: e.target.value }))}
                    className="text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1.5 focus:outline-none flex-1 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100" />
                  <input type="number" value={cpForm.target_value} onChange={e => setCpForm(p => ({ ...p, target_value: e.target.value }))}
                    placeholder="Value" min={0}
                    className="text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1.5 focus:outline-none w-24 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100" />
                </div>
                <div className="flex gap-2">
                  <button onClick={addCheckpoint} className="text-xs bg-violet-500 text-white px-3 py-1.5 rounded-lg font-medium">Add</button>
                  <button onClick={() => setAddingCp(false)} className="text-xs text-gray-400 hover:text-gray-600 px-2">Cancel</button>
                </div>
              </div>
            ) : (
              isActive && (
                <button onClick={() => setAddingCp(true)}
                  className="flex items-center gap-1 text-xs text-violet-500 hover:text-violet-600 transition-colors mt-1">
                  <Plus className="w-3.5 h-3.5" />
                  Add checkpoint
                </button>
              )
            )}
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          message={`"${challenge.title}" and all its checkpoints will be deleted.`}
          confirmLabel="Delete"
          onConfirm={onDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}

// ─── Add challenge form ───────────────────────────────────────────────────────

interface AddFormState {
  title:        string
  description:  string
  target_value: string
  target_unit:  string
  start_date:   string
  end_date:     string
  repeat_cycle: RepeatCycle
}

function AddChallengeForm({ onSave, onCancel }: {
  onSave:   (f: AddFormState) => void
  onCancel: () => void
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState<AddFormState>({
    title: '', description: '', target_value: '', target_unit: '',
    start_date: today, end_date: '', repeat_cycle: 'none',
  })

  function set<K extends keyof AddFormState>(k: K, v: AddFormState[K]) {
    setForm(p => ({ ...p, [k]: v }))
  }

  return (
    <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">New Challenge</p>

      <input value={form.title} onChange={e => set('title', e.target.value)}
        placeholder="Title *"
        className="text-sm w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100" />

      <input value={form.description} onChange={e => set('description', e.target.value)}
        placeholder="Description (optional)"
        className="text-sm w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-violet-400 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100" />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Target (optional)</p>
          <div className="flex gap-2">
            <input type="number" value={form.target_value} onChange={e => set('target_value', e.target.value)}
              placeholder="Value" min={0}
              className="text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-2 py-2 focus:outline-none w-full bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100" />
            <input value={form.target_unit} onChange={e => set('target_unit', e.target.value)}
              placeholder="Unit"
              className="text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-2 py-2 focus:outline-none w-full bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100" />
          </div>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Repeat</p>
          <select value={form.repeat_cycle} onChange={e => set('repeat_cycle', e.target.value as RepeatCycle)}
            className="text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-2 py-2 focus:outline-none w-full bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100">
            {(Object.entries(REPEAT_LABELS) as [RepeatCycle, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Start date</p>
          <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
            className="text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-2 py-2 focus:outline-none w-full bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100" />
        </div>
        <div>
          <p className="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">End date</p>
          <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)}
            className="text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-2 py-2 focus:outline-none w-full bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100" />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => form.title.trim() && onSave(form)}
          disabled={!form.title.trim()}
          className="text-sm bg-violet-500 text-white px-5 py-2 rounded-xl font-medium hover:bg-violet-600 transition-colors disabled:opacity-40"
        >
          Create
        </button>
        <button onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2">Cancel</button>
      </div>
    </div>
  )
}

// ─── Main ChallengesView ──────────────────────────────────────────────────────

interface Props { scope: ChallengeScope }

export function ChallengesView({ scope }: Props) {
  const { challenges, isLoading, createChallenge, updateChallenge, deleteChallenge, toggleCheckpoint } = useChallenges(scope)
  const [showAdd, setShowAdd]   = useState(false)
  const [filter, setFilter]     = useState<'active' | 'all'>('active')

  const filtered = filter === 'active'
    ? challenges.filter(c => c.status === 'active')
    : challenges

  const overdueCount = challenges
    .filter(c => c.status === 'active')
    .flatMap(c => c.checkpoints)
    .filter(cp => !cp.completed && isPast(cp.target_date))
    .length

  async function handleCreate(f: AddFormState) {
    await createChallenge({
      scope,
      title:        f.title,
      description:  f.description || undefined,
      target_value: f.target_value ? Number(f.target_value) : undefined,
      target_unit:  f.target_unit  || undefined,
      start_date:   f.start_date,
      end_date:     f.end_date     || undefined,
      repeat_cycle: f.repeat_cycle,
      checkpoints:  [],
    })
    setShowAdd(false)
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 dark:bg-slate-700 rounded-xl p-1 gap-0.5">
            {(['active', 'all'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors capitalize ${
                  filter === f ? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-slate-100 shadow-sm' : 'text-gray-500 dark:text-slate-400'
                }`}>
                {f === 'active' ? 'Active' : 'All'}
              </button>
            ))}
          </div>
          {overdueCount > 0 && (
            <span className="text-[11px] font-semibold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
              ⚠ {overdueCount} overdue
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1.5 text-xs bg-violet-500 text-white px-3 py-2 rounded-xl font-medium hover:bg-violet-600 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Challenge
        </button>
      </div>

      {showAdd && (
        <AddChallengeForm onSave={handleCreate} onCancel={() => setShowAdd(false)} />
      )}

      {isLoading && <p className="text-sm text-gray-400 dark:text-slate-500">Loading…</p>}

      <div className="space-y-4">
        {filtered.map(c => (
          <ChallengeCard
            key={c.id}
            challenge={c}
            onUpdate={partial => updateChallenge(c.id, partial)}
            onDelete={() => deleteChallenge(c.id)}
            onToggleCheckpoint={cpId => toggleCheckpoint(c.id, cpId)}
          />
        ))}
      </div>

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-14">
          <p className="text-3xl mb-3">🏆</p>
          <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">No challenges yet</p>
          <p className="text-xs text-gray-400 dark:text-slate-500">
            {filter === 'active' ? 'Create a challenge with checkpoints and a deadline.' : 'No challenges created yet.'}
          </p>
        </div>
      )}
    </div>
  )
}
