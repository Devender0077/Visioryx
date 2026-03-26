import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
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
};

export default function LiveScreen() {
  const router = useRouter();
  const realtimeTick = useRealtimeTick();
  const T = useStitchTheme();
  const [items, setItems] = useState<Camera[]>([]);
  const [activeIds, setActiveIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const cams = await api<Camera[]>('/api/v1/cameras');
      setItems(cams);
      const st = await api<{ active_camera_ids: number[] }>('/api/v1/stream/status').catch(() => ({
        active_camera_ids: [] as number[],
      }));
      setActiveIds(new Set(st.active_camera_ids ?? []));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, realtimeTick]);

  const header = (
    <View style={styles.hero}>
      <Text style={[stitchStyles.screenEyebrow, { color: T.accent }]}>Live Monitoring</Text>
      <Text style={[stitchStyles.liveScreenTitle, { color: T.text }]}>Active Surveillance</Text>
      <Text style={[stitchStyles.heroSub, { color: T.textMuted, marginTop: 8 }]}>
        Tap a feed to open full-screen MJPEG view.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: T.bg }]}>
        <ActivityIndicator size="large" color={T.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      {error ? (
        <Text style={[styles.err, { color: Stitch.error }]}>{error}</Text>
      ) : null}
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: T.textMuted }]}>
            No cameras configured. Add cameras in the web dashboard (admin).
          </Text>
        }
        renderItem={({ item }) => {
          const live = activeIds.has(item.id) && item.is_enabled;
          const time = new Date().toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          });
          return (
            <Pressable
              style={[styles.bento, { backgroundColor: T.card }]}
              onPress={() => router.push(`/camera/${item.id}`)}
              disabled={!item.is_enabled}
            >
              <View style={[styles.preview, { backgroundColor: T.cardMid }]}>
                {live ? (
                  <View style={styles.livePill}>
                    <View style={[styles.liveDot, { backgroundColor: Stitch.onSecondaryContainer }]} />
                    <Text style={styles.livePillText}>Live</Text>
                  </View>
                ) : item.is_enabled ? (
                  <Text style={[styles.offlineHint, { color: T.textMuted }]}>Ready</Text>
                ) : (
                  <View style={styles.offPill}>
                    <Text style={styles.offPillText}>Offline</Text>
                  </View>
                )}
              </View>
              <View style={styles.bentoFoot}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.camTitle, { color: T.text }]}>{item.camera_name}</Text>
                  <Text style={[styles.camMeta, { color: Stitch.outline }]} numberOfLines={1}>
                    {time} · {item.is_enabled ? (live ? 'Streaming' : 'Standby') : 'Disabled'}
                  </Text>
                </View>
                <View style={[styles.fsBtn, { backgroundColor: Stitch.surfaceContainerHighest }]}>
                  <MaterialCommunityIcons name="fullscreen" size={22} color={live ? T.accent : T.textMuted} />
                </View>
              </View>
            </Pressable>
          );
        }}
        contentContainerStyle={[styles.listPad, { paddingBottom: T.tabBarPadBottom }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  err: { padding: 16 },
  hero: { marginBottom: 16 },
  listPad: { padding: 16, gap: 16 },
  bento: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  preview: {
    height: 120,
    padding: 12,
    justifyContent: 'flex-start',
  },
  livePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${Stitch.secondaryContainer}E6`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  livePillText: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Stitch.onSecondaryContainer,
  },
  offPill: {
    alignSelf: 'flex-start',
    backgroundColor: `${Stitch.error}22`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  offPillText: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Stitch.error,
  },
  offlineHint: { fontFamily: FontFamily.body, fontSize: 13 },
  bentoFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  camTitle: {
    fontFamily: FontFamily.headline,
    fontSize: 18,
  },
  camMeta: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  fsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { textAlign: 'center', marginTop: 48, paddingHorizontal: 24 },
});
