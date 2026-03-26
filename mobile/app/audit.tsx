import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { api } from '@/lib/api';
import Colors, { Brand } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type Row = {
  id: number;
  actor_email: string;
  action: string;
  resource_type: string;
  resource_id: number | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

type ListRes = { items: Row[]; total: number };

export default function AuditScreen() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const r = await api<ListRes>('/api/v1/audit?limit=50&offset=0');
      setItems(r.items);
      setTotal(r.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
        contentContainerStyle={styles.listPad}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: palette.textSecondary }]}>
            {loading ? 'Loading…' : error ? '' : 'No audit entries.'}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.action, { color: palette.text }]}>{item.action}</Text>
            <Text style={[styles.actor, { color: palette.textSecondary }]}>{item.actor_email}</Text>
            <Text style={[styles.res, { color: palette.textSecondary }]}>
              {item.resource_type}
              {item.resource_id != null ? ` #${item.resource_id}` : ''}
            </Text>
            <Text style={styles.time}>{new Date(item.created_at).toLocaleString()}</Text>
          </View>
        )}
      />
      <Text style={[styles.footer, { color: palette.textSecondary }]}>{total} total</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  err: { color: Brand.danger, padding: 16 },
  listPad: { padding: 16, paddingBottom: 40, gap: 10 },
  card: { borderRadius: 12, borderWidth: 1, padding: 12 },
  action: { fontWeight: '700', fontSize: 15 },
  actor: { marginTop: 4, fontSize: 13 },
  res: { marginTop: 2, fontSize: 13 },
  time: { marginTop: 8, fontSize: 12, color: '#9CA3AF' },
  empty: { textAlign: 'center', marginTop: 40 },
  footer: { textAlign: 'center', paddingBottom: 12, fontSize: 12 },
});
