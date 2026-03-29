import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { Stitch, FontFamily } from '@/constants/stitchTheme';
import { useStitchTheme } from '@/hooks/useStitchTheme';
import { useRealtimeTick } from '@/contexts/RealtimeContext';

type AlertItem = {
  id: number;
  alert_type: string;
  message: string;
  severity: string;
  is_read: boolean;
  timestamp: string;
  camera_id: number | null;
  camera_name?: string;
};

type ListRes = { items: AlertItem[]; total: number };

type Camera = {
  id: number;
  camera_name: string;
};

const SEVERITY_OPTIONS = ['All', 'Critical', 'High', 'Medium', 'Low', 'Info'];

export default function AlertsScreen() {
  const realtimeTick = useRealtimeTick();
  const T = useStitchTheme();
  const [items, setItems] = useState<AlertItem[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [severity, setSeverity] = useState('All');
  const [selectedCameraId, setSelectedCameraId] = useState<number | null>(null);
  const [todayOnly, setTodayOnly] = useState(false);

  const [showSeverityModal, setShowSeverityModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);

  const loadCameras = useCallback(async () => {
    try {
      const cams = await api<Camera[]>('/api/v1/cameras');
      setCameras(cams);
    } catch {
      setCameras([]);
    }
  }, []);

  useEffect(() => {
    void loadCameras();
  }, [loadCameras]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50', offset: '0' });
      if (q.trim()) params.set('q', q.trim());
      if (severity && severity !== 'All') params.set('severity', severity.toLowerCase());
      if (selectedCameraId !== null && selectedCameraId > 0) params.set('camera_id', String(selectedCameraId));
      if (todayOnly) params.set('today_only', 'true');
      
      const r = await api<ListRes>(`/api/v1/alerts?${params.toString()}`);
      setItems(r.items);
      setTotal(r.total);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [q, severity, selectedCameraId, todayOnly]);

  useEffect(() => {
    const delay = q ? 350 : 0;
    const t = setTimeout(() => void load(), delay);
    return () => clearTimeout(t);
  }, [q, severity, selectedCameraId, todayOnly, load, realtimeTick]);

  const unread = useMemo(() => items.filter((i) => !i.is_read).length, [items]);

  const markRead = async (id: number) => {
    setBusy(true);
    try {
      await api(`/api/v1/alerts/${id}/read`, { method: 'PATCH' });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const markAllRead = async () => {
    setBusy(true);
    try {
      await api('/api/v1/alerts/mark-all-read', { method: 'POST' });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleSeveritySelect = (value: string) => {
    setSeverity(value);
    setShowSeverityModal(false);
  };

  const handleCameraSelect = (id: number | null) => {
    setSelectedCameraId(id);
    setShowCameraModal(false);
  };

  const getSeverityLabel = () => severity === 'All' ? 'All severity' : severity;
  const getCameraLabel = () => {
    if (selectedCameraId === null || selectedCameraId === 0) return 'All cameras';
    const cam = cameras.find(c => c.id === selectedCameraId);
    return cam?.camera_name || 'All cameras';
  };

  const header = (
    <View style={styles.hero}>
      <Text style={[styles.eyebrow, { color: Stitch.primary }]}>System Monitoring</Text>
      <Text style={[styles.title, { color: T.text }]}>Security Alerts</Text>
      <View style={styles.statRow}>
        <View>
          <Text style={[styles.statLbl, { color: Stitch.outline }]}>Unread</Text>
          <Text style={[styles.statNum, { color: Stitch.secondary }]}>{unread.toString().padStart(2, '0')}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: `${Stitch.outlineVariant}44` }]} />
        <View>
          <Text style={[styles.statLbl, { color: Stitch.outline }]}>Total</Text>
          <Text style={[styles.statNum, { color: T.text }]}>{total.toString()}</Text>
        </View>
        <Pressable
          style={[styles.markBtn, { backgroundColor: Stitch.primaryContainer }]}
          onPress={() => void markAllRead()}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator size="small" color={Stitch.onPrimaryContainer} />
          ) : (
            <>
              <MaterialCommunityIcons name="check-all" size={18} color={Stitch.onPrimaryContainer} />
              <Text style={styles.markBtnText}>Mark all read</Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.chips}>
        <Pressable 
          style={[styles.chip, { backgroundColor: T.cardLow }]} 
          onPress={() => setShowSeverityModal(true)}
        >
          <MaterialCommunityIcons name="filter-variant" size={18} color={severity !== 'All' ? Stitch.primary : T.textMuted} />
          <Text style={[styles.chipTxt, { color: severity !== 'All' ? Stitch.primary : T.textMuted }]}>{getSeverityLabel()}</Text>
          <MaterialCommunityIcons name="chevron-down" size={14} color={T.textMuted} />
        </Pressable>
        
        <Pressable 
          style={[styles.chip, { backgroundColor: T.cardLow }]} 
          onPress={() => setShowCameraModal(true)}
        >
          <MaterialCommunityIcons name="video" size={18} color={selectedCameraId ? Stitch.primary : T.textMuted} />
          <Text style={[styles.chipTxt, { color: selectedCameraId ? Stitch.primary : T.textMuted }]}>{getCameraLabel()}</Text>
          <MaterialCommunityIcons name="chevron-down" size={14} color={T.textMuted} />
        </Pressable>
        
        <Pressable 
          style={[styles.chip, { backgroundColor: todayOnly ? `${Stitch.primary}22` : T.cardLow }]} 
          onPress={() => setTodayOnly(!todayOnly)}
        >
          <MaterialCommunityIcons name="calendar-today" size={18} color={todayOnly ? Stitch.primary : T.textMuted} />
          <Text style={[styles.chipTxt, { color: todayOnly ? Stitch.primary : T.textMuted }]}>Today</Text>
        </Pressable>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: Stitch.surfaceContainerLowest }]}>
        <MaterialCommunityIcons name="magnify" size={20} color={Stitch.outline} />
        <TextInput
          style={[styles.searchInput, { color: T.text }]}
          placeholder="Search alerts..."
          placeholderTextColor={Stitch.outline}
          value={q}
          onChangeText={setQ}
        />
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
        contentContainerStyle={[styles.listPad, { paddingBottom: T.tabBarPadBottom }]}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: T.textMuted }]}>{loading ? 'Loading…' : 'No alerts.'}</Text>
        }
        renderItem={({ item }) => {
          const critical = item.severity?.toLowerCase?.() === 'high' || item.severity?.toLowerCase?.() === 'critical';
          return (
            <Pressable
              style={[
                styles.card,
                {
                  backgroundColor: T.card,
                  borderWidth: critical ? 1 : 0,
                  borderColor: critical ? 'rgba(255, 180, 171, 0.15)' : 'transparent',
                },
              ]}
              onPress={() => !item.is_read && void markRead(item.id)}
            >
              <View style={styles.rowTop}>
                <Text style={[styles.type, { color: T.text }]}>{item.alert_type}</Text>
                <Text style={[styles.time, { color: Stitch.outline }]} numberOfLines={1}>
                  {new Date(item.timestamp).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                  })}
                </Text>
              </View>
              <Text style={[styles.msg, { color: T.textMuted }]}>{item.message}</Text>
              <View style={styles.cardFoot}>
                {!item.is_read ? <View style={[styles.unreadDot, { backgroundColor: T.accent }]} /> : null}
              </View>
            </Pressable>
          );
        }}
      />

      <Modal visible={showSeverityModal} transparent animationType="fade" onRequestClose={() => setShowSeverityModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowSeverityModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: T.card }]}>
            <Text style={[styles.modalTitle, { color: T.text }]}>Filter by Severity</Text>
            <ScrollView>
              {SEVERITY_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  style={[styles.optionItem, severity === option && { backgroundColor: `${Stitch.primary}22` }]}
                  onPress={() => handleSeveritySelect(option)}
                >
                  <Text style={[styles.optionText, { color: severity === option ? Stitch.primary : T.text }]}>{option}</Text>
                  {severity === option && <MaterialCommunityIcons name="check" size={20} color={Stitch.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showCameraModal} transparent animationType="fade" onRequestClose={() => setShowCameraModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowCameraModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: T.card }]}>
            <Text style={[styles.modalTitle, { color: T.text }]}>Filter by Camera</Text>
            <ScrollView>
              <Pressable
                style={[styles.optionItem, selectedCameraId === null && { backgroundColor: `${Stitch.primary}22` }]}
                onPress={() => handleCameraSelect(0)}
              >
                <Text style={[styles.optionText, { color: selectedCameraId === null ? Stitch.primary : T.text }]}>All Cameras</Text>
                {selectedCameraId === null && <MaterialCommunityIcons name="check" size={20} color={Stitch.primary} />}
              </Pressable>
              {cameras.map((cam) => (
                <Pressable
                  key={cam.id}
                  style={[styles.optionItem, selectedCameraId === cam.id && { backgroundColor: `${Stitch.primary}22` }]}
                  onPress={() => handleCameraSelect(cam.id)}
                >
                  <Text style={[styles.optionText, { color: selectedCameraId === cam.id ? Stitch.primary : T.text }]}>{cam.camera_name}</Text>
                  {selectedCameraId === cam.id && <MaterialCommunityIcons name="check" size={20} color={Stitch.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { marginBottom: 8 },
  eyebrow: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: FontFamily.headlineBlack,
    fontSize: 28,
    marginTop: 4,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  statLbl: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statNum: {
    fontFamily: FontFamily.headlineBlack,
    fontSize: 28,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  statDivider: { width: 1, height: 36 },
  markBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  markBtnText: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 13,
    color: Stitch.onPrimaryContainer,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipTxt: { fontFamily: FontFamily.labelMedium, fontSize: 13 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: FontFamily.body,
  },
  listPad: { padding: 16, gap: 12 },
  card: { borderRadius: 14, padding: 16 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  type: { fontFamily: FontFamily.headline, fontSize: 17, flex: 1 },
  msg: { marginTop: 8, fontSize: 14, lineHeight: 20 },
  time: { fontSize: 11, fontVariant: ['tabular-nums'] },
  cardFoot: { marginTop: 8, minHeight: 8 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  empty: { textAlign: 'center', marginTop: 40 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 32,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontFamily: FontFamily.headlineBlack,
    fontSize: 20,
    marginBottom: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  optionText: {
    fontFamily: FontFamily.body,
    fontSize: 16,
  },
});
