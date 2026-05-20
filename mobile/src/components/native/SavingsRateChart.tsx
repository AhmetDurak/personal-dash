import { View, Text, StyleSheet, useWindowDimensions } from 'react-native'
import { VictoryLine, VictoryChart, VictoryAxis, VictoryScatter } from 'victory-native'
import type { BarDataset } from '../../types'

interface Props { data: BarDataset }

export function SavingsRateChart({ data }: Props) {
  const { width } = useWindowDimensions()
  const W = width - 32

  const points = data.labels.map((x, i) => {
    const inc = data.income[i]
    const rate = inc > 0 ? ((inc - data.expenses[i]) / inc) * 100 : 0
    return { x, y: Math.round(rate * 10) / 10 }
  })

  const latest = points[points.length - 1]?.y ?? 0
  const avg = points.length ? Math.round(points.reduce((s, p) => s + p.y, 0) / points.length * 10) / 10 : 0

  return (
    <View style={s.card}>
      <Text style={s.title}>Savings Rate</Text>
      <View style={s.stats}>
        <View style={s.stat}>
          <Text style={s.statLabel}>This Month</Text>
          <Text style={[s.statValue, { color: latest >= 0 ? '#1D9E75' : '#EF4444' }]}>{latest.toFixed(1)}%</Text>
        </View>
        <View style={s.stat}>
          <Text style={s.statLabel}>Avg ({data.labels.length}m)</Text>
          <Text style={[s.statValue, { color: avg >= 0 ? '#1D9E75' : '#EF4444' }]}>{avg.toFixed(1)}%</Text>
        </View>
      </View>
      <VictoryChart width={W} height={160} padding={{ top: 12, bottom: 36, left: 44, right: 12 }}>
        <VictoryAxis style={{ tickLabels: { fontSize: 9, fill: '#9ca3af' } }} />
        <VictoryAxis dependentAxis
          style={{ tickLabels: { fontSize: 9, fill: '#9ca3af' }, grid: { stroke: '#f3f4f6' } }}
          tickFormat={v => `${v}%`}
        />
        <VictoryLine
          data={points}
          style={{ data: { stroke: '#2563eb', strokeWidth: 2.5 } }}
          interpolation="monotoneX"
        />
        <VictoryScatter
          data={points}
          size={4}
          style={{ data: { fill: ({ datum }: { datum: { y: number } }) => datum.y >= 0 ? '#1D9E75' : '#EF4444' } }}
        />
      </VictoryChart>
    </View>
  )
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', padding: 14 },
  title: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 10 },
  stats: { flexDirection: 'row', gap: 24, marginBottom: 4 },
  stat: { gap: 2 },
  statLabel: { fontSize: 11, color: '#9ca3af' },
  statValue: { fontSize: 15, fontWeight: '700' },
})
