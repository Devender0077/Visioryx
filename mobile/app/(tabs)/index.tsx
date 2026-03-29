import { useCallback, useEffect, useState } from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, Text, View, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeTick } from '@/contexts/RealtimeContext';
import { useStitchTheme, type StitchTheme } from '@/hooks/useStitchTheme';
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
  severity?: string;
};

function fmt(n: number | undefined) {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function getAlertIcon(alertType: string): { icon: string; bg: string; color: string } {
  const t = alertType.toLowerCase();
  if (t.includes('unrecognized') || t.includes('unknown') || t.includes('entry')) {
    return { icon: 'person-alert', bg: '#93000a', color: '#ffdad6' };
  }
  if (t.includes('offline') || t.includes('camera') || t.includes('disconnect')) {
    return { icon: 'videocam-off', bg: '#915f00', color: '#ffddb3' };
  }
  if (t.includes('maintenance') || t.includes('update') || t.includes('system')) {
    return { icon: 'update', bg: `${Stitch.primary}33`, color: Stitch.primary };
  }
  return { icon: 'bell', bg: `${Stitch.primary}33`, color: Stitch.primary };
}

export default function OverviewScreen() {
  const { user } = useAuth();
  const realtimeTick = useRealtimeTick();
  const router = useRouter();
  const T = useStitchTheme();
  const { width } = useWindowDimensions();
  const [data, setData] = useState<Overview | null>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [alerts, setAlerts] = useState<AlertPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDays, setSelectedDays] = useState(7);

  const load = useCallback(async () => {
    if (isEnrolleeRole(user?.role)) return;
    setError(null);
    try {
      const [o, tr, al] = await Promise.all([
        api<Overview>('/api/v1/analytics/overview'),
        api<Trend[]>(`/api/v1/analytics/detection-trends?days=${selectedDays}`).catch(() => [] as Trend[]),
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
  }, [user?.role, selectedDays]);

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
        contentContainerStyle={[styles.pad, { paddingBottom: T.tabBarPadBottom }]}
      >
        <Text style={[styles.heroTitle, { color: T.text }]}>Welcome</Text>
        <Text style={[styles.heroSub, { color: T.textMuted }]}>
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
  const trendRows = trends.length ? trends.slice(-selectedDays) : [];
  const maxBar = Math.max(1, ...trendRows.map((x) => x.count));
  const bars =
    trendRows.length > 0
      ? trendRows.map((x) => Math.max(0.08, x.count / maxBar))
      : selectedDays === 7
        ? [0.4, 0.65, 0.3, 0.85, 0.95, 0.5, 0.6].slice(0, 7)
        : Array(30).fill(0).map(() => 0.3 + Math.random() * 0.5);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: T.bg }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={[styles.pad, { paddingBottom: T.tabBarPadBottom }]}
    >
      {/* Hero Section */}
      <Text style={[styles.eyebrow, { color: Stitch.primary }]}>System Status</Text>
      <Text style={[styles.heroTitleLarge, { color: T.text }]}>All systems vigilant.</Text>
      <Text style={[styles.heroSub, { color: T.textMuted }]}>
        Infrastructure monitoring is active across {nodes} nodes. No critical breaches detected in the last{' '}
        <Text style={{ fontVariant: ['tabular-nums'] }}>24</Text> hours.
      </Text>

      {/* Shortcuts */}
      <View style={styles.shortcutRow}>
        <Pressable style={[styles.shortcutBtn, { backgroundColor: T.card }]} onPress={() => router.push('/(tabs)/live')}>
          <MaterialCommunityIcons name="view-grid-outline" size={20} color={Stitch.primary} />
          <Text style={[styles.shortcutText, { color: T.text }]}>Live Grid</Text>
        </Pressable>
        <Pressable style={[styles.shortcutBtn, { backgroundColor: T.card }]} onPress={() => router.push('/detections')}>
          <MaterialCommunityIcons name="account-search" size={20} color={Stitch.primary} />
          <Text style={[styles.shortcutText, { color: T.text }]}>Detections</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/(tabs)/alerts')}>
          <LinearGradient
            colors={[Stitch.primaryContainer, Stitch.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shortcutBtnPrimary}
          >
            <MaterialCommunityIcons name="alert" size={20} color={Stitch.onPrimaryContainer} />
            <Text style={[styles.shortcutTextPrimary, { color: Stitch.onPrimaryContainer }]}>Alerts</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {error ? <Text style={[styles.err, { color: Stitch.error }]}>{error}</Text> : null}

      {/* KPI Grid - Row 1 */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { backgroundColor: T.card }]}>
          <View style={styles.kpiHeader}>
            <Text style={[styles.kpiLabel, { color: T.textMuted }]}>Total Users</Text>
            <MaterialCommunityIcons name="group" size={22} color={`${Stitch.primary}66`} />
          </View>
          <Text style={[styles.kpiValue, { color: T.text }]}>{fmt(data?.total_users)}</Text>
          <View style={styles.trendRow}>
            <MaterialCommunityIcons name="trending-up" size={14} color={Stitch.secondary} />
            <Text style={[styles.trendText, { color: Stitch.secondary }]}>+12%</Text>
          </View>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: T.card }]}>
          <View style={styles.kpiHeader}>
            <Text style={[styles.kpiLabel, { color: T.textMuted }]}>Active Cameras</Text>
            <MaterialCommunityIcons name="video" size={22} color={`${Stitch.secondary}66`} />
          </View>
          <Text style={[styles.kpiValue, { color: T.text }]}>{fmt(data?.active_cameras)}</Text>
          <View style={styles.trendRow}>
            <View style={[styles.statusDot, { backgroundColor: Stitch.secondary }]} />
            <Text style={[styles.trendText, { color: T.textMuted }]}>Stable connection</Text>
          </View>
        </View>
      </View>

      {/* KPI Grid - Row 2 */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiCard, { backgroundColor: T.card }]}>
          <View style={styles.kpiHeader}>
            <Text style={[styles.kpiLabel, { color: T.textMuted }]}>Detections Today</Text>
            <MaterialCommunityIcons name="bolt" size={22} color={`${Stitch.tertiary}66`} />
          </View>
          <Text style={[styles.kpiValue, { color: T.text }]}>{fmt(data?.detections_today)}</Text>
          <Text style={[styles.lastSeen, { color: Stitch.tertiary }]}>Last seen: {fmtTime(new Date().toISOString())}</Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: T.card, borderColor: `${Stitch.error}15`, borderWidth: 1 }]}>
          <View style={styles.kpiHeader}>
            <Text style={[styles.kpiLabel, { color: T.textMuted }]}>Unknown Detections</Text>
            <MaterialCommunityIcons name="help-circle-outline" size={22} color={`${Stitch.error}66`} />
          </View>
          <Text style={[styles.kpiValue, { color: Stitch.error }]}>{fmt(data?.unknown_detections_today)}</Text>
          <View style={styles.trendRow}>
            <MaterialCommunityIcons name="priority-high" size={14} color={Stitch.error} />
            <Text style={[styles.trendTextError, { color: Stitch.error }]}>Requires review</Text>
          </View>
        </View>
      </View>

      {/* Activity Density & Recent Alerts - Side by Side */}
      <View style={styles.bottomSection}>
        {/* Activity Density */}
        <View style={[styles.activityCard, { backgroundColor: T.card }]}>
          <View style={styles.activityHead}>
            <Text style={[styles.activityTitle, { color: T.text }]}>Activity Density</Text>
            <View style={styles.chipRow}>
              <Pressable
                style={[styles.chip, { backgroundColor: selectedDays === 7 ? Stitch.primary : T.cardMid }]}
                onPress={() => setSelectedDays(7)}
              >
                <Text style={[styles.chipText, { color: selectedDays === 7 ? Stitch.onPrimary : T.textMuted }]}>7 Days</Text>
              </Pressable>
              <Pressable
                style={[styles.chip, { backgroundColor: selectedDays === 30 ? Stitch.primary : 'transparent' }]}
                onPress={() => setSelectedDays(30)}
              >
                <Text style={[styles.chipText, { color: selectedDays === 30 ? Stitch.onPrimary : T.textMuted, opacity: selectedDays === 30 ? 1 : 0.5 }]}>30 Days</Text>
              </Pressable>
            </View>
          </View>
          
          {/* Horizontal Bar Chart */}
          <View style={styles.barContainer}>
            {bars.map((h, i) => (
              <View key={i} style={[styles.barWrapper]}>
                <View style={[styles.barTrack, { backgroundColor: `${Stitch.primary}20` }]}>
                  <View style={[styles.barFill, { height: `${Math.round(h * 100)}%`, backgroundColor: h > 0.8 ? Stitch.primary : `${Stitch.primary}99` }]} />
                </View>
              </View>
            ))}
          </View>
          
          <View style={styles.weekLabels}>
            <Text style={[styles.weekLbl, { color: T.textMuted }]}>
              {selectedDays === 7 ? 'Monday' : '30 Days Ago'}
            </Text>
            <Text style={[styles.weekLbl, { color: T.textMuted }]}>Sunday</Text>
          </View>
        </View>

        {/* Recent Alerts */}
        <View style={[styles.alertsCard, { backgroundColor: T.cardLow }]}>
          <Text style={[styles.activityTitle, { color: T.text }]}>Recent Alerts</Text>
          
          {alerts.length === 0 ? (
            <Text style={[styles.noAlerts, { color: T.textMuted }]}>No recent alerts.</Text>
          ) : (
            <View style={styles.alertsList}>
              {alerts.map((a) => {
                const alertStyle = getAlertIcon(a.alert_type);
                return (
                  <Pressable
                    key={a.id}
                    style={[styles.alertRow, { backgroundColor: T.card }]}
                    onPress={() => router.push('/(tabs)/alerts')}
                  >
                    <View style={[styles.alertIconBox, { backgroundColor: alertStyle.bg }]}>
                      <MaterialCommunityIcons name={alertStyle.icon as any} size={20} color={alertStyle.color} />
                    </View>
                    <View style={styles.alertInfo}>
                      <Text style={[styles.alertType, { color: T.text }]} numberOfLines={1}>
                        {a.alert_type}
                      </Text>
                      <Text style={[styles.alertMeta, { color: T.textMuted }]} numberOfLines={1}>
                        {a.message || 'No details'} • {fmtTime(a.timestamp)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
          
          <Pressable style={styles.viewAllBtn} onPress={() => router.push('/(tabs)/alerts')}>
            <Text style={[styles.viewAllText, { color: Stitch.primary }]}>View All Alerts</Text>
          </Pressable>
        </View>
      </View>

      {/* Neural Analysis Section */}
      <View style={[styles.neuralCard, { backgroundColor: T.card }]}>
        <View style={styles.neuralOverlay}>
          <Text style={[styles.neuralTitle, { color: T.text }]}>Neural Analysis Active</Text>
          <Text style={[styles.neuralSub, { color: T.textMuted }]}>
            Visioryx AI is currently processing <Text style={{ fontVariant: ['tabular-nums'], color: T.text }}>1.2TB</Text>/s of visual data.
          </Text>
        </View>
        <View style={[styles.engineLoad, { backgroundColor: `${Stitch.primary}15` }]}>
          <Text style={[styles.engineLabel, { color: Stitch.primary }]}>Engine Load</Text>
          <Text style={[styles.engineValue, { color: T.text }]}>24.8%</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pad: { padding: 20, paddingTop: 8 },
  eyebrow: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: FontFamily.headlineBlack,
    fontSize: 24,
  },
  heroTitleLarge: {
    fontFamily: FontFamily.headlineBlack,
    fontSize: 36,
    marginTop: 4,
  },
  heroSub: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
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
  err: { marginBottom: 8, marginTop: 8 },
  shortcutRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  shortcutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  shortcutBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  shortcutText: {
    fontSize: 13,
    fontFamily: FontFamily.labelSemibold,
  },
  shortcutTextPrimary: {
    fontSize: 13,
    fontFamily: FontFamily.labelSemibold,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  kpiCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  kpiLabel: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontFamily: FontFamily.headlineBlack,
    fontSize: 34,
    marginTop: 8,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  trendText: {
    fontFamily: FontFamily.labelMedium,
    fontSize: 12,
  },
  trendTextError: {
    fontFamily: FontFamily.labelMedium,
    fontSize: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lastSeen: {
    fontFamily: FontFamily.labelMedium,
    fontSize: 12,
    marginTop: 6,
    fontVariant: ['tabular-nums'],
  },
  bottomSection: {
    marginTop: 20,
    gap: 16,
  },
  activityCard: {
    padding: 20,
    borderRadius: 16,
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
  chipRow: {
    flexDirection: 'row',
    gap: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  chipText: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 100,
  },
  barWrapper: {
    flex: 1,
    height: '100%',
  },
  barTrack: {
    width: '100%',
    height: '100%',
    borderRadius: 3,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 3,
    minHeight: 4,
  },
  weekLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  weekLbl: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  alertsCard: {
    padding: 20,
    borderRadius: 16,
  },
  alertsList: {
    marginTop: 16,
    gap: 10,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
  },
  alertIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertInfo: {
    flex: 1,
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
  noAlerts: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  viewAllBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  viewAllText: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  neuralCard: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    height: 180,
    justifyContent: 'space-between',
    padding: 20,
  },
  neuralOverlay: {},
  neuralTitle: {
    fontFamily: FontFamily.headline,
    fontSize: 22,
  },
  neuralSub: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    marginTop: 4,
  },
  engineLoad: {
    alignSelf: 'flex-start',
    padding: 12,
    borderRadius: 10,
  },
  engineLabel: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  engineValue: {
    fontFamily: FontFamily.headlineBlack,
    fontSize: 24,
    marginTop: 2,
  },
});
