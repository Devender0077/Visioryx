import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { Brand } from '@/constants/Colors';
import { Stitch } from '@/constants/stitchTheme';
import { useStitchTheme } from '@/hooks/useStitchTheme';
import { useRealtimeTick } from '@/contexts/RealtimeContext';
import { stitchStyles } from '@/styles/stitchStyles';

type Trend = { date: string; count: number };

export default function AnalyticsScreen() {
  const realtimeTick = useRealtimeTick();
  const T = useStitchTheme();
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
  }, [load, realtimeTick]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const max = Math.max(1, ...trends.map((x) => x.count));
  const barTrack = T.isDark ? Stitch.surfaceContainerHighest : '#E5E7EB';
  const barFill = T.isDark ? Stitch.primary : Brand.primary;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: T.bg }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={[styles.pad, { paddingBottom: 24 }]}
    >
      <Text style={[stitchStyles.screenTitle, { color: T.accent }]}>Detection trend</Text>
      <Text style={[stitchStyles.heroSub, { color: T.textMuted, marginTop: 4, marginBottom: 16 }]}>Last 14 days</Text>
      {error ? <Text style={[styles.err, { color: Stitch.error }]}>{error}</Text> : null}

      <View
        style={[
          styles.chart,
          {
            backgroundColor: T.card,
            borderColor: T.borderHair,
            borderWidth: T.isDark ? 0 : StyleSheet.hairlineWidth,
          },
        ]}
      >
        {trends.length === 0 ? (
          <Text style={{ color: T.textMuted }}>No data.</Text>
        ) : (
          trends.map((row) => (
            <View key={row.date} style={styles.barRow}>
              <Text style={[styles.barDate, { color: T.textMuted }]} numberOfLines={1}>
                {row.date}
              </Text>
              <View style={[styles.barTrack, { backgroundColor: barTrack }]}>
                <View style={[styles.barFill, { width: `${(row.count / max) * 100}%`, backgroundColor: barFill }]} />
              </View>
              <Text style={[styles.barCount, { color: T.text, fontFamily: T.FontFamily.labelSemibold }]}>
                {row.count}
              </Text>
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
  err: { marginBottom: 8 },
  chart: { borderRadius: 14, padding: 12, gap: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barDate: { width: 88, fontSize: 11 },
  barTrack: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  barCount: { width: 36, textAlign: 'right', fontSize: 13 },
});
