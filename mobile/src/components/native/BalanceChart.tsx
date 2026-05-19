import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { VictoryLine, VictoryChart, VictoryAxis } from 'victory-native'
import type { BalanceSeries } from '../../types'

interface Props { data: BalanceSeries }

const W = Dimensions.get('window').width - 32

export function BalanceChart({ data }: Props) {
  const balance = data.labels.map((x, i) => ({ x, y: data.balance[i] }))
  const investments = data.labels.map((x, i) => ({ x, y: data.investmentsYTD[i] }))

  return (
    <View style={s.card}>
      <Text style={s.title}>Balance Trend</Text>
      <VictoryChart width={W} height={200} padding={{ top: 10, bottom: 36, left: 58, right: 12 }}>
        <VictoryAxis style={{ tickLabels: { fontSize: 9 } }} />
        <VictoryAxis dependentAxis style={{ tickLabels: { fontSize: 9 } }} tickFormat={v => `${v}€`} />
        <VictoryLine data={balance} style={{ data: { stroke: '#1D9E75', strokeWidth: 2 } }} />
        <VictoryLine data={investments} style={{ data: { stroke: '#534AB7', strokeWidth: 2 } }} />
      </VictoryChart>
      <View style={s.legend}>
        <View style={s.legendItem}><View style={[s.dot, { backgroundColor: '#1D9E75' }]} /><Text style={s.legendText}>Balance</Text></View>
        <View style={s.legendItem}><View style={[s.dot, { backgroundColor: '#534AB7' }]} /><Text style={s.legendText}>Invest. YTD</Text></View>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 12 },
  title: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 4 },
  legend: { flexDirection: 'row', gap: 16, paddingTop: 4, paddingHorizontal: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#6b7280' },
})
