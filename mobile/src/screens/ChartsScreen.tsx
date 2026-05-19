import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useBalanceSeries, useCategoryDonut, useIncomeExpenseBar } from '../hooks/useChartData'
import { BalanceChart } from '../components/native/BalanceChart'
import { CategoryDonut } from '../components/native/CategoryDonut'
import { IncomeExpenseBar } from '../components/native/IncomeExpenseBar'
import { prevMonths, formatMonth } from '../utils/format'

interface Props { month: string }

export function ChartsScreen({ month }: Props) {
  const months = prevMonths(6, month)
  const { data: series, isLoading: l1, mutate: r1 } = useBalanceSeries(months)
  const { data: donut, isLoading: l2, mutate: r2 } = useCategoryDonut(month)
  const { data: bar, isLoading: l3, mutate: r3 } = useIncomeExpenseBar(months)

  const isLoading = l1 || l2 || l3
  function refresh() { r1(); r2(); r3() }

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} />}
      >
        <Text style={s.heading}>{formatMonth(month)}</Text>
        {series && <BalanceChart data={series} />}
        {donut && <View style={{ marginTop: 12 }}><CategoryDonut data={donut} /></View>}
        {bar && <View style={{ marginTop: 12 }}><IncomeExpenseBar data={bar} /></View>}
        {isLoading && !series && !donut && !bar && (
          <Text style={s.loading}>Loading charts…</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  heading: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 4 },
  loading: { color: '#9ca3af', fontSize: 14, textAlign: 'center', marginTop: 40 },
})
