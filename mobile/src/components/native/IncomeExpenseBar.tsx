import { View, Text, StyleSheet, useWindowDimensions } from 'react-native'
import { VictoryBar, VictoryChart, VictoryAxis, VictoryGroup } from 'victory-native'
import { formatEurCompact } from '../../utils/format'
import type { BarDataset } from '../../types'

interface Props { data: BarDataset }

export function IncomeExpenseBar({ data }: Props) {
  const { width } = useWindowDimensions()
  const W = width - 32

  const income = data.labels.map((x, i) => ({ x, y: data.income[i] }))
  const expenses = data.labels.map((x, i) => ({ x, y: data.expenses[i] }))

  return (
    <View style={s.card}>
      <Text style={s.title}>Income vs Expenses</Text>
      <View style={s.legend}>
        <View style={s.legendItem}><View style={[s.dot, { backgroundColor: '#1D9E75' }]} /><Text style={s.legendText}>Income</Text></View>
        <View style={s.legendItem}><View style={[s.dot, { backgroundColor: '#D85A30' }]} /><Text style={s.legendText}>Expenses</Text></View>
      </View>
      <VictoryChart width={W} height={190} padding={{ top: 8, bottom: 36, left: 58, right: 10 }}>
        <VictoryAxis style={{ tickLabels: { fontSize: 9, fill: '#9ca3af' } }} />
        <VictoryAxis dependentAxis
          style={{ tickLabels: { fontSize: 9, fill: '#9ca3af' } }}
          tickFormat={v => formatEurCompact(v)}
        />
        <VictoryGroup offset={10}>
          <VictoryBar data={income}
            style={{ data: { fill: '#1D9E75', borderRadius: 2 } }}
            barWidth={8}
          />
          <VictoryBar data={expenses}
            style={{ data: { fill: '#D85A30', borderRadius: 2 } }}
            barWidth={8}
          />
        </VictoryGroup>
      </VictoryChart>
    </View>
  )
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', padding: 14 },
  title: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 8 },
  legend: { flexDirection: 'row', gap: 16, marginBottom: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#6b7280' },
})
