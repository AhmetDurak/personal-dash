import { useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useSWRConfig } from 'swr'
import { useSummary } from '../hooks/useSummary'
import { useBalanceSeries } from '../hooks/useChartData'
import { prevMonths, formatMonth } from '../utils/format'
import { KPIGrid } from '../components/native/KPIGrid'
import { BalanceChart } from '../components/native/BalanceChart'
import { AddEntryModal } from '../components/native/AddEntryModal'

interface Props { month: string }

export function OverviewScreen({ month }: Props) {
  const [modal, setModal] = useState(false)
  const { mutate } = useSWRConfig()
  const { data: summary, isLoading, mutate: mutateSummary } = useSummary(month)
  const { data: series } = useBalanceSeries(prevMonths(6, month))

  function onSaved() { mutateSummary() }

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => mutate(`/api/summary/${month}`)} />}
      >
        <Text style={s.heading}>{formatMonth(month)}</Text>
        {summary ? (
          <>
            <KPIGrid summary={summary} />
            {series && <View style={{ marginTop: 12 }}><BalanceChart data={series} /></View>}
          </>
        ) : (
          <Text style={s.loading}>Loading…</Text>
        )}
      </ScrollView>
      <TouchableOpacity style={s.fab} onPress={() => setModal(true)} activeOpacity={0.8}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>
      <AddEntryModal month={month} visible={modal} onClose={() => setModal(false)} onSaved={onSaved} />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, gap: 12 },
  heading: { fontSize: 18, fontWeight: '600', color: '#111827' },
  loading: { color: '#9ca3af', fontSize: 14, textAlign: 'center', marginTop: 40 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 52, height: 52, borderRadius: 26, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, elevation: 6 },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
})
