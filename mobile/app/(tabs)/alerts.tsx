import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { api } from '@/lib/api';
import Colors, { Brand } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type AlertItem = {
  id: number;
  alert_type: string;
  message: string;
  severity: string;
  is_read: boolean;
  timestamp: string;
};

type ListRes = { items: AlertItem[]; total: number };

export default function AlertsScreen() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];
  const [items, setItems] = useState<AlertItem[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50', offset: '0' });
      if (q.trim()) params.set('q', q.trim());
      const r = await api<ListRes>(`/api/v1/alerts?${params.toString()}`);
      setItems(r.items);
      setTotal(r.total);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    const delay = q ? 350 : 0;
    const t = setTimeout(() => void load(), delay);
    return () => clearTimeout(t);
  }, [q, load]);

  const markRead = async (id: number) => {
    setBusy(true);
    try {
      await api(`/api/v1/alerts/${id}/read`, { method: 'PATCH' });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const markAllRead = async () => {
    setBusy(true);
    try {
      await api('/api/v1/alerts/mark-all-read', { method: 'POST' });
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <View style={[styles.toolbar, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <TextInput
          style={[styles.search, { color: palette.text, borderColor: palette.border }]}
          placeholder="Search…"
          placeholderTextColor={palette.textSecondary}
          value={q}
          onChangeText={setQ}
        />
        <Pressable style={styles.markAll} onPress={() => void markAllRead()} disabled={busy}>
          {busy ? (
            <ActivityIndicator size="small" color={Brand.primary} />
          ) : (
            <Text style={{ color: Brand.primary, fontWeight: '600' }}>Mark all read</Text>
          )}
        </Pressable>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
        contentContainerStyle={styles.listPad}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: palette.textSecondary }]}>
            {loading ? 'Loading…' : 'No alerts.'}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}
            onPress={() => !item.is_read && void markRead(item.id)}
          >
            <View style={styles.rowTop}>
              <Text style={[styles.type, { color: palette.text }]}>{item.alert_type}</Text>
              {!item.is_read ? <View style={styles.dot} /> : null}
            </View>
            <Text style={[styles.msg, { color: palette.textSecondary }]}>{item.message}</Text>
            <Text style={styles.time}>{new Date(item.timestamp).toLocaleString()}</Text>
          </Pressable>
        )}
      />
      <Text style={[styles.footer, { color: palette.textSecondary }]}>{total} total</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
  },
  search: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  markAll: { padding: 8 },
  listPad: { padding: 16, paddingBottom: 40, gap: 10 },
  card: { borderRadius: 12, borderWidth: 1, padding: 12 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  type: { fontWeight: '700', fontSize: 15 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Brand.primary,
  },
  msg: { marginTop: 6, fontSize: 14 },
  time: { marginTop: 8, fontSize: 12, color: '#9CA3AF' },
  empty: { textAlign: 'center', marginTop: 40 },
  footer: { textAlign: 'center', paddingBottom: 12, fontSize: 12 },
});
