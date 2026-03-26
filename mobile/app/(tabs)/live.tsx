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
import Colors, { Brand } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type Camera = {
  id: number;
  camera_name: string;
  status: string;
  is_enabled: boolean;
};

export default function LiveScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];
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
  }, [load]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: palette.background }]}>
        <ActivityIndicator size="large" color={Brand.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: palette.textSecondary }]}>
            No cameras configured. Add cameras in the web dashboard (admin).
          </Text>
        }
        renderItem={({ item }) => {
          const live = activeIds.has(item.id) && item.is_enabled;
          return (
            <Pressable
              style={[styles.row, { backgroundColor: palette.card, borderColor: palette.border }]}
              onPress={() => router.push(`/camera/${item.id}`)}
              disabled={!item.is_enabled}
            >
              <MaterialCommunityIcons name="cctv" size={28} color={live ? Brand.success : palette.textSecondary} />
              <View style={styles.rowText}>
                <Text style={[styles.name, { color: palette.text }]}>{item.camera_name}</Text>
                <Text style={{ color: palette.textSecondary, fontSize: 13 }}>
                  {item.is_enabled ? (live ? 'Streaming' : 'Ready') : 'Disabled'}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={palette.textSecondary} />
            </Pressable>
          );
        }}
        contentContainerStyle={styles.listPad}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  err: { color: Brand.danger, padding: 16 },
  listPad: { padding: 16, paddingBottom: 32, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  rowText: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 48, paddingHorizontal: 24 },
});
