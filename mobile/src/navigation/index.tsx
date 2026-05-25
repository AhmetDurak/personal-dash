import { useState } from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text, View, TouchableOpacity, StyleSheet } from 'react-native'
import { OverviewScreen } from '../screens/OverviewScreen'
import { TransactionsScreen } from '../screens/TransactionsScreen'
import { ChartsScreen } from '../screens/ChartsScreen'
import { ProfileScreen } from '../screens/ProfileScreen'
import { SportScreen } from '../screens/SportScreen'
import { LogScreen } from '../screens/LogScreen'
import { currentMonth, prevMonth, nextMonth, formatMonth } from '../utils/format'

const Tab = createBottomTabNavigator()

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = { Overview: '⊡', Transactions: '≡', Charts: '∿', Log: '📓', Sport: '💪', Profile: '◉' }
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>
      {icons[label] ?? '●'}
    </Text>
  )
}

function MonthHeader({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  return (
    <View style={s.monthBar}>
      <TouchableOpacity onPress={() => onChange(prevMonth(month))} style={s.arrow}>
        <Text style={s.arrowText}>‹</Text>
      </TouchableOpacity>
      <Text style={s.monthLabel}>{formatMonth(month)}</Text>
      <TouchableOpacity
        onPress={() => onChange(nextMonth(month))}
        style={s.arrow}
        disabled={month >= currentMonth()}
      >
        <Text style={[s.arrowText, month >= currentMonth() && s.arrowDisabled]}>›</Text>
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  arrow: { padding: 8 },
  arrowText: { fontSize: 22, color: '#374151', lineHeight: 26 },
  arrowDisabled: { color: '#D1D5DB' },
  monthLabel: { fontSize: 15, fontWeight: '600', color: '#111827', minWidth: 110, textAlign: 'center' },
})

export function AppNavigator() {
  const [month, setMonth] = useState(currentMonth())

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { borderTopColor: '#e5e7eb' },
        tabBarLabelStyle: { fontSize: 11 },
      })}
    >
      <Tab.Screen name="Overview">
        {() => (
          <>
            <MonthHeader month={month} onChange={setMonth} />
            <OverviewScreen month={month} />
          </>
        )}
      </Tab.Screen>
      <Tab.Screen name="Transactions">
        {() => (
          <>
            <MonthHeader month={month} onChange={setMonth} />
            <TransactionsScreen month={month} />
          </>
        )}
      </Tab.Screen>
      <Tab.Screen name="Charts">
        {() => (
          <>
            <MonthHeader month={month} onChange={setMonth} />
            <ChartsScreen month={month} />
          </>
        )}
      </Tab.Screen>
      <Tab.Screen name="Log" component={LogScreen} />
      <Tab.Screen name="Sport" component={SportScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}
