import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useExercises, useWorkoutLogs, useFitnessTargets } from '../hooks/useSport'
import type { ExerciseType, MuscleGroup, WorkoutSetGroup, Exercise } from '../hooks/useSport'

// ─── Constants ────────────────────────────────────────────────────────────────

const EXERCISE_TYPES: { id: ExerciseType; icon: string; label: string }[] = [
  { id: 'calisthenics', icon: '🤸', label: 'Calisthenics' },
  { id: 'weights',      icon: '🏋️', label: 'Weights' },
  { id: 'cardio',       icon: '🏃', label: 'Cardio' },
  { id: 'flexibility',  icon: '🧘', label: 'Flexibility' },
]
const MUSCLE_GROUPS: MuscleGroup[] = ['arm', 'chest', 'back', 'leg', 'core', 'shoulder']

function todayStr() { return new Date().toISOString().slice(0, 10) }
function currentMonth() { return new Date().toISOString().slice(0, 7) }

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard() {
  const month = currentMonth()
  const { logs } = useWorkoutLogs(month)

  const thisWeek = logs.filter(l => {
    const d = new Date(l.date.slice(0, 10) + 'T00:00:00')
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    return d >= weekStart
  })

  const logDates = new Set(logs.map(l => l.date.slice(0, 10)))
  let streak = 0
  const d = new Date()
  while (logDates.has(d.toISOString().slice(0, 10))) {
    streak++
    d.setDate(d.getDate() - 1)
  }

  const totalSets = logs.reduce((s, l) => s + l.sets.reduce((ss, g) => ss + g.sets.length, 0), 0)

  return (
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.statsRow}>
        {[
          { label: 'This week', value: thisWeek.length, unit: 'workouts' },
          { label: 'Streak',    value: streak,          unit: 'days' },
          { label: 'Sets',      value: totalSets,       unit: 'this month' },
        ].map(stat => (
          <View key={stat.label} style={s.statCard}>
            <Text style={s.statValue}>{stat.value}</Text>
            <Text style={s.statUnit}>{stat.unit}</Text>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {logs.length > 0 && (
        <>
          <Text style={s.sectionTitle}>Recent</Text>
          {logs.slice(0, 5).map(log => (
            <View key={log.id} style={s.card}>
              <View style={s.cardRow}>
                <Text style={s.cardTitle}>
                  {new Date(log.date.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                </Text>
                {log.duration_min ? <Text style={s.cardMeta}>{log.duration_min} min</Text> : null}
              </View>
              <Text style={s.cardMeta}>{log.sets.map(g => `${g.exercise_name} ×${g.sets.length}`).join(' · ')}</Text>
            </View>
          ))}
        </>
      )}

      {logs.length === 0 && (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>💪</Text>
          <Text style={s.emptyText}>No workouts yet. Start logging!</Text>
        </View>
      )}
    </ScrollView>
  )
}

// ─── Exercises ────────────────────────────────────────────────────────────────

function ExercisesView() {
  const { exercises, isLoading, addExercise, updateExercise, deleteExercise } = useExercises()
  const [typeFilter, setTypeFilter] = useState<ExerciseType | null>(null)
  const [search, setSearch] = useState('')
  const [modalVisible, setModalVisible] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [form, setForm] = useState<{ name: string; type: ExerciseType; muscle_groups: MuscleGroup[]; description: string }>({
    name: '', type: 'calisthenics', muscle_groups: [], description: '',
  })

  const filtered = exercises.filter(e =>
    (!typeFilter || e.type === typeFilter) &&
    e.name.toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() {
    setEditingExercise(null)
    setForm({ name: '', type: 'calisthenics', muscle_groups: [], description: '' })
    setModalVisible(true)
  }

  function openEdit(ex: Exercise) {
    setEditingExercise(ex)
    setForm({ name: ex.name, type: ex.type, muscle_groups: [...ex.muscle_groups], description: ex.description ?? '' })
    setModalVisible(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    const payload = { name: form.name.trim(), type: form.type, muscle_groups: form.muscle_groups, description: form.description || undefined }
    if (editingExercise) {
      await updateExercise(editingExercise.id, payload)
    } else {
      await addExercise(payload)
    }
    setModalVisible(false)
  }

  function confirmDelete(ex: Exercise) {
    Alert.alert('Delete Exercise', `"${ex.name}" will be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteExercise(ex.id) },
    ])
  }

  function toggleMuscle(m: MuscleGroup) {
    setForm(p => ({
      ...p,
      muscle_groups: p.muscle_groups.includes(m)
        ? p.muscle_groups.filter(x => x !== m)
        : [...p.muscle_groups, m],
    }))
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.content}>
        <TextInput
          style={s.searchInput}
          placeholder="Search exercises…"
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9CA3AF"
        />

        {/* Type filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pills}>
          {EXERCISE_TYPES.map(t => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTypeFilter(typeFilter === t.id ? null : t.id)}
              style={[s.pill, typeFilter === t.id && s.pillActive]}
            >
              <Text style={[s.pillText, typeFilter === t.id && s.pillTextActive]}>{t.icon} {t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isLoading && <Text style={s.loading}>Loading…</Text>}

        {filtered.map(ex => {
          const typeInfo = EXERCISE_TYPES.find(t => t.id === ex.type)
          return (
            <View key={ex.id} style={s.card}>
              <View style={s.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{typeInfo?.icon} {ex.name}</Text>
                  <Text style={s.cardMeta}>{typeInfo?.label}{ex.muscle_groups.length > 0 ? ' · ' + ex.muscle_groups.join(', ') : ''}</Text>
                  {ex.description ? <Text style={[s.cardMeta, { marginTop: 2 }]}>{ex.description}</Text> : null}
                </View>
                <View style={{ gap: 6 }}>
                  <TouchableOpacity onPress={() => openEdit(ex)} style={s.actionBtn}>
                    <Text style={s.actionBtnText}>✎</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete(ex)} style={[s.actionBtn, s.actionBtnRed]}>
                    <Text style={[s.actionBtnText, { color: '#EF4444' }]}>×</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )
        })}

        {filtered.length === 0 && !isLoading && (
          <View style={s.empty}>
            <Text style={s.emptyText}>No exercises. Tap + to add one.</Text>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={openAdd} activeOpacity={0.8}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add / Edit modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={s.modalHeaderBtn}>
              <Text style={s.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>{editingExercise ? 'Edit Exercise' : 'New Exercise'}</Text>
            <TouchableOpacity onPress={handleSave} style={s.modalHeaderBtn}>
              <Text style={s.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={s.modalBody} keyboardShouldPersistTaps="handled">
            <TextInput
              style={s.input}
              placeholder="Exercise name *"
              value={form.name}
              onChangeText={name => setForm(p => ({ ...p, name }))}
              placeholderTextColor="#9CA3AF"
            />

            <Text style={s.fieldLabel}>Type</Text>
            <View style={s.typeRow}>
              {EXERCISE_TYPES.map(t => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setForm(p => ({ ...p, type: t.id }))}
                  style={[s.typeBtn, form.type === t.id && s.typeBtnActive]}
                >
                  <Text style={[s.typeBtnText, form.type === t.id && s.typeBtnTextActive]}>{t.icon} {t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.fieldLabel}>Muscle Groups</Text>
            <View style={s.muscleRow}>
              {MUSCLE_GROUPS.map(m => (
                <TouchableOpacity
                  key={m}
                  onPress={() => toggleMuscle(m)}
                  style={[s.pill, form.muscle_groups.includes(m) && s.pillActive]}
                >
                  <Text style={[s.pillText, form.muscle_groups.includes(m) && s.pillTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={s.input}
              placeholder="Description (optional)"
              value={form.description}
              onChangeText={description => setForm(p => ({ ...p, description }))}
              placeholderTextColor="#9CA3AF"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

// ─── Log Workout ──────────────────────────────────────────────────────────────

function LogView() {
  const month = currentMonth()
  const { logs, logWorkout, updateLog, deleteLog } = useWorkoutLogs(month)
  const { exercises } = useExercises()
  const [date, setDate] = useState(todayStr())
  const [durationMin, setDurationMin] = useState('')
  const [notes, setNotes] = useState('')
  const [sets, setSets] = useState<WorkoutSetGroup[]>([])
  const [editingLogId, setEditingLogId] = useState<number | null>(null)
  const [saved, setSaved] = useState(false)

  function loadLogForEdit(log: (typeof logs)[0]) {
    setEditingLogId(log.id)
    setDate(log.date.slice(0, 10))
    setDurationMin(log.duration_min ? String(log.duration_min) : '')
    setNotes(log.notes ?? '')
    setSets(log.sets.map(g => ({ ...g, sets: g.sets.map(s => ({ ...s })) })))
  }

  function cancelEdit() {
    setEditingLogId(null)
    setDate(todayStr())
    setDurationMin('')
    setNotes('')
    setSets([])
  }

  async function handleSave() {
    if (sets.length === 0) return
    const payload = { date, sets, notes: notes.trim() || undefined, duration_min: durationMin ? Number(durationMin) : undefined }
    if (editingLogId !== null) {
      await updateLog(editingLogId, payload)
      cancelEdit()
    } else {
      await logWorkout(payload)
      setSets([])
      setNotes('')
      setDurationMin('')
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function addExerciseGroup(name: string) {
    setSets(prev => [...prev, { exercise_name: name, sets: [{ reps: 10, weight_kg: null }] }])
  }

  function addSet(gi: number) {
    setSets(prev => prev.map((g, i) => i !== gi ? g : {
      ...g,
      sets: [...g.sets, { reps: g.sets[g.sets.length - 1]?.reps ?? 10, weight_kg: g.sets[g.sets.length - 1]?.weight_kg ?? null }],
    }))
  }

  function updateSet(gi: number, si: number, field: 'reps' | 'weight_kg', value: string) {
    setSets(prev => prev.map((g, gidx) => gidx !== gi ? g : {
      ...g,
      sets: g.sets.map((set, sidx) => sidx !== si ? set : {
        ...set,
        [field]: field === 'weight_kg' ? (value === '' ? null : Number(value)) : Number(value),
      }),
    }))
  }

  function confirmDeleteLog(log: (typeof logs)[0]) {
    Alert.alert('Delete Workout', 'This log will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteLog(log.id); if (editingLogId === log.id) cancelEdit() } },
    ])
  }

  return (
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      {/* Form header */}
      <View style={s.card}>
        {editingLogId !== null && (
          <View style={[s.cardRow, { marginBottom: 8 }]}>
            <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '600' }}>Editing workout</Text>
            <TouchableOpacity onPress={cancelEdit}>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>Cancel edit</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={s.cardRow}>
          <TextInput
            style={[s.input, { flex: 1, marginBottom: 0 }]}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9CA3AF"
          />
          <TextInput
            style={[s.input, { width: 110, marginBottom: 0 }]}
            value={durationMin}
            onChangeText={setDurationMin}
            placeholder="min"
            keyboardType="number-pad"
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      {/* Exercise sets */}
      {sets.map((group, gi) => (
        <View key={gi} style={s.card}>
          <View style={s.cardRow}>
            <Text style={s.cardTitle}>{group.exercise_name}</Text>
            <TouchableOpacity onPress={() => setSets(p => p.filter((_, i) => i !== gi))}>
              <Text style={{ color: '#EF4444', fontSize: 18 }}>×</Text>
            </TouchableOpacity>
          </View>
          <View style={s.setHeaderRow}>
            <Text style={[s.setCell, s.setHeader]}>Set</Text>
            <Text style={[s.setCell, s.setHeader]}>Reps</Text>
            <Text style={[s.setCell, s.setHeader]}>kg</Text>
          </View>
          {group.sets.map((set, si) => (
            <View key={si} style={s.setRow}>
              <Text style={[s.setCell, { color: '#6B7280' }]}>#{si + 1}</Text>
              <TextInput
                style={[s.setCell, s.setInput]}
                value={String(set.reps)}
                onChangeText={v => updateSet(gi, si, 'reps', v)}
                keyboardType="number-pad"
                selectTextOnFocus
              />
              <TextInput
                style={[s.setCell, s.setInput]}
                value={set.weight_kg !== null ? String(set.weight_kg) : ''}
                onChangeText={v => updateSet(gi, si, 'weight_kg', v)}
                keyboardType="decimal-pad"
                placeholder="—"
                placeholderTextColor="#9CA3AF"
                selectTextOnFocus
              />
            </View>
          ))}
          <TouchableOpacity onPress={() => addSet(gi)} style={{ marginTop: 8 }}>
            <Text style={{ color: '#10B981', fontSize: 13 }}>+ Add set</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Add exercise from library */}
      {exercises.length > 0 && (
        <>
          <Text style={s.sectionTitle}>Add exercise</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pills}>
            {exercises.map(ex => (
              <TouchableOpacity key={ex.id} onPress={() => addExerciseGroup(ex.name)} style={s.pill}>
                <Text style={s.pillText}>{ex.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      <TextInput
        style={[s.input, { height: 72, textAlignVertical: 'top', paddingTop: 10 }]}
        placeholder="Notes (optional)…"
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholderTextColor="#9CA3AF"
      />

      <TouchableOpacity
        onPress={handleSave}
        disabled={sets.length === 0}
        style={[s.saveBtn, sets.length === 0 && s.saveBtnDisabled]}
      >
        <Text style={s.saveBtnText}>{editingLogId !== null ? 'Update workout' : 'Save workout'}</Text>
      </TouchableOpacity>
      {saved && <Text style={{ textAlign: 'center', color: '#10B981', fontSize: 13, marginTop: 4 }}>Saved!</Text>}

      {/* History */}
      {logs.length > 0 && (
        <>
          <Text style={s.sectionTitle}>This month</Text>
          {logs.map(log => (
            <View key={log.id} style={[s.card, editingLogId === log.id && { borderColor: '#10B981', borderWidth: 1 }]}>
              <View style={s.cardRow}>
                <Text style={s.cardTitle}>
                  {new Date(log.date.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                  {editingLogId === log.id ? '  ✎' : ''}
                </Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {log.duration_min ? <Text style={s.cardMeta}>{log.duration_min} min</Text> : null}
                  <TouchableOpacity onPress={() => loadLogForEdit(log)}>
                    <Text style={{ color: '#6B7280', fontSize: 15 }}>✎</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDeleteLog(log)}>
                    <Text style={{ color: '#EF4444', fontSize: 18 }}>×</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={s.cardMeta}>{log.sets.map(g => `${g.exercise_name} ×${g.sets.length}`).join(' · ')}</Text>
              {log.notes ? <Text style={[s.cardMeta, { marginTop: 4 }]}>{log.notes}</Text> : null}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  )
}

// ─── Targets ──────────────────────────────────────────────────────────────────

function TargetsView() {
  const { targets, isLoading, addTarget, updateTarget, deleteTarget } = useFitnessTargets()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', unit: 'reps', target_value: '' })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

  async function handleAdd() {
    if (!form.name.trim() || !form.target_value) return
    await addTarget({ name: form.name, unit: form.unit, target_value: Number(form.target_value) })
    setForm({ name: '', unit: 'reps', target_value: '' })
    setShowAdd(false)
  }

  async function handleUpdateCurrent() {
    if (editingId === null) return
    await updateTarget(editingId, Number(editValue))
    setEditingId(null)
  }

  function confirmDelete(id: number, name: string) {
    Alert.alert('Delete Target', `"${name}" will be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTarget(id) },
    ])
  }

  return (
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      {showAdd && (
        <View style={s.card}>
          <TextInput
            style={s.input}
            placeholder="Target name *"
            value={form.name}
            onChangeText={name => setForm(p => ({ ...p, name }))}
            placeholderTextColor="#9CA3AF"
          />
          <View style={s.cardRow}>
            <TextInput
              style={[s.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Unit (reps, kg, min…)"
              value={form.unit}
              onChangeText={unit => setForm(p => ({ ...p, unit }))}
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={[s.input, { width: 80, marginBottom: 0 }]}
              placeholder="Goal"
              value={form.target_value}
              onChangeText={target_value => setForm(p => ({ ...p, target_value }))}
              keyboardType="decimal-pad"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={[s.cardRow, { marginTop: 10, gap: 8 }]}>
            <TouchableOpacity onPress={handleAdd} style={[s.saveBtn, { flex: 1, paddingVertical: 10, marginTop: 0 }]}>
              <Text style={s.saveBtnText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAdd(false)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#6B7280', fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isLoading && <Text style={s.loading}>Loading…</Text>}

      {targets.map(target => {
        const pct = Math.min(100, Math.round((Number(target.current_value) / Number(target.target_value)) * 100))
        return (
          <View key={target.id} style={s.card}>
            <View style={s.cardRow}>
              <Text style={s.cardTitle}>{target.name}</Text>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#10B981' }}>{pct}%</Text>
                <TouchableOpacity onPress={() => confirmDelete(target.id, target.name)}>
                  <Text style={{ color: '#EF4444', fontSize: 18 }}>×</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={s.progressBg}>
              <View style={[s.progressFill, { width: `${pct}%` as `${number}%` }]} />
            </View>
            <View style={[s.cardRow, { marginTop: 8 }]}>
              {editingId === target.id ? (
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TextInput
                    style={[s.setInput, { width: 72 }]}
                    value={editValue}
                    onChangeText={setEditValue}
                    keyboardType="decimal-pad"
                    autoFocus
                    selectTextOnFocus
                  />
                  <TouchableOpacity onPress={handleUpdateCurrent} style={{ backgroundColor: '#10B981', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>OK</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingId(null)}>
                    <Text style={{ color: '#6B7280', fontSize: 13 }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => { setEditingId(target.id); setEditValue(String(target.current_value)) }}>
                  <Text style={s.cardMeta}>
                    {target.current_value} / {target.target_value} {target.unit}
                    <Text style={{ color: '#10B981' }}>  tap to update</Text>
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )
      })}

      {targets.length === 0 && !isLoading && (
        <View style={s.empty}>
          <Text style={s.emptyText}>No targets yet. Tap + to set a goal.</Text>
        </View>
      )}

      <TouchableOpacity style={s.fab} onPress={() => setShowAdd(v => !v)} activeOpacity={0.8}>
        <Text style={s.fabText}>{showAdd ? '×' : '+'}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'exercises' | 'log' | 'targets'
const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard',  label: 'Dashboard' },
  { id: 'exercises',  label: 'Exercises' },
  { id: 'log',        label: 'Log' },
  { id: 'targets',    label: 'Targets' },
]

export function SportScreen() {
  const [tab, setTab] = useState<Tab>('dashboard')

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      {/* Segment control */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={s.tabBarContent}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.id}
            onPress={() => setTab(t.id)}
            style={[s.tabBtn, tab === t.id && s.tabBtnActive]}
          >
            <Text style={[s.tabBtnText, tab === t.id && s.tabBtnTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {tab === 'dashboard'  && <Dashboard />}
      {tab === 'exercises'  && <ExercisesView />}
      {tab === 'log'        && <LogView />}
      {tab === 'targets'    && <TargetsView />}
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },

  // Tab bar
  tabBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexGrow: 0 },
  tabBarContent: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F3F4F6' },
  tabBtnActive: { backgroundColor: '#111827' },
  tabBtnText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  tabBtnTextActive: { color: '#fff' },

  // Content
  content: { padding: 16, gap: 12, paddingBottom: 100 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 },

  // Cards
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', padding: 14, gap: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  cardMeta: { fontSize: 12, color: '#6B7280' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', padding: 14, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', color: '#111827' },
  statUnit: { fontSize: 10, color: '#9CA3AF', marginTop: 1 },
  statLabel: { fontSize: 10, fontWeight: '600', color: '#6B7280', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.4 },

  // Pills / filters
  pills: { flexGrow: 0, marginBottom: 4 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#D1D5DB', marginRight: 6, backgroundColor: '#fff' },
  pillActive: { backgroundColor: '#111827', borderColor: '#111827' },
  pillText: { fontSize: 12, color: '#374151' },
  pillTextActive: { color: '#fff' },

  // Inputs
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: '#fff', color: '#111827', marginBottom: 8 },
  searchInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: '#fff', color: '#111827', marginBottom: 8 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },

  // Exercise type row
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  typeBtnActive: { backgroundColor: '#111827', borderColor: '#111827' },
  typeBtnText: { fontSize: 12, color: '#374151' },
  typeBtnTextActive: { color: '#fff' },
  muscleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },

  // Action buttons on cards
  actionBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  actionBtnRed: { backgroundColor: '#FEF2F2' },
  actionBtnText: { fontSize: 16, color: '#374151' },

  // Set table
  setHeaderRow: { flexDirection: 'row', marginTop: 6, marginBottom: 2 },
  setRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  setCell: { flex: 1, textAlign: 'center' },
  setHeader: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase' },
  setInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingVertical: 6, textAlign: 'center', fontSize: 14, color: '#111827', backgroundColor: '#fff' },

  // Save button
  saveBtn: { backgroundColor: '#10B981', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // Progress bar
  progressBg: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden', marginVertical: 8 },
  progressFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 3 },

  // Modal
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalHeaderBtn: { minWidth: 60, minHeight: 44, justifyContent: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  modalCancel: { fontSize: 15, color: '#6B7280' },
  modalSave: { fontSize: 15, color: '#10B981', fontWeight: '600', textAlign: 'right' },
  modalBody: { flex: 1, padding: 16 },

  // FAB
  fab: { position: 'absolute', bottom: 24, right: 24, width: 52, height: 52, borderRadius: 26, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, elevation: 6 },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },

  // Empty / Loading
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  loading: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginTop: 40 },
})
