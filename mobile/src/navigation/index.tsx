import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text } from 'react-native'
import { OverviewScreen } from '../screens/OverviewScreen'
import { TransactionsScreen } from '../screens/TransactionsScreen'
import { ChartsScreen } from '../screens/ChartsScreen'
import { currentMonth } from '../utils/format'

const Tab = createBottomTabNavigator()
const MONTH = currentMonth()

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = { Overview: '⊡', Transactions: '≡', Charts: '∿' }
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>
      {icons[label] ?? '●'}
    </Text>
  )
}

export function AppNavigator() {
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
        {() => <OverviewScreen month={MONTH} />}
      </Tab.Screen>
      <Tab.Screen name="Transactions">
        {() => <TransactionsScreen month={MONTH} />}
      </Tab.Screen>
      <Tab.Screen name="Charts">
        {() => <ChartsScreen month={MONTH} />}
      </Tab.Screen>
    </Tab.Navigator>
  )
}
