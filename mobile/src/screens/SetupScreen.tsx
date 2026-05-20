import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthContext } from '../auth/AuthContext'
import { API_BASE } from '../config'

export function SetupScreen() {
  const { connect } = useAuthContext()
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleConnect() {
    const trimmed = token.trim()
    if (!trimmed) return
    setLoading(true)
    try {
      // Verify token works before saving
      const res = await fetch(`${API_BASE}/api/summary/${new Date().toISOString().slice(0, 7)}`, {
        headers: { Authorization: `Bearer ${trimmed}` },
      })
      if (!res.ok) {
        Alert.alert('Invalid token', 'Could not connect. Check the token and try again.')
        return
      }
      await connect(trimmed)
    } catch {
      Alert.alert('Connection failed', 'Make sure the server is reachable.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.inner}>
        {/* Logo */}
        <View style={s.logoRow}>
          <View style={s.logoGrid}>
            <View style={[s.tile, { backgroundColor: '#13B5EA' }]} />
            <View style={[s.tile, { backgroundColor: '#4B5563' }]} />
            <View style={[s.tile, { backgroundColor: '#4B5563' }]} />
            <View style={[s.tile, { backgroundColor: '#4B5563' }]} />
          </View>
          <Text style={s.brand}>Personal Dashboard</Text>
        </View>

        <View style={s.card}>
          <Text style={s.heading}>Connect Mobile App</Text>
          <Text style={s.sub}>
            Open the web app, click the 📱 icon next to your avatar, then paste the copied token below.
          </Text>

          <TextInput
            style={s.input}
            value={token}
            onChangeText={setToken}
            placeholder="Paste your mobile token…"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[s.btn, (!token.trim() || loading) && s.btnDisabled]}
            onPress={handleConnect}
            disabled={!token.trim() || loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Connect</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#030712' },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 40 },
  logoGrid: { width: 32, height: 32, flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  tile: { width: 14, height: 14, borderRadius: 3 },
  brand: { color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  card: { width: '100%', maxWidth: 360, backgroundColor: '#111827', borderWidth: 1, borderColor: '#1F2937', borderRadius: 20, padding: 24, gap: 16 },
  heading: { color: '#fff', fontSize: 18, fontWeight: '700' },
  sub: { color: '#9CA3AF', fontSize: 13, lineHeight: 20 },
  input: { borderWidth: 1, borderColor: '#374151', borderRadius: 12, padding: 12, color: '#fff', fontSize: 13, backgroundColor: '#1F2937', minHeight: 80, textAlignVertical: 'top' },
  btn: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
