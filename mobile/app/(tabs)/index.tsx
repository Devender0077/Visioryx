import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Colors, { Brand } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type Overview = {
  total_users: number;
  total_cameras: number;
  active_cameras: number;
  detections_today: number;
  unknown_detections_today: number;
  detection_trend_7d: number;
};

export default function OverviewScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (user?.role === 'enrollee') return;
    setError(null);
    try {
      const o = await api<Overview>('/api/v1/analytics/overview');
      setData(o);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, [user?.role]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (user?.role === 'enrollee') {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: palette.background }]}
        contentContainerStyle={styles.enrolleePad}
      >
        <Text style={[styles.h1, { color: palette.text }]}>Welcome</Text>
        <Text style={[styles.body, { color: palette.textSecondary }]}>
          Complete face enrollment using the link from your email, or open the Enrollment tab for instructions.
        </Text>
        <Pressable
          style={styles.primaryBtn}
          onPress={() => router.push('/(tabs)/enroll')}
        >
          <Text style={styles.primaryBtnText}>Go to enrollment</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: palette.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={styles.pad}
    >
      <Text style={[styles.h1, { color: palette.text }]}>Overview</Text>
      <Text style={[styles.sub, { color: palette.textSecondary }]}>
        System snapshot — pull to refresh
      </Text>

      {error ? (
        <Text style={styles.err}>{error}</Text>
      ) : null}

      <View style={styles.grid}>
        <Kpi
          icon="account-multiple"
          label="Users"
          value={data?.total_users ?? '—'}
          palette={palette}
        />
        <Kpi
          icon="cctv"
          label="Cameras"
          value={data?.total_cameras ?? '—'}
          palette={palette}
        />
        <Kpi
          icon="play-circle-outline"
          label="Active cams"
          value={data?.active_cameras ?? '—'}
          palette={palette}
        />
        <Kpi
          icon="chart-timeline-variant"
          label="Detections today"
          value={data?.detections_today ?? '—'}
          palette={palette}
        />
        <Kpi
          icon="account-question-outline"
          label="Unknown today"
          value={data?.unknown_detections_today ?? '—'}
          palette={palette}
        />
        <Kpi
          icon="trending-up"
          label="7d trend %"
          value={data != null ? `${data.detection_trend_7d}` : '—'}
          palette={palette}
        />
      </View>

      <Text style={[styles.section, { color: palette.text }]}>Shortcuts</Text>
      <View style={styles.row}>
        <Shortcut title="Live" icon="television-play" onPress={() => router.push('/(tabs)/live')} palette={palette} />
        <Shortcut title="Alerts" icon="bell" onPress={() => router.push('/(tabs)/alerts')} palette={palette} />
      </View>
    </ScrollView>
  );
}

type Palette = (typeof Colors)[keyof typeof Colors];

function Kpi({
  icon,
  label,
  value,
  palette,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string | number;
  palette: Palette;
}) {
  return (
    <View style={[styles.kpi, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <MaterialCommunityIcons name={icon} size={22} color={Brand.primary} />
      <Text style={[styles.kpiVal, { color: palette.text }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: palette.textSecondary }]}>{label}</Text>
    </View>
  );
}

function Shortcut({
  title,
  icon,
  onPress,
  palette,
}: {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  palette: Palette;
}) {
  return (
    <Pressable
      style={[styles.shortcut, { backgroundColor: palette.card, borderColor: palette.border }]}
      onPress={onPress}
    >
      <MaterialCommunityIcons name={icon} size={24} color={Brand.primary} />
      <Text style={[styles.shortcutText, { color: palette.text }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pad: { padding: 16, paddingBottom: 32 },
  enrolleePad: { padding: 24, paddingTop: 48 },
  h1: { fontSize: 22, fontWeight: '700' },
  sub: { marginTop: 4, marginBottom: 16, fontSize: 14 },
  body: { fontSize: 15, lineHeight: 22, marginTop: 12 },
  err: { color: Brand.danger, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpi: {
    width: '47%',
    minWidth: 140,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  kpiVal: { fontSize: 22, fontWeight: '700', marginTop: 4 },
  kpiLabel: { fontSize: 12 },
  section: { fontSize: 16, fontWeight: '600', marginTop: 24, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12 },
  shortcut: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  shortcutText: { fontSize: 16, fontWeight: '600' },
  primaryBtn: {
    marginTop: 20,
    backgroundColor: Brand.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
