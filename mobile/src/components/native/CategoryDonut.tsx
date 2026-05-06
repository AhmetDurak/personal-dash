import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { VictoryPie, VictoryLegend } from 'victory-native'
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
        width={W} height={220}
        innerRadius={60}
        colorScale={data.colors}
        labels={({ datum }) => formatEur(Math.round(datum.y * 100))}
        style={{ labels: { fontSize: 9 } }}
      />
      <VictoryLegend
        x={0} y={0} width={W} height={24}
        orientation="horizontal"
        data={data.labels.map((name, i) => ({ name, symbol: { fill: data.colors[i] } }))}
        style={{ labels: { fontSize: 10 } }}
      />
    </View>
  )
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 12 },
  title: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 4 },
})
