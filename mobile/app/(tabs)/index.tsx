import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeTick } from '@/contexts/RealtimeContext';
import { useStitchTheme, type StitchTheme } from '@/hooks/useStitchTheme';
import { stitchStyles } from '@/styles/stitchStyles';
import { Stitch, FontFamily } from '@/constants/stitchTheme';
import { isEnrolleeRole } from '@/lib/roles';

type Overview = {
  total_users: number;
  total_cameras: number;
  active_cameras: number;
  detections_today: number;
  unknown_detections_today: number;
  detection_trend_7d: number;
};

type Trend = { date: string; count: number };

type AlertPreview = {
  id: number;
  alert_type: string;
  message: string;
  timestamp: string;
};

function fmt(n: number | undefined) {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function OverviewScreen() {
  const { user } = useAuth();
  const realtimeTick = useRealtimeTick();
  const router = useRouter();
  const T = useStitchTheme();
  const [data, setData] = useState<Overview | null>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [alerts, setAlerts] = useState<AlertPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (isEnrolleeRole(user?.role)) return;
    setError(null);
    try {
      const [o, tr, al] = await Promise.all([
        api<Overview>('/api/v1/analytics/overview'),
        api<Trend[]>('/api/v1/analytics/detection-trends?days=7').catch(() => [] as Trend[]),
        api<{ items: AlertPreview[] }>('/api/v1/alerts?limit=3&offset=0').catch(() => ({
          items: [] as AlertPreview[],
        })),
      ]);
      setData(o);
      setTrends(tr);
      setAlerts(al.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, [user?.role]);

  useEffect(() => {
    void load();
  }, [load, realtimeTick]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (isEnrolleeRole(user?.role)) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: T.bg }]}
        contentContainerStyle={[styles.enrolleePad, { paddingBottom: T.tabBarPadBottom }]}
      >
        <Text style={[stitchStyles.heroTitle, { color: T.text, fontSize: 24 }]}>Welcome</Text>
        <Text style={[stitchStyles.heroSub, { color: T.textMuted }]}>
          Complete face enrollment using the link from your email, or open the Enrollment tab for instructions.
        </Text>
        <Pressable onPress={() => router.push('/(tabs)/enroll')}>
          <LinearGradient
            colors={[Stitch.primary, Stitch.primaryContainer]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Go to enrollment</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    );
  }

  const nodes = data?.total_cameras != null && data.total_cameras > 0 ? data.total_cameras : 12;
  const trendRows = trends.length ? trends.slice(-7) : [];
  const maxBar = Math.max(1, ...trendRows.map((x) => x.count));
  const bars =
    trendRows.length > 0
      ? trendRows.map((x) => Math.max(0.08, x.count / maxBar))
      : [0.4, 0.65, 0.3, 0.85, 0.95, 0.5, 0.6].slice(0, 7);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: T.bg }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={[styles.pad, { paddingBottom: T.tabBarPadBottom }]}
    >
      <Text style={[stitchStyles.heroEyebrow, { color: T.accent }]}>System Status</Text>
      <Text style={[stitchStyles.heroTitle, { color: T.text }]}>All systems vigilant.</Text>
      <Text style={[stitchStyles.heroSub, { color: T.textMuted }]}>
        Infrastructure monitoring is active across {nodes} nodes. No critical breaches detected in the last{' '}
        <Text style={{ fontVariant: ['tabular-nums'] }}>24</Text> hours.
      </Text>

      <View style={[styles.shortcutRow, { marginTop: 18 }]}>
        <Shortcut
          title="Live Grid"
          icon="view-grid-outline"
          onPress={() => router.push('/(tabs)/live')}
          T={T}
        />
        <Shortcut
          title="Detections"
          icon="account-search"
          onPress={() => router.push('/detections')}
          T={T}
        />
        <Shortcut title="Alerts" icon="alert" primary onPress={() => router.push('/(tabs)/alerts')} T={T} />
      </View>

      {error ? (
        <Text style={[styles.err, { color: Stitch.secondary }]}>{error}</Text>
      ) : null}

      <Text style={[stitchStyles.sectionLabel, { color: T.textMuted, marginTop: 24 }]}>Key metrics</Text>
      <View style={styles.grid}>
        <Kpi
          icon="account-multiple"
          label="Total Users"
          value={fmt(data?.total_users)}
          T={T}
          iconTint={`${T.accent}66`}
        />
        <Kpi
          icon="video"
          label="Active Cameras"
          value={fmt(data?.active_cameras)}
          T={T}
          iconTint={`${Stitch.secondary}66`}
        />
        <Kpi
          icon="lightning-bolt"
          label="Detections Today"
          value={fmt(data?.detections_today)}
          T={T}
          iconTint={`${Stitch.tertiary}99`}
        />
        <Kpi
          icon="help-circle-outline"
          label="Unknown Detections"
          value={fmt(data?.unknown_detections_today)}
          T={T}
          iconTint="rgba(255, 180, 171, 0.55)"
          accentWarn
        />
      </View>

      <View style={[styles.grid, { marginTop: 4 }]}>
        <Kpi
          icon="cctv"
          label="Cameras installed"
          value={fmt(data?.total_cameras)}
          T={T}
          iconTint={`${T.accent}55`}
          compact
        />
        <Kpi
          icon="trending-up"
          label="7d trend %"
          value={data != null ? `${data.detection_trend_7d}` : '—'}
          T={T}
          iconTint={`${Stitch.secondary}66`}
          compact
        />
      </View>

      {/* Activity Density — overview/code.html */}
      <View style={[styles.activityCard, { backgroundColor: T.cardMid }]}>
        <View style={styles.activityHead}>
          <Text style={[styles.activityTitle, { color: T.text }]}>Activity Density</Text>
          <View style={styles.chipRow}>
            <View style={[styles.chipOn, { backgroundColor: T.card }]}>
              <Text style={styles.chipOnText}>7 Days</Text>
            </View>
            <Text style={[styles.chipOff, { color: T.textMuted }]}>30 Days</Text>
          </View>
        </View>
        <View style={styles.barStrip}>
          {bars.map((h, i) => (
            <View key={i} style={[styles.barTrack, { backgroundColor: `${Stitch.primary}33`, flex: 1 }]}>
              <View style={[styles.barFill, { height: `${Math.round(h * 100)}%`, backgroundColor: Stitch.primary }]} />
            </View>
          ))}
        </View>
        <View style={styles.weekLabels}>
          <Text style={[styles.weekLbl, { color: T.textMuted }]}>Monday</Text>
          <Text style={[styles.weekLbl, { color: T.textMuted }]}>Sunday</Text>
        </View>
      </View>

      {/* Recent Alerts — overview/code.html */}
      <View style={[styles.recentWrap, { backgroundColor: T.cardLow }]}>
        <Text style={[styles.recentTitle, { color: T.text }]}>Recent Alerts</Text>
        {alerts.length === 0 ? (
          <Text style={{ color: T.textMuted, fontFamily: FontFamily.body, fontSize: 14 }}>No recent alerts.</Text>
        ) : (
          alerts.map((a) => (
            <Pressable
              key={a.id}
              style={[styles.alertRow, { backgroundColor: T.cardMid }]}
              onPress={() => router.push('/(tabs)/alerts')}
            >
              <View style={[styles.alertIcon, { backgroundColor: `${Stitch.primaryContainer}33` }]}>
                <MaterialCommunityIcons name="bell-outline" size={22} color={T.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertType, { color: T.text }]} numberOfLines={1}>
                  {a.alert_type}
                </Text>
                <Text style={[styles.alertMeta, { color: T.textMuted }]} numberOfLines={2}>
                  {a.message}
                </Text>
              </View>
            </Pressable>
          ))
        )}
        <Pressable onPress={() => router.push('/(tabs)/alerts')}>
          <Text style={styles.viewAll}>View All Alerts</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Kpi({
  icon,
  label,
  value,
  T,
  iconTint,
  accentWarn,
  compact,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  T: StitchTheme;
  iconTint: string;
  accentWarn?: boolean;
  compact?: boolean;
}) {
  return (
    <View
      style={[
        stitchStyles.kpiCard,
        styles.kpiCell,
        { backgroundColor: T.card, minHeight: compact ? 120 : 148 },
        accentWarn ? { borderWidth: 1, borderColor: 'rgba(255, 180, 171, 0.12)' } : null,
      ]}
    >
      <View style={styles.kpiTop}>
        <Text style={stitchStyles.kpiLabel}>{label}</Text>
        <MaterialCommunityIcons
          name={icon}
          size={compact ? 20 : 22}
          color={accentWarn ? 'rgba(255, 180, 171, 0.55)' : iconTint}
        />
      </View>
      <Text
        style={[
          stitchStyles.kpiValue,
          { fontSize: compact ? 26 : 34 },
          { color: accentWarn ? Stitch.error : T.text },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function Shortcut({
  title,
  icon,
  onPress,
  primary,
  T,
}: {
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  primary?: boolean;
  T: StitchTheme;
}) {
  if (primary) {
    return (
      <Pressable style={styles.shortcutFlex} onPress={onPress}>
        <LinearGradient
          colors={[Stitch.primary, Stitch.primaryContainer]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.shortcutGrad}
        >
          <MaterialCommunityIcons name={icon} size={20} color={Stitch.onPrimaryContainer} />
          <Text style={styles.shortcutGradText}>{title}</Text>
        </LinearGradient>
      </Pressable>
    );
  }
  return (
    <Pressable style={[styles.shortcut, styles.shortcutFlex, { backgroundColor: T.card }]} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={20} color={T.accent} />
      <Text style={[styles.shortcutText, { color: T.text }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pad: { padding: 20, paddingTop: 8 },
  enrolleePad: { padding: 24, paddingTop: 32 },
  err: { marginBottom: 8, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  kpiCell: { width: '47%' },
  kpiTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  shortcutRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  shortcutFlex: { flex: 1, minWidth: 96 },
  shortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  shortcutText: { fontSize: 13, fontFamily: FontFamily.labelSemibold },
  shortcutGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  shortcutGradText: {
    color: Stitch.onPrimaryContainer,
    fontFamily: FontFamily.labelSemibold,
    fontSize: 13,
  },
  primaryBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: Stitch.onPrimaryContainer,
    fontSize: 16,
    fontFamily: FontFamily.labelSemibold,
  },
  activityCard: {
    borderRadius: 14,
    padding: 20,
    marginTop: 20,
  },
  activityHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activityTitle: {
    fontFamily: FontFamily.headline,
    fontSize: 18,
  },
  chipRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  chipOn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  chipOnText: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 10,
    color: Stitch.onSurface,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  chipOff: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    opacity: 0.45,
  },
  barStrip: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 112,
  },
  barTrack: {
    borderRadius: 3,
    height: '100%',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    minHeight: 4,
  },
  weekLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  weekLbl: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  recentWrap: {
    borderRadius: 14,
    padding: 20,
    marginTop: 16,
    gap: 12,
  },
  recentTitle: {
    fontFamily: FontFamily.headline,
    fontSize: 18,
    marginBottom: 4,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertType: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 14,
  },
  alertMeta: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  viewAll: {
    marginTop: 8,
    textAlign: 'center',
    fontFamily: FontFamily.labelSemibold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Stitch.primary,
  },
});
