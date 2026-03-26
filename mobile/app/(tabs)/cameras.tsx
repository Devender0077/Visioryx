import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import Colors, { Brand } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

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
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];
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
  }, [load]);

  return (
    <FlatList
      style={{ backgroundColor: palette.background }}
      data={items}
      keyExtractor={(item) => String(item.id)}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
      contentContainerStyle={styles.pad}
      ListEmptyComponent={
        <Text style={[styles.empty, { color: palette.textSecondary }]}>
          {loading ? 'Loading…' : 'No cameras.'}
        </Text>
      }
      renderItem={({ item }) => (
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.cardHead}>
            <MaterialCommunityIcons name="cctv" size={22} color={Brand.primary} />
            <Text style={[styles.title, { color: palette.text }]}>{item.camera_name}</Text>
          </View>
          <Text style={[styles.meta, { color: palette.textSecondary }]}>
            Status: {item.status} · {item.is_enabled ? 'Enabled' : 'Disabled'}
          </Text>
          <Text style={[styles.rtsp, { color: palette.textSecondary }]}>{maskRtsp(item.rtsp_url)}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 32, gap: 12 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '600', flex: 1 },
  meta: { marginTop: 6, fontSize: 13 },
  rtsp: { marginTop: 4, fontSize: 12 },
  empty: { textAlign: 'center', marginTop: 40 },
});
