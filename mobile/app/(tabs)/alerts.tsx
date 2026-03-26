import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { Stitch, FontFamily } from '@/constants/stitchTheme';
import { useStitchTheme } from '@/hooks/useStitchTheme';
import { useRealtimeTick } from '@/contexts/RealtimeContext';
import { stitchStyles } from '@/styles/stitchStyles';

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
  const realtimeTick = useRealtimeTick();
  const T = useStitchTheme();
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
  }, [q, load, realtimeTick]);

  const unread = useMemo(() => items.filter((i) => !i.is_read).length, [items]);

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

  const header = (
    <View style={styles.hero}>
      <Text style={[stitchStyles.heroEyebrow, { color: T.accent, fontSize: 12, letterSpacing: 1.6 }]}>
        System Monitoring
      </Text>
      <Text style={[stitchStyles.alertsHero, { color: T.text }]}>Security Alerts</Text>
      <View style={styles.statRow}>
        <View>
          <Text style={[styles.statLbl, { color: Stitch.outline }]}>Unread</Text>
          <Text style={[styles.statNum, { color: Stitch.secondary }]}>{unread.toString().padStart(2, '0')}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: `${Stitch.outlineVariant}44` }]} />
        <View>
          <Text style={[styles.statLbl, { color: Stitch.outline }]}>Total</Text>
          <Text style={[styles.statNum, { color: T.text }]}>{total.toString()}</Text>
        </View>
        <Pressable
          style={[styles.markBtn, { backgroundColor: Stitch.primaryContainer }]}
          onPress={() => void markAllRead()}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator size="small" color={Stitch.onPrimaryContainer} />
          ) : (
            <>
              <MaterialCommunityIcons name="check-all" size={18} color={Stitch.onPrimaryContainer} />
              <Text style={styles.markBtnText}>Mark all read</Text>
            </>
          )}
        </Pressable>
      </View>
      <View style={styles.chips}>
        <View style={[styles.chip, { backgroundColor: T.cardLow }]}>
          <MaterialCommunityIcons name="filter-variant" size={18} color={T.textMuted} />
          <Text style={[styles.chipTxt, { color: T.textMuted }]}>All severity</Text>
        </View>
        <View style={[styles.chip, { backgroundColor: T.cardLow }]}>
          <MaterialCommunityIcons name="video" size={18} color={T.textMuted} />
          <Text style={[styles.chipTxt, { color: T.textMuted }]}>All cameras</Text>
        </View>
        <View style={[styles.chip, { backgroundColor: T.cardLow }]}>
          <MaterialCommunityIcons name="calendar-today" size={18} color={T.textMuted} />
          <Text style={[styles.chipTxt, { color: T.textMuted }]}>Today</Text>
        </View>
      </View>
      <TextInput
        style={[
          styles.search,
          {
            color: T.text,
            backgroundColor: Stitch.surfaceContainerLowest,
            borderColor: `${Stitch.outlineVariant}22`,
          },
        ]}
        placeholder="Search…"
        placeholderTextColor={T.textMuted}
        value={q}
        onChangeText={setQ}
      />
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
        contentContainerStyle={[styles.listPad, { paddingBottom: T.tabBarPadBottom }]}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: T.textMuted }]}>{loading ? 'Loading…' : 'No alerts.'}</Text>
        }
        renderItem={({ item }) => {
          const critical = item.severity?.toLowerCase?.() === 'high' || item.severity?.toLowerCase?.() === 'critical';
          return (
            <Pressable
              style={[
                styles.card,
                {
                  backgroundColor: T.card,
                  borderWidth: critical ? 1 : 0,
                  borderColor: critical ? 'rgba(255, 180, 171, 0.15)' : 'transparent',
                },
              ]}
              onPress={() => !item.is_read && void markRead(item.id)}
            >
              <View style={styles.rowTop}>
                <Text style={[styles.type, { color: T.text }]}>{item.alert_type}</Text>
                <Text style={[styles.time, { color: Stitch.outline }]} numberOfLines={1}>
                  {new Date(item.timestamp).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                  })}
                </Text>
              </View>
              <Text style={[styles.msg, { color: T.textMuted }]}>{item.message}</Text>
              <View style={styles.cardFoot}>
                {!item.is_read ? <View style={[styles.unreadDot, { backgroundColor: T.accent }]} /> : null}
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { marginBottom: 8, gap: 10 },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  statLbl: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statNum: {
    fontFamily: FontFamily.headlineBlack,
    fontSize: 28,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  statDivider: { width: 1, height: 36 },
  markBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  markBtnText: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 13,
    color: Stitch.onPrimaryContainer,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${Stitch.outlineVariant}22`,
  },
  chipTxt: { fontFamily: FontFamily.labelMedium, fontSize: 13 },
  search: {
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  listPad: { padding: 16, gap: 12 },
  card: { borderRadius: 14, padding: 16 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  type: { fontFamily: FontFamily.headline, fontSize: 17, flex: 1 },
  msg: { marginTop: 8, fontSize: 14, lineHeight: 20 },
  time: { fontSize: 11, fontVariant: ['tabular-nums'] },
  cardFoot: { marginTop: 8, minHeight: 8 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  empty: { textAlign: 'center', marginTop: 40 },
});
