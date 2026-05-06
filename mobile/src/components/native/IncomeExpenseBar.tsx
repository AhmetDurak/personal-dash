import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { VictoryBar, VictoryChart, VictoryAxis, VictoryGroup, VictoryLegend } from 'victory-native'
import type { BarDataset } from '../../types'

interface Props { data: BarDataset }

const W = Dimensions.get('window').width - 32

export function IncomeExpenseBar({ data }: Props) {
  const income = data.labels.map((x, i) => ({ x, y: data.income[i] }))
  const expenses = data.labels.map((x, i) => ({ x, y: data.expenses[i] }))

  return (
    <View style={s.card}>
      <Text style={s.title}>Income vs Expenses</Text>
      <VictoryChart width={W} height={200} padding={{ top: 10, bottom: 40, left: 50, right: 10 }}>
        <VictoryAxis style={{ tickLabels: { fontSize: 10 } }} />
        <VictoryAxis dependentAxis style={{ tickLabels: { fontSize: 10 } }} tickFormat={v => `${v}€`} />
        <VictoryGroup offset={12}>
          <VictoryBar data={income} style={{ data: { fill: '#1D9E75' } }} />
          <VictoryBar data={expenses} style={{ data: { fill: '#D85A30' } }} />
        </VictoryGroup>
      </VictoryChart>
      <VictoryLegend
        x={0} y={0} width={W} height={24}
        orientation="horizontal"
        data={[{ name: 'Income', symbol: { fill: '#1D9E75' } }, { name: 'Expenses', symbol: { fill: '#D85A30' } }]}
        style={{ labels: { fontSize: 11 } }}
      />
    </View>
  )
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 12 },
  title: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 4 },
})
