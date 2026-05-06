import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { VictoryLine, VictoryChart, VictoryAxis, VictoryLegend } from 'victory-native'
import type { BalanceSeries } from '../../types'

interface Props { data: BalanceSeries }

const W = Dimensions.get('window').width - 32

export function BalanceChart({ data }: Props) {
  const balance = data.labels.map((x, i) => ({ x, y: data.balance[i] }))
  const investments = data.labels.map((x, i) => ({ x, y: data.investmentsYTD[i] }))

  return (
    <View style={s.card}>
      <Text style={s.title}>Balance Trend</Text>
      <VictoryChart width={W} height={200} padding={{ top: 10, bottom: 40, left: 50, right: 10 }}>
        <VictoryAxis style={{ tickLabels: { fontSize: 10 } }} />
        <VictoryAxis dependentAxis style={{ tickLabels: { fontSize: 10 } }} tickFormat={v => `${v}€`} />
        <VictoryLine data={balance} style={{ data: { stroke: '#1D9E75', strokeWidth: 2 } }} />
        <VictoryLine data={investments} style={{ data: { stroke: '#534AB7', strokeWidth: 2 } }} />
      </VictoryChart>
      <VictoryLegend
        x={0} y={0} width={W} height={24}
        orientation="horizontal"
        data={[{ name: 'Balance', symbol: { fill: '#1D9E75' } }, { name: 'Invest. YTD', symbol: { fill: '#534AB7' } }]}
        style={{ labels: { fontSize: 11 } }}
      />
    </View>
  )
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 12 },
  title: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 4 },
})
