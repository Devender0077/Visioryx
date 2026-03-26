import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '@/lib/api';
import Colors, { Brand } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type Trend = { date: string; count: number };

export default function AnalyticsScreen() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];
  const [trends, setTrends] = useState<Trend[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const t = await api<Trend[]>('/api/v1/analytics/detection-trends?days=14');
      setTrends(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const max = Math.max(1, ...trends.map((x) => x.count));

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: palette.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={styles.pad}
    >
      <Text style={[styles.h1, { color: palette.text }]}>Detection trend</Text>
      <Text style={[styles.sub, { color: palette.textSecondary }]}>Last 14 days</Text>
      {error ? <Text style={styles.err}>{error}</Text> : null}

      <View style={[styles.chart, { backgroundColor: palette.card, borderColor: palette.border }]}>
        {trends.length === 0 ? (
          <Text style={{ color: palette.textSecondary }}>No data.</Text>
        ) : (
          trends.map((row) => (
            <View key={row.date} style={styles.barRow}>
              <Text style={[styles.barDate, { color: palette.textSecondary }]} numberOfLines={1}>
                {row.date}
              </Text>
              <View style={[styles.barTrack, { backgroundColor: palette.border }]}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${(row.count / max) * 100}%`, backgroundColor: Brand.primary },
                  ]}
                />
              </View>
              <Text style={[styles.barCount, { color: palette.text }]}>{row.count}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pad: { padding: 16, paddingBottom: 32 },
  h1: { fontSize: 20, fontWeight: '700' },
  sub: { marginTop: 4, marginBottom: 16, fontSize: 14 },
  err: { color: Brand.danger, marginBottom: 8 },
  chart: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barDate: { width: 88, fontSize: 11 },
  barTrack: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  barCount: { width: 36, textAlign: 'right', fontSize: 13, fontWeight: '600' },
});
