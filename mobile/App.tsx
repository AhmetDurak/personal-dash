import { NavigationContainer } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { SWRConfig } from 'swr'
import { AppNavigator } from './src/navigation'
import { API_BASE } from './src/config'

async function fetcher(key: string) {
  const res = await fetch(`${API_BASE}${key}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SWRConfig value={{ fetcher, revalidateOnFocus: false }}>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </SWRConfig>
    </SafeAreaProvider>
  )
}
