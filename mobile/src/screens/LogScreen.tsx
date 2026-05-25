import { useState, useEffect, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import useSWR from 'swr'
import { API_BASE } from '../config'

type Tab = 'journal' | 'plan'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function fmt(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface JournalEntry {
  id: number
  date: string
  content: string
  went_well: string[]
  went_bad: string[]
}

interface PlanTask {
  id: string
  text: string
  done: boolean
}

interface DailyPlan {
  id: number
  date: string
  tasks: PlanTask[]
  notes: string
}

// ─── Journal view ─────────────────────────────────────────────────────────────

function JournalView() {
  const date = todayStr()
  const { data: entry, mutate, isLoading } = useSWR<JournalEntry | null>(
    `/api/journal?date=${date}`
  )

  const [content, setContent]   = useState('')
  const [wentWell, setWentWell] = useState<string[]>([])
  const [wentBad, setWentBad]   = useState<string[]>([])
  const [wellInput, setWellInput] = useState('')
  const [badInput, setBadInput]   = useState('')
  const [saving, setSaving]     = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loaded = useRef(false)

  useEffect(() => {
    if (entry !== undefined && !loaded.current) {
      setContent(entry?.content ?? '')
      setWentWell(entry?.went_well ?? [])
      setWentBad(entry?.went_bad ?? [])
      loaded.current = true
    }
  }, [entry])

  async function persist(c: string, ww: string[], wb: string[]) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(async () => {
      await fetch(`${API_BASE}/api/journal/${date}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: c, went_well: ww, went_bad: wb }),
      })
      await mutate()
      setSaving(false)
    }, 700)
  }

  function addWell() {
    const v = wellInput.trim()
    if (!v || wentWell.includes(v) || wentWell.length >= 3) return
    const next = [...wentWell, v]
    setWentWell(next)
    setWellInput('')
    persist(content, next, wentBad)
  }

  function addBad() {
    const v = badInput.trim()
    if (!v || wentBad.includes(v) || wentBad.length >= 3) return
    const next = [...wentBad, v]
    setWentBad(next)
    setBadInput('')
    persist(content, wentWell, next)
  }

  if (isLoading) return <ActivityIndicator style={{ marginTop: 40 }} />

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView style={s.body} contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Date header */}
        <View style={s.dateRow}>
          <Text style={s.dateText}>{fmt(date)}</Text>
          {saving && <Text style={s.savingText}>Saving…</Text>}
        </View>

        {/* Free-form content */}
        <TextInput
          value={content}
          onChangeText={v => { setContent(v); persist(v, wentWell, wentBad) }}
          placeholder="Write about your day…"
          placeholderTextColor="#9CA3AF"
          multiline
          style={s.textarea}
        />

        {/* Went well */}
        <Text style={[s.sectionLabel, { color: '#059669' }]}>WHAT WENT WELL</Text>
        <View style={s.pillRow}>
          {wentWell.map(w => (
            <TouchableOpacity
              key={w}
              onPress={() => { const next = wentWell.filter(x => x !== w); setWentWell(next); persist(content, next, wentBad) }}
              style={[s.pill, { backgroundColor: '#ECFDF5', borderColor: '#6EE7B7' }]}
            >
              <Text style={[s.pillText, { color: '#059669' }]}>{w} ×</Text>
            </TouchableOpacity>
          ))}
        </View>
        {wentWell.length < 3 && (
          <View style={s.inputRow}>
            <TextInput
              value={wellInput}
              onChangeText={setWellInput}
              placeholder="Add highlight…"
              placeholderTextColor="#9CA3AF"
              style={s.pillInput}
              returnKeyType="done"
              onSubmitEditing={addWell}
            />
            <TouchableOpacity onPress={addWell} style={[s.pillAddBtn, { backgroundColor: '#ECFDF5' }]}>
              <Text style={{ color: '#059669', fontWeight: '600' }}>+</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Was hard */}
        <Text style={[s.sectionLabel, { color: '#EF4444' }]}>WHAT WAS HARD</Text>
        <View style={s.pillRow}>
          {wentBad.map(w => (
            <TouchableOpacity
              key={w}
              onPress={() => { const next = wentBad.filter(x => x !== w); setWentBad(next); persist(content, wentWell, next) }}
              style={[s.pill, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}
            >
              <Text style={[s.pillText, { color: '#EF4444' }]}>{w} ×</Text>
            </TouchableOpacity>
          ))}
        </View>
        {wentBad.length < 3 && (
          <View style={s.inputRow}>
            <TextInput
              value={badInput}
              onChangeText={setBadInput}
              placeholder="Add challenge…"
              placeholderTextColor="#9CA3AF"
              style={s.pillInput}
              returnKeyType="done"
              onSubmitEditing={addBad}
            />
            <TouchableOpacity onPress={addBad} style={[s.pillAddBtn, { backgroundColor: '#FEF2F2' }]}>
              <Text style={{ color: '#EF4444', fontWeight: '600' }}>+</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// ─── Plan view ────────────────────────────────────────────────────────────────

function PlanView() {
  const date = todayStr()
  const { data: plan, mutate, isLoading } = useSWR<DailyPlan | null>(
    `/api/plan/${date}`
  )

  const [tasks, setTasks]     = useState<PlanTask[]>([])
  const [notes, setNotes]     = useState('')
  const [taskInput, setTaskInput] = useState('')
  const [saving, setSaving]   = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loaded = useRef(false)

  useEffect(() => {
    if (plan !== undefined && !loaded.current) {
      setTasks(plan?.tasks ?? [])
      setNotes(plan?.notes ?? '')
      loaded.current = true
    }
  }, [plan])

  async function persist(t: PlanTask[], n: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(async () => {
      await fetch(`${API_BASE}/api/plan/${date}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: t, notes: n }),
      })
      await mutate()
      setSaving(false)
    }, 600)
  }

  function addTask() {
    const text = taskInput.trim()
    if (!text) return
    const next: PlanTask[] = [...tasks, { id: Date.now().toString(), text, done: false }]
    setTasks(next)
    setTaskInput('')
    persist(next, notes)
  }

  function toggleTask(id: string) {
    const next = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t)
    setTasks(next)
    persist(next, notes)
  }

  function deleteTask(id: string) {
    Alert.alert('Remove task', 'Delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          const next = tasks.filter(t => t.id !== id)
          setTasks(next)
          persist(next, notes)
        }
      },
    ])
  }

  const done  = tasks.filter(t => t.done).length
  const total = tasks.length

  if (isLoading) return <ActivityIndicator style={{ marginTop: 40 }} />

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView style={s.body} contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Header */}
        <View style={s.dateRow}>
          <View>
            <Text style={s.dateText}>{fmt(date)}</Text>
            <Text style={s.subLabel}>Today's Plan</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            {total > 0 && <Text style={s.savingText}>{done}/{total} done</Text>}
            {saving && <Text style={s.savingText}>Saving…</Text>}
          </View>
        </View>

        {/* Progress bar */}
        {total > 0 && (
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${(done / total) * 100}%` as `${number}%` }]} />
          </View>
        )}

        {/* Tasks */}
        {tasks.length === 0 && (
          <Text style={s.emptyText}>No tasks yet. Add your first task!</Text>
        )}
        {tasks.map(task => (
          <View key={task.id} style={s.taskCard}>
            <TouchableOpacity onPress={() => toggleTask(task.id)} style={[s.checkbox, task.done && s.checkboxDone]}>
              {task.done && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✓</Text>}
            </TouchableOpacity>
            <Text style={[s.taskText, task.done && s.taskDone]}>{task.text}</Text>
            <TouchableOpacity onPress={() => deleteTask(task.id)} style={s.deleteBtn}>
              <Text style={{ color: '#D1D5DB', fontSize: 14 }}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Add task */}
        <View style={s.inputRow}>
          <TextInput
            value={taskInput}
            onChangeText={setTaskInput}
            placeholder="Add task…"
            placeholderTextColor="#9CA3AF"
            style={s.pillInput}
            returnKeyType="done"
            onSubmitEditing={addTask}
          />
          <TouchableOpacity onPress={addTask} style={s.addTaskBtn}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Motivational notes */}
        <Text style={[s.sectionLabel, { color: '#F59E0B', marginTop: 8 }]}>MOTIVATIONAL NOTES</Text>
        <TextInput
          value={notes}
          onChangeText={v => { setNotes(v); persist(tasks, v) }}
          placeholder="Write something to keep yourself motivated…"
          placeholderTextColor="#9CA3AF"
          multiline
          style={[s.textarea, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function LogScreen() {
  const [tab, setTab] = useState<Tab>('journal')

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Tab bar */}
      <View style={s.tabBar}>
        {(['journal', 'plan'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={[s.tabBtn, tab === t && s.tabBtnActive]}
          >
            <Text style={[s.tabLabel, tab === t && s.tabLabelActive]}>
              {t === 'journal' ? 'Journal' : 'Plan'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'journal' ? <JournalView /> : <PlanView />}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tabBtnActive: { backgroundColor: '#111827' },
  tabLabel: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  tabLabelActive: { color: '#fff' },
  body: { flex: 1 },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dateText: { fontSize: 16, fontWeight: '600', color: '#111827' },
  subLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  savingText: { fontSize: 11, color: '#9CA3AF' },
  textarea: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
  },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: { fontSize: 12, fontWeight: '500' },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  pillInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#fff',
  },
  pillAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  // Plan-specific
  progressTrack: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 16 },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxDone: { backgroundColor: '#10B981', borderColor: '#10B981' },
  taskText: { flex: 1, fontSize: 14, color: '#111827' },
  taskDone: { textDecorationLine: 'line-through', color: '#9CA3AF' },
  deleteBtn: { padding: 4 },
  addTaskBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
