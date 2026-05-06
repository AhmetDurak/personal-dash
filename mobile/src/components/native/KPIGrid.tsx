import { View, Text, StyleSheet } from 'react-native'
import { formatEur } from '../../utils/format'
import type { MonthSummary } from '../../types'

interface Props { summary: MonthSummary }

export function KPIGrid({ summary }: Props) {
  const cards = [
    { label: 'Income', value: formatEur(summary.income), color: '#1D9E75' },
    { label: 'Expenses', value: formatEur(summary.totalExpenses), color: '#D85A30' },
    { label: 'Net', value: formatEur(summary.net), color: summary.net >= 0 ? '#1D9E75' : '#D85A30' },
    { label: 'Balance', value: formatEur(summary.endBalance), color: '#111' },
    { label: 'Investments', value: formatEur(summary.byCategory.Investment ?? 0), color: '#534AB7' },
    { label: 'YTD Invest.', value: formatEur(summary.investmentsYTD), color: '#7B72D4' },
  ]

  return (
    <View style={s.grid}>
      {cards.map(c => (
        <View key={c.label} style={s.card}>
          <Text style={s.label}>{c.label}</Text>
          <Text style={[s.value, { color: c.color }]}>{c.value}</Text>
        </View>
      ))}
    </View>
  )
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, width: '47%' },
  label: { fontSize: 11, color: '#6b7280', marginBottom: 2 },
  value: { fontSize: 15, fontWeight: '600' },
})
