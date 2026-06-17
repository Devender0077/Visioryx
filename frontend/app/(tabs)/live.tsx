import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { Stitch, FontFamily } from '@/constants/stitchTheme';
import { useStitchTheme } from '@/hooks/useStitchTheme';
import { useRealtimeTick } from '@/contexts/RealtimeContext';

type Camera = {
  id: number;
  camera_name: string;
  status: string;
  is_enabled: boolean;
  rtsp_url?: string;
};

export default function LiveScreen() {
  const router = useRouter();
  const realtimeTick = useRealtimeTick();
  const T = useStitchTheme();
  const [items, setItems] = useState<Camera[]>([]);
  const [activeIds, setActiveIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'offline' | 'disabled'>('all');

  const filteredItems = items.filter(item => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'live') return activeIds.has(item.id) && item.is_enabled;
    if (statusFilter === 'offline') return item.is_enabled && !activeIds.has(item.id);
    if (statusFilter === 'disabled') return !item.is_enabled;
    return true;
  });

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

  const renderHeader = () => (
    <View>
      {/* Header */}
      <View style={styles.hero}>
        <Text style={[styles.eyebrow, { color: Stitch.primary }]}>Live Monitoring</Text>
        <Text style={[styles.title, { color: T.text }]}>Active Surveillance</Text>
      </View>

      {/* Filter and Add Buttons */}
      <View style={styles.buttonRow}>
        <Pressable style={[styles.filterBtn, { backgroundColor: T.card }]} onPress={() => setFilterOpen(!filterOpen)}>
          <MaterialCommunityIcons name="filter-variant" size={18} color={T.text} />
          <Text style={[styles.filterBtnText, { color: T.text }]}>Filters</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/(tabs)/cameras')}>
          <LinearGradient
            colors={[Stitch.primary, Stitch.primaryContainer]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addBtn}
          >
            <MaterialCommunityIcons name="plus" size={18} color={Stitch.onPrimary} />
            <Text style={styles.addBtnText}>Add Camera</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: Camera }) => {
    const live = activeIds.has(item.id) && item.is_enabled;
    const time = new Date().toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    return (
      <Pressable
        style={[styles.cameraCard, { backgroundColor: T.card }]}
        onPress={() => item.is_enabled && router.push(`/camera/${item.id}`)}
      >
        {/* Preview Area */}
        <View style={[styles.preview, { backgroundColor: T.cardMid }]}>
          {/* Gradient Overlay */}
          <View style={styles.gradient} />
          
          {/* Badges */}
          <View style={styles.badgeRow}>
            {live ? (
              <View style={[styles.liveBadge, { backgroundColor: `${Stitch.secondaryContainer}EE` }]}>
                <View style={[styles.liveDot, { backgroundColor: Stitch.onSecondaryContainer }]} />
                <Text style={[styles.badgeText, { color: Stitch.onSecondaryContainer }]}>Live</Text>
              </View>
            ) : item.is_enabled ? (
              <View style={[styles.offlineBadge, { backgroundColor: `${Stitch.error}99` }]}>
                <Text style={[styles.badgeText, { color: Stitch.error }]}>Offline</Text>
              </View>
            ) : (
              <View style={[styles.offlineBadge, { backgroundColor: `${Stitch.outline}CC` }]}>
                <Text style={[styles.badgeText, { color: Stitch.surface }]}>Disabled</Text>
              </View>
            )}
            {live && (
              <View style={[styles.resBadge, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <Text style={styles.resText}>1080p · 30fps</Text>
              </View>
            )}
          </View>
        </View>

        {/* Camera Info */}
        <View style={[styles.infoRow, { backgroundColor: T.card }]}>
          <View style={styles.camInfo}>
            <Text style={[styles.camName, { color: T.text }]}>{item.camera_name}</Text>
            <Text style={[styles.camMeta, { color: Stitch.outline }]}>
              {time} · {item.is_enabled ? (live ? 'Streaming' : 'Ready') : 'Disabled'}
            </Text>
          </View>
          <Pressable 
            style={[styles.fsBtn, { backgroundColor: T.cardMid }]}
            onPress={() => item.is_enabled && router.push(`/camera/${item.id}`)}
          >
            <MaterialCommunityIcons name="fullscreen" size={22} color={live ? Stitch.primary : Stitch.outline} />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  const renderSystemStatus = () => (
    <View style={[styles.systemStatus, { backgroundColor: T.cardLow }]}>
      <View style={styles.statusLeft}>
        <View style={[styles.statusIcon, { backgroundColor: `${Stitch.primary}22` }]}>
          <MaterialCommunityIcons name="dns" size={24} color={Stitch.primary} />
        </View>
        <View>
          <Text style={[styles.statusTitle, { color: T.text }]}>System Health</Text>
          <Text style={[styles.statusSub, { color: Stitch.outline }]}>All nodes reporting operational</Text>
        </View>
      </View>
      <View style={styles.statusRight}>
        <View style={styles.statusItem}>
          <Text style={[styles.statusLabel, { color: Stitch.outline }]}>Storage</Text>
          <Text style={[styles.statusValue, { color: Stitch.primary }]}>84% Full</Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={[styles.statusLabel, { color: Stitch.outline }]}>Uptime</Text>
          <Text style={[styles.statusValue, { color: Stitch.primary }]}>12d 4h</Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={[styles.statusLabel, { color: Stitch.outline }]}>Alerts</Text>
          <Text style={[styles.statusValue, { color: Stitch.error }]}>0 High</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: T.bg }]}>
        <ActivityIndicator size="large" color={Stitch.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      {/* Filter Modal */}
      {filterOpen && (
        <View style={[styles.filterModal, { backgroundColor: T.card }]}>
          <Text style={[styles.filterTitle, { color: T.text }]}>Filter by Status</Text>
          {(['all', 'live', 'offline', 'disabled'] as const).map((status) => (
            <Pressable
              key={status}
              style={[styles.filterOption, statusFilter === status && { backgroundColor: Stitch.primaryContainer }]}
              onPress={() => {
                setStatusFilter(status);
                setFilterOpen(false);
              }}
            >
              <Text style={[styles.filterOptionText, { color: statusFilter === status ? Stitch.onPrimaryContainer : T.text }]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={renderHeader}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
        ListFooterComponent={items.length > 0 ? renderSystemStatus : null}
        contentContainerStyle={[styles.listPad, { paddingBottom: T.tabBarPadBottom }]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="video-off" size={64} color={Stitch.outline} />
            <Text style={[styles.emptyTitle, { color: T.text }]}>No Cameras</Text>
            <Text style={[styles.emptySub, { color: Stitch.outline }]}>
              No cameras configured. Add cameras in the web dashboard (admin).
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { marginBottom: 16 },
  eyebrow: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: FontFamily.headlineBlack,
    fontSize: 32,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  filterBtnText: {
    fontFamily: FontFamily.labelMedium,
    fontSize: 14,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addBtnText: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 14,
    color: Stitch.onPrimary,
  },
  listPad: { padding: 16, gap: 16 },
  cameraCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  preview: {
    aspectRatio: 16 / 9,
    position: 'relative',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'transparent',
  },
  badgeRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  offlineBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  resBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  resText: {
    fontFamily: FontFamily.labelMedium,
    fontSize: 10,
    color: '#fff',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  camInfo: {
    flex: 1,
  },
  camName: {
    fontFamily: FontFamily.headline,
    fontSize: 16,
  },
  camMeta: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  fsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  systemStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderLeftWidth: 4,
    borderLeftColor: Stitch.primary,
    marginTop: 8,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 14,
  },
  statusSub: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    marginTop: 2,
  },
  statusRight: {
    flexDirection: 'row',
    gap: 20,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusValue: {
    fontFamily: FontFamily.headlineBlack,
    fontSize: 16,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontFamily: FontFamily.headline,
    fontSize: 18,
    marginTop: 16,
  },
  emptySub: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  filterModal: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    borderRadius: 16,
    padding: 16,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  filterTitle: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 14,
    marginBottom: 12,
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  filterOptionText: {
    fontFamily: FontFamily.body,
    fontSize: 14,
  },
});
