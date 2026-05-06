import { FlatList, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import * as Haptics from 'expo-haptics'
import { formatEur, formatDate } from '../../utils/format'
import { CAT_COLORS, CAT_ICONS } from '../../constants/categories'
import type { Transaction } from '../../types'

interface Props { transactions: Transaction[]; onDelete: (id: string) => void }

export function TransactionList({ transactions, onDelete }: Props) {
  function handleDelete(tx: Transaction) {
    Alert.alert('Delete Entry', `Delete "${tx.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
          onDelete(tx.id)
        },
      },
    ])
  }

  return (
    <FlatList
      data={transactions}
      keyExtractor={tx => tx.id}
      renderItem={({ item: tx }) => (
        <TouchableOpacity
          style={s.row}
          onLongPress={tx.source === 'manual' ? () => handleDelete(tx) : undefined}
          activeOpacity={0.7}
        >
          <Text style={s.icon}>{CAT_ICONS[tx.category]}</Text>
          <View style={s.info}>
            <Text style={s.name} numberOfLines={1}>{tx.name}</Text>
            <Text style={s.meta}>
              {formatDate(tx.date)} · <Text style={{ color: CAT_COLORS[tx.category] }}>{tx.category}</Text>
            </Text>
          </View>
          <Text style={[s.amount, { color: tx.type === 'income' ? '#1D9E75' : '#374151' }]}>
            {tx.type === 'income' ? '+' : '-'}{formatEur(tx.amount)}
          </Text>
        </TouchableOpacity>
      )}
      ListEmptyComponent={<Text style={s.empty}>No transactions this month</Text>}
      contentContainerStyle={{ flexGrow: 1 }}
    />
  )
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', minHeight: 44 },
  icon: { fontSize: 22, width: 32 },
  info: { flex: 1, marginHorizontal: 10 },
  name: { fontSize: 14, fontWeight: '500', color: '#111827' },
  meta: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  amount: { fontSize: 14, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#9ca3af', fontSize: 14, paddingVertical: 40 },
})
