import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '@/lib/api';
import Colors, { Brand } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type Item = {
  id: number;
  camera_name: string | null;
  user_name: string | null;
  status: string;
  confidence: number;
  timestamp: string;
};

type ListRes = { items: Item[]; total: number };

export default function DetectionsScreen() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50', offset: '0' });
      if (q.trim()) params.set('q', q.trim());
      const r = await api<ListRes>(`/api/v1/detections?${params.toString()}`);
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

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <View style={[styles.toolbar, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <TextInput
          style={[styles.search, { color: palette.text, borderColor: palette.border }]}
          placeholder="Search camera, name, id…"
          placeholderTextColor={palette.textSecondary}
          value={q}
          onChangeText={setQ}
        />
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
        contentContainerStyle={styles.listPad}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: palette.textSecondary }]}>
            {loading ? 'Loading…' : 'No detections.'}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.title, { color: palette.text }]}>
              {item.user_name ?? 'Unknown'} · {(item.confidence * 100).toFixed(0)}%
            </Text>
            <Text style={[styles.meta, { color: palette.textSecondary }]}>
              {item.camera_name ?? 'Camera'} · {item.status}
            </Text>
            <Text style={styles.time}>{new Date(item.timestamp).toLocaleString()}</Text>
          </View>
        )}
      />
      <Text style={[styles.footer, { color: palette.textSecondary }]}>{total} total</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toolbar: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  search: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  listPad: { padding: 16, paddingBottom: 40, gap: 10 },
  card: { borderRadius: 12, borderWidth: 1, padding: 12 },
  title: { fontSize: 16, fontWeight: '600' },
  meta: { marginTop: 4, fontSize: 14 },
  time: { marginTop: 6, fontSize: 12, color: '#9CA3AF' },
  empty: { textAlign: 'center', marginTop: 40 },
  footer: { textAlign: 'center', paddingBottom: 12, fontSize: 12 },
});
