import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '@/lib/api';
import { Stitch } from '@/constants/stitchTheme';
import { useStitchTheme } from '@/hooks/useStitchTheme';
import { useRealtimeTick } from '@/contexts/RealtimeContext';
import { stitchStyles } from '@/styles/stitchStyles';

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
  const realtimeTick = useRealtimeTick();
  const T = useStitchTheme();
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
  }, [q, load, realtimeTick]);

  const header = (
    <View style={styles.hero}>
      <Text style={[stitchStyles.screenEyebrow, { color: T.accent }]}>Forensics</Text>
      <Text style={[stitchStyles.liveScreenTitle, { color: T.text }]}>Detection Intelligence</Text>
      <Text style={[stitchStyles.heroSub, { color: T.textMuted, marginTop: 8 }]}>
        Face detections across your grid — search by camera, name, or id.
      </Text>
      <View
        style={[
          styles.toolbar,
          {
            backgroundColor: T.cardMid,
            marginTop: 16,
            borderRadius: 12,
            borderWidth: T.isDark ? 0 : StyleSheet.hairlineWidth,
            borderColor: T.borderHair,
          },
        ]}
      >
        <TextInput
          style={[
            styles.search,
            {
              color: T.text,
              backgroundColor: T.isDark ? Stitch.surfaceContainerLowest : T.card,
            },
          ]}
          placeholder="Search camera, name, id…"
          placeholderTextColor={T.textMuted}
          value={q}
          onChangeText={setQ}
        />
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
        contentContainerStyle={[styles.listPad, { paddingBottom: 32 }]}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: T.textMuted }]}>{loading ? 'Loading…' : 'No detections.'}</Text>
        }
        ListFooterComponent={
          <Text style={[styles.footer, { color: T.textMuted }]}>{total} total</Text>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              {
                backgroundColor: T.card,
                borderColor: T.borderHair,
                borderWidth: T.isDark ? 0 : StyleSheet.hairlineWidth,
              },
            ]}
          >
            <Text style={[styles.title, { color: T.text, fontFamily: T.FontFamily.labelSemibold }]}>
              {item.user_name ?? 'Unknown'} · {(item.confidence * 100).toFixed(0)}%
            </Text>
            <Text style={[styles.meta, { color: T.textMuted }]}>
              {item.camera_name ?? 'Camera'} · {item.status}
            </Text>
            <Text style={[styles.time, { color: T.textMuted }]}>{new Date(item.timestamp).toLocaleString()}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { marginBottom: 4 },
  toolbar: { overflow: 'hidden' },
  search: {
    borderWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  listPad: { padding: 16, gap: 10 },
  card: { borderRadius: 14, padding: 12 },
  title: { fontSize: 16 },
  meta: { marginTop: 4, fontSize: 14 },
  time: { marginTop: 6, fontSize: 12 },
  empty: { textAlign: 'center', marginTop: 40 },
  footer: { textAlign: 'center', marginTop: 16, fontSize: 12 },
});
