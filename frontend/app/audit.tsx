import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { useStitchTheme } from '@/hooks/useStitchTheme';
import { Stitch, FontFamily } from '@/constants/stitchTheme';
import { useRealtimeTick } from '@/contexts/RealtimeContext';
import { stitchStyles } from '@/styles/stitchStyles';

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
  const realtimeTick = useRealtimeTick();
  const router = useRouter();
  const T = useStitchTheme();
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
  }, [load, realtimeTick]);

  const listHeader = (
    <View>
      <View style={styles.hero}>
        <Text style={[stitchStyles.screenEyebrow, { color: T.accent }]}>Compliance</Text>
        <Text style={[stitchStyles.liveScreenTitle, { fontSize: 22, color: T.text }]}>Activity log</Text>
        <Text style={[stitchStyles.heroSub, { color: T.textMuted, marginTop: 6 }]}>
          Chronological record of administrative actions. {total > 0 ? `${total} entries.` : ''}
        </Text>
        {error ? <Text style={[styles.err, { color: Stitch.error, marginTop: 8 }]}>{error}</Text> : null}
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={listHeader}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
        contentContainerStyle={[styles.listPad, { paddingBottom: 24 }]}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: T.textMuted }]}>
            {loading ? 'Loading…' : error ? '' : 'No audit entries.'}
          </Text>
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
            <Text style={[styles.action, { color: T.text, fontFamily: T.FontFamily.labelSemibold }]}>{item.action}</Text>
            <Text style={[styles.actor, { color: T.textMuted }]}>{item.actor_email}</Text>
            <Text style={[styles.res, { color: T.textMuted }]}>
              {item.resource_type}
              {item.resource_id != null ? ` #${item.resource_id}` : ''}
            </Text>
            <Text style={[styles.time, { color: T.textMuted }]}>{new Date(item.created_at).toLocaleString()}</Text>
          </View>
        )}
        ListFooterComponent={
          total > 0 ? (
            <Text style={[styles.footer, { color: T.textMuted }]}>{total} total</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Stitch.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: { marginBottom: 12 },
  err: { fontSize: 13 },
  listPad: { padding: 16, gap: 10 },
  card: { borderRadius: 14, padding: 12 },
  action: { fontSize: 15 },
  actor: { marginTop: 4, fontSize: 13 },
  res: { marginTop: 2, fontSize: 13 },
  time: { marginTop: 8, fontSize: 12 },
  empty: { textAlign: 'center', marginTop: 40 },
  footer: { textAlign: 'center', paddingBottom: 12, fontSize: 12 },
});
