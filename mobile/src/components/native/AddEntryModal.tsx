import { useState } from 'react'
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import * as Haptics from 'expo-haptics'
import { EXPENSE_CATS, INCOME_CATS } from '../../types'
import { API_BASE } from '../../config'
import type { Category, TxType } from '../../types'

interface Form { type: TxType; name: string; amount: string; date: string; category: Category }
interface Props { month: string; visible: boolean; onClose: () => void; onSaved: () => void }

function validate(f: Form): string | null {
  if (!f.name.trim()) return 'Name required'
  if (!f.amount || isNaN(Number(f.amount)) || Number(f.amount) <= 0) return 'Valid amount required'
  return null
}

export function AddEntryModal({ month, visible, onClose, onSaved }: Props) {
  const [form, setForm] = useState<Form>({ type: 'expense', name: '', amount: '', date: `${month}-01`, category: 'Others' })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const set = (patch: Partial<Form>) => setForm(f => ({ ...f, ...patch }))
  const cats = form.type === 'income' ? INCOME_CATS : EXPENSE_CATS

  async function handleSave() {
    const err = validate(form)
    if (err) { setError(err); return }
    setSaving(true)
    try {
      await fetch(`${API_BASE}/api/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: Math.round(Number(form.amount) * 100) }),
      })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      onSaved()
      onClose()
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.headerBtn}><Text style={s.cancel}>Cancel</Text></TouchableOpacity>
          <Text style={s.title}>Add Entry</Text>
          <TouchableOpacity onPress={handleSave} style={s.headerBtn} disabled={saving}>
            <Text style={[s.save, saving && { opacity: 0.5 }]}>Save</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={s.body} keyboardShouldPersistTaps="handled">
          <View style={s.toggle}>
            {(['expense', 'income'] as TxType[]).map(t => (
              <TouchableOpacity
                key={t} style={[s.toggleBtn, form.type === t && s.toggleActive]}
                onPress={() => set({ type: t, category: t === 'income' ? 'Salary' : 'Others' })}
              >
                <Text style={[s.toggleText, form.type === t && s.toggleTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={s.input} placeholder="Description" value={form.name} onChangeText={name => set({ name })} />
          <TextInput style={s.input} placeholder="Amount (€)" keyboardType="decimal-pad" value={form.amount} onChangeText={amount => set({ amount })} />
          <TextInput style={s.input} placeholder="Date (YYYY-MM-DD)" value={form.date} onChangeText={date => set({ date })} />
          <View style={s.cats}>
            {cats.map(c => (
              <TouchableOpacity key={c} style={[s.catBtn, form.category === c && s.catActive]} onPress={() => set({ category: c })}>
                <Text style={[s.catText, form.category === c && s.catTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {error && <Text style={s.error}>{error}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerBtn: { minWidth: 60, minHeight: 44, justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '600' },
  cancel: { fontSize: 15, color: '#6b7280' },
  save: { fontSize: 15, color: '#2563eb', fontWeight: '600', textAlign: 'right' },
  body: { flex: 1, padding: 16 },
  toggle: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 8, padding: 3, marginBottom: 16 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  toggleActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  toggleText: { fontSize: 14, color: '#6b7280', textTransform: 'capitalize' },
  toggleTextActive: { color: '#111827', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 12, minHeight: 44, backgroundColor: '#fff' },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  catBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#d1d5db', minHeight: 44, justifyContent: 'center' },
  catActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  catText: { fontSize: 13, color: '#374151' },
  catTextActive: { color: '#fff' },
  error: { fontSize: 13, color: '#ef4444', marginTop: 4 },
})
