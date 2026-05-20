import { NavigationContainer } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { SWRConfig } from 'swr'
import { View } from 'react-native'
import { AuthProvider, useAuthContext } from './src/auth/AuthContext'
import { AppNavigator } from './src/navigation'
import { SetupScreen } from './src/screens/SetupScreen'
import { API_BASE } from './src/config'

function AppContent() {
  const { token, isLoading } = useAuthContext()

  if (isLoading) return <View style={{ flex: 1, backgroundColor: '#030712' }} />
  if (!token)    return <SetupScreen />

  function fetcher(key: string) {
    return fetch(`${API_BASE}${key}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json()
    })
  }

  return (
    <SWRConfig value={{ fetcher, revalidateOnFocus: false }}>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </SWRConfig>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  )
}
