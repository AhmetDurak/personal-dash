import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useSWRConfig } from 'swr'
import { useTransactions } from '../hooks/useTransactions'
import { TransactionList } from '../components/native/TransactionList'
import { AddEntryModal } from '../components/native/AddEntryModal'
import { formatMonth } from '../utils/format'

interface Props { month: string }

export function TransactionsScreen({ month }: Props) {
  const [modal, setModal] = useState(false)
  const { mutate } = useSWRConfig()
  const { data: transactions, isLoading, mutate: mutateList } = useTransactions(month)

  function onSaved() { mutateList() }
  function onDeleted() { mutate(`/api/summary/${month}`); mutateList() }

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      <View style={s.header}>
        <Text style={s.heading}>{formatMonth(month)}</Text>
        <Text style={s.count}>{transactions ? `${transactions.length} entries` : ''}</Text>
      </View>
      <TransactionList
        data={transactions ?? []}
        isLoading={isLoading}
        onDeleted={onDeleted}
      />
      <TouchableOpacity style={s.fab} onPress={() => setModal(true)} activeOpacity={0.8}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>
      <AddEntryModal month={month} visible={modal} onClose={() => setModal(false)} onSaved={onSaved} />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  heading: { fontSize: 18, fontWeight: '600', color: '#111827' },
  count: { fontSize: 13, color: '#9ca3af' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 52, height: 52, borderRadius: 26, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, elevation: 6 },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
})
