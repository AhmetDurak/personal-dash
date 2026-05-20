import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthContext } from '../auth/AuthContext'

export function ProfileScreen() {
  const { disconnect } = useAuthContext()

  function handleDisconnect() {
    Alert.alert(
      'Disconnect',
      'Remove this device\'s access to your dashboard?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: disconnect },
      ]
    )
  }

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.content}>
        <Text style={s.heading}>Profile</Text>

        <View style={s.section}>
          <TouchableOpacity style={s.row} onPress={handleDisconnect}>
            <Text style={s.rowLabel}>Disconnect mobile</Text>
            <Text style={s.rowMeta}>Removes saved token</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flex: 1, padding: 20 },
  heading: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 24 },
  section: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  row: { padding: 16, gap: 2 },
  rowLabel: { fontSize: 15, color: '#EF4444', fontWeight: '600' },
  rowMeta: { fontSize: 12, color: '#9CA3AF' },
})
