import { View, Text, StyleSheet, useWindowDimensions } from 'react-native'
import { VictoryLine, VictoryChart, VictoryAxis } from 'victory-native'
import { formatEur, formatEurCompact } from '../../utils/format'
import type { BalanceSeries } from '../../types'

interface Props { data: BalanceSeries }

export function BalanceChart({ data }: Props) {
  const { width } = useWindowDimensions()
  const W = width - 32

  const balance = data.labels.map((x, i) => ({ x, y: data.balance[i] }))
  const investments = data.labels.map((x, i) => ({ x, y: data.investmentsYTD[i] }))

  const latest = data.balance[data.balance.length - 1] ?? 0
  const investYTD = data.investmentsYTD[data.investmentsYTD.length - 1] ?? 0

  return (
    <View style={s.card}>
      <Text style={s.title}>Balance Trend</Text>
      <View style={s.stats}>
        <View style={s.stat}>
          <Text style={s.statLabel}>Current</Text>
          <Text style={[s.statValue, { color: latest >= 0 ? '#1D9E75' : '#EF4444' }]}>{formatEur(latest)}</Text>
        </View>
        <View style={s.stat}>
          <Text style={s.statLabel}>Invest. YTD</Text>
          <Text style={[s.statValue, { color: '#534AB7' }]}>{formatEur(investYTD)}</Text>
        </View>
      </View>
      <VictoryChart width={W} height={180} padding={{ top: 8, bottom: 36, left: 60, right: 12 }}>
        <VictoryAxis style={{ tickLabels: { fontSize: 9, fill: '#9ca3af' } }} />
        <VictoryAxis dependentAxis
          style={{ tickLabels: { fontSize: 9, fill: '#9ca3af' } }}
          tickFormat={v => formatEurCompact(v)}
        />
        <VictoryLine data={balance}
          style={{ data: { stroke: '#1D9E75', strokeWidth: 2.5 } }}
          interpolation="monotoneX"
        />
        <VictoryLine data={investments}
          style={{ data: { stroke: '#534AB7', strokeWidth: 2, strokeDasharray: '4,3' } }}
          interpolation="monotoneX"
        />
      </VictoryChart>
      <View style={s.legend}>
        <View style={s.legendItem}><View style={[s.dot, { backgroundColor: '#1D9E75' }]} /><Text style={s.legendText}>Balance</Text></View>
        <View style={s.legendItem}><View style={[s.dot, { backgroundColor: '#534AB7' }]} /><Text style={s.legendText}>Invest. YTD</Text></View>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', padding: 14 },
  title: { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 10 },
  stats: { flexDirection: 'row', gap: 20, marginBottom: 4 },
  stat: { gap: 2 },
  statLabel: { fontSize: 11, color: '#9ca3af' },
  statValue: { fontSize: 15, fontWeight: '700' },
  legend: { flexDirection: 'row', gap: 16, paddingTop: 6, paddingHorizontal: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#6b7280' },
})
