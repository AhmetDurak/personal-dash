import { View, Text, StyleSheet, useWindowDimensions } from 'react-native'
import { VictoryPie } from 'victory-native'
import { formatEur } from '../../utils/format'
import type { DonutDataset } from '../../types'

interface Props { data: DonutDataset }

export function CategoryDonut({ data }: Props) {
  const { width } = useWindowDimensions()
  const W = width - 32
  const chartData = data.labels.map((label, i) => ({ x: label, y: data.values[i] }))
  const totalCents = Math.round(data.values.reduce((s, v) => s + v, 0) * 100)

  return (
    <View style={s.card}>
      <Text style={s.title}>Expenses by Category</Text>
      <View style={s.chartWrapper}>
        <VictoryPie
          data={chartData}
          width={W} height={200}
          innerRadius={60}
          colorScale={data.colors}
          labels={() => ''}
          padding={8}
        />
        <View style={s.center}>
          <Text style={s.centerLabel}>Total</Text>
          <Text style={s.centerValue}>{formatEur(totalCents)}</Text>
        </View>
      </View>
      <View style={s.legend}>
        {data.labels.map((label, i) => (
          <View key={label} style={s.legendRow}>
            <View style={s.legendLeft}>
              <View style={[s.dot, { backgroundColor: data.colors[i] }]} />
              <Text style={s.legendLabel} numberOfLines={1}>{label}</Text>
            </View>
            <Text style={s.legendValue}>{formatEur(Math.round(data.values[i] * 100))}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', padding: 14 },
  title: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 4 },
  chartWrapper: { alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center' },
  centerLabel: { fontSize: 11, color: '#9ca3af' },
  centerValue: { fontSize: 14, fontWeight: '700', color: '#111827' },
  legend: { gap: 8, paddingTop: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  legendLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  dot: { width: 9, height: 9, borderRadius: 4.5, flexShrink: 0 },
  legendLabel: { fontSize: 12, color: '#374151', flex: 1 },
  legendValue: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
})
