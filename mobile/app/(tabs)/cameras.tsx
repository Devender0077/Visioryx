import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { Stitch, FontFamily } from '@/constants/stitchTheme';
import { useStitchTheme } from '@/hooks/useStitchTheme';
import { useRealtimeTick } from '@/contexts/RealtimeContext';
import { stitchStyles } from '@/styles/stitchStyles';

type Camera = {
  id: number;
  camera_name: string;
  status: string;
  is_enabled: boolean;
  rtsp_url: string;
};

function maskRtsp(url: string) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}${u.pathname ? '/•••' : ''}`;
  } catch {
    return '••••••••';
  }
}

export default function CamerasScreen() {
  const realtimeTick = useRealtimeTick();
  const T = useStitchTheme();
  const [items, setItems] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const cams = await api<Camera[]>('/api/v1/cameras');
      setItems(cams);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, realtimeTick]);

  const online = useMemo(() => items.filter((c) => c.is_enabled).length, [items]);
  const issues = useMemo(() => items.filter((c) => !c.is_enabled).length, [items]);

  const header = (
    <View style={styles.hero}>
      <Text style={[stitchStyles.screenEyebrowWide, { color: T.accent }]}>Network Management</Text>
      <Text style={[stitchStyles.screenH1, { color: T.text }]}>Active Cameras</Text>
      <Text style={[stitchStyles.heroSub, { color: T.textMuted, marginTop: 10 }]}>
        Manage your distributed security nodes and monitor real-time stream connectivity across the infrastructure.
      </Text>
      <View style={[styles.summary, { backgroundColor: T.cardLow }]}>
        <View style={styles.sumCol}>
          <Text style={[styles.sumLbl, { color: T.textMuted }]}>Total nodes</Text>
          <Text style={[styles.sumVal, { color: T.text }]}>{items.length.toString().padStart(2, '0')}</Text>
        </View>
        <View style={styles.sumCol}>
          <Text style={[styles.sumLbl, { color: T.textMuted }]}>Online</Text>
          <Text style={[styles.sumVal, { color: Stitch.secondary }]}>{online.toString().padStart(2, '0')}</Text>
        </View>
        <View style={styles.sumCol}>
          <Text style={[styles.sumLbl, { color: T.textMuted }]}>Issues</Text>
          <Text style={[styles.sumVal, { color: Stitch.error }]}>{issues.toString().padStart(2, '0')}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: T.bg }}
      data={items}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={header}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
      contentContainerStyle={[styles.pad, { paddingBottom: T.tabBarPadBottom }]}
      ListEmptyComponent={
        <Text style={[styles.empty, { color: T.textMuted }]}>{loading ? 'Loading…' : 'No cameras.'}</Text>
      }
      renderItem={({ item }) => (
        <View style={[styles.card, { backgroundColor: T.card }]}>
          <View style={styles.cardHead}>
            <MaterialCommunityIcons name="cctv" size={22} color={T.accent} />
            <Text style={[styles.title, { color: T.text, fontFamily: FontFamily.labelSemibold }]}>
              {item.camera_name}
            </Text>
          </View>
          <Text style={[styles.meta, { color: T.textMuted }]}>
            Status: {item.status} · {item.is_enabled ? 'Enabled' : 'Disabled'}
          </Text>
          <View style={[styles.rtspRow, { backgroundColor: T.bg }]}>
            <MaterialCommunityIcons name="link-variant" size={16} color={T.accent} />
            <Text style={[styles.rtsp, { color: T.textMuted }]}>{maskRtsp(item.rtsp_url)}</Text>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  hero: { marginBottom: 8 },
  pad: { padding: 16, gap: 12 },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: `${Stitch.primary}33`,
  },
  sumCol: { alignItems: 'center', flex: 1 },
  sumLbl: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sumVal: {
    fontFamily: FontFamily.headlineBlack,
    fontSize: 22,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  card: { borderRadius: 14, padding: 16 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 17, flex: 1 },
  meta: { marginTop: 8, fontSize: 13 },
  rtspRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rtsp: { fontSize: 12, flex: 1 },
  empty: { textAlign: 'center', marginTop: 40 },
});
