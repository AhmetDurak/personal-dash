import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useBalanceSeries, useCategoryDonut, useIncomeExpenseBar } from '../hooks/useChartData'
import { BalanceChart } from '../components/native/BalanceChart'
import { CategoryDonut } from '../components/native/CategoryDonut'
import { IncomeExpenseBar } from '../components/native/IncomeExpenseBar'
import { SavingsRateChart } from '../components/native/SavingsRateChart'
import { prevMonths, formatMonth } from '../utils/format'

interface Props { month: string }

function SectionHeader({ title }: { title: string }) {
  return <Text style={s.sectionHeader}>{title}</Text>
}

export function ChartsScreen({ month }: Props) {
  const months = prevMonths(6, month)
  const { data: series, isLoading: l1, mutate: r1 } = useBalanceSeries(months)
  const { data: donut, isLoading: l2, mutate: r2 } = useCategoryDonut(month)
  const { data: bar, isLoading: l3, mutate: r3 } = useIncomeExpenseBar(months)

  const isLoading = l1 || l2 || l3
  function refresh() { r1(); r2(); r3() }

  return (
    <SafeAreaView style={s.root} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.heading}>{formatMonth(month)}</Text>

        {isLoading && !series && !donut && !bar && (
          <Text style={s.loading}>Loading charts…</Text>
        )}

        {bar && (
          <>
            <SectionHeader title="Savings Rate — 6 months" />
            <SavingsRateChart data={bar} />
          </>
        )}

        {series && (
          <>
            <SectionHeader title="Balance Trend" />
            <BalanceChart data={series} />
          </>
        )}

        {bar && (
          <>
            <SectionHeader title="Income vs Expenses" />
            <IncomeExpenseBar data={bar} />
          </>
        )}

        {donut && (
          <>
            <SectionHeader title="This Month by Category" />
            <CategoryDonut data={donut} />
          </>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 32 },
  heading: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 16 },
  sectionHeader: { fontSize: 11, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 8 },
  loading: { color: '#9ca3af', fontSize: 14, textAlign: 'center', marginTop: 40 },
})
