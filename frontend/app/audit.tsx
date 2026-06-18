/**
 * Audit log — admin-only chronological action feed.
 */
import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { api } from '@/lib/api';
import { useRealtimeTick } from '@/contexts/RealtimeContext';
import { PaletteDark as C, FontFamily as F, Radius, Space, TextStyles } from '@/constants/visionTheme';
import { CommandBackground } from '@/components/CommandBackground';
import { SectionEyebrow, ScreenTitle, ScreenSub } from '@/components/vx';

interface Row {
  id: string;
  actor_email: string;
  action: string;
  resource_type: string;
  resource_id: string | number | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

export default function AuditScreen() {
  const tick = useRealtimeTick();
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ items: Row[]; total: number }>('/api/v1/audit?limit=50&offset=0');
      setItems(r.items);
      setTotal(r.total);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, tick]);

  return (
    <View style={styles.root} testID="audit-screen">
      <CommandBackground />
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.pad}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.primaryAccent} />}
        ItemSeparatorComponent={() => <View style={{ height: Space.sm }} />}
        ListHeaderComponent={
          <View>
            <SectionEyebrow>Compliance</SectionEyebrow>
            <ScreenTitle>Audit log</ScreenTitle>
            <ScreenSub>
              Chronological record of administrative actions.{' '}
              {total > 0 ? <Text style={styles.mono}>{total}</Text> : null}
              {total > 0 ? ' entries.' : ''}
            </ScreenSub>
            <View style={{ marginTop: Space.lg }} />
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row} testID={`audit-row-${item.id}`}>
            <MaterialCommunityIcons name="shield-check-outline" size={18} color={C.primaryAccent} />
            <View style={{ flex: 1, marginLeft: Space.md }}>
              <Text style={styles.action}>{item.action}</Text>
              <Text style={styles.meta}>
                {item.actor_email} · {item.resource_type}
                {item.resource_id != null ? ` #${item.resource_id}` : ''}
              </Text>
            </View>
            <Text style={styles.time}>{new Date(item.created_at).toLocaleString()}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>{loading ? 'Loading…' : 'No audit entries.'}</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  pad: { padding: Space.lg, paddingBottom: 100, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  mono: { fontFamily: F.mono, color: C.text },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: C.border, padding: Space.md,
  },
  action: { ...TextStyles.bodySmall, color: C.text, fontFamily: F.bodySemibold },
  meta: { ...TextStyles.caption, color: C.textMuted, fontFamily: F.mono, marginTop: 2 },
  time: { ...TextStyles.caption, color: C.textMuted, fontFamily: F.mono },
  empty: { ...TextStyles.body, color: C.textMuted, padding: Space.xxl, textAlign: 'center' },
});
