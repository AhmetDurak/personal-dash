import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { VictoryPie } from 'victory-native'
import { formatEur } from '../../utils/format'
import type { DonutDataset } from '../../types'

interface Props { data: DonutDataset }

const W = Dimensions.get('window').width - 32

export function CategoryDonut({ data }: Props) {
  const chartData = data.labels.map((label, i) => ({ x: label, y: data.values[i] }))

  return (
    <View style={s.card}>
      <Text style={s.title}>Expenses by Category</Text>
      <VictoryPie
        data={chartData}
        width={W} height={200}
        innerRadius={55}
        colorScale={data.colors}
        labels={() => ''}
        padding={8}
      />
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
  card: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 12 },
  title: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 4 },
  legend: { gap: 6, paddingTop: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  legendLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  legendLabel: { fontSize: 12, color: '#374151', flex: 1 },
  legendValue: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
})
