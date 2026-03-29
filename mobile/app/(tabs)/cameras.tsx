import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Stitch, FontFamily } from '@/constants/stitchTheme';
import { useStitchTheme } from '@/hooks/useStitchTheme';
import { useRealtimeTick } from '@/contexts/RealtimeContext';
import { isAdminRole } from '@/lib/roles';

type Camera = {
  id: number;
  camera_name: string;
  status: string;
  is_enabled: boolean;
  rtsp_url: string;
};

const CAMERA_PREVIEWS = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDsijg-kLeAS46PWMwfwmwi0Efd2VAbafI7Cks-APxkkBjVS1kMG3tEuQfUP59NwQOKmf7xEu9JJ3cenhmF8ut2fcZCkS1JHWPuOcYJqww3s1hVQNEk0wMduQAcf1oegkayA1AiFMhWNZesq_hShJKTJhY87bq0KOGDnARnWlT-rRCop3QKQWRPHwWc5GpT9Z_kiq4SPqfVuCjGbbdoNEBnDev9DmQMcXHrjZii8c5uD4X4XzRMpO6_kqsHX2sNUBHamF1TG175Nmw',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD00o4q56j8hIJJBIQYSy5xOBel-AK90ye3fRgYF8BZzs1yLQJU8ju5pt6hszKb63WaYuo_XOdgCeATbicpcaw8fPFuM3pGhGbli0FLl2SLQkXVBe892ltvdQvhpkFUeb2LgJ1pwnlJxdCFcwlzYboBLRy09g294awWTLWD7esuOHv_-YXE7Rep_vIMhqBtSLabwbZbo74uWCa7g7EhL-l_cuIiB6EKQXllGFbHyJhm8jjktfUTkeYN73O13zYL5Rd0aNJuGvOhgXg',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBbPXeVuPbZY4sl8EfBPo06AQSgkB9eRb7gyfFFgRqzXsKs83GTOqvHn7ztBRRi66o0OAz23nkFXEcXerSpBcibuSrEJezt5WMC2IAkpuUo1-Lk3OjouEcB4d8_xBEgNBsweYXtQwsaeekkk8UK8Xc3qIaVMZpholYPY1HHekDbbOPFO2wpbW1KgqS8r1A1eBNBTjnEY-9OvdydWxDu5MnosEKEWKCpmcFdw2h0ZgN5CDEcMe1E1DtkCgSJlTuZfohuMVIk7DQEFX8',
];

function maskRtsp(url: string) {
  try {
    const u = new URL(url);
    const path = u.pathname ? '/•••••••••••••' : '';
    return `${u.protocol}//${u.hostname}${path}`;
  } catch {
    return '••••••••';
  }
}

function generateUUID(id: number): string {
  const padded = String(id).padStart(4, '0');
  return `8829-${padded.slice(0, 4)}`;
}

export default function CamerasScreen() {
  const realtimeTick = useRealtimeTick();
  const T = useStitchTheme();
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);
  const [items, setItems] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ camera_name: '', rtsp_url: '' });

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
  }, [load, realtimeTick]);

  const online = useMemo(() => items.filter((c) => c.is_enabled).length, [items]);
  const issues = useMemo(() => items.filter((c) => !c.is_enabled).length, [items]);

  const handleAdd = () => {
    setEditingCamera(null);
    setFormData({ camera_name: '', rtsp_url: '' });
    setShowModal(true);
  };

  const handleEdit = (camera: Camera) => {
    setEditingCamera(camera);
    setFormData({ camera_name: camera.camera_name, rtsp_url: camera.rtsp_url });
    setShowModal(true);
  };

  const handleDelete = (camera: Camera) => {
    Alert.alert(
      'Delete Camera',
      `Are you sure you want to delete "${camera.camera_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api(`/api/v1/cameras/${camera.id}`, { method: 'DELETE' });
              await load();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete camera');
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!formData.camera_name.trim() || !formData.rtsp_url.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setSaving(true);
    try {
      if (editingCamera) {
        await api(`/api/v1/cameras/${editingCamera.id}`, {
          method: 'PATCH',
          body: JSON.stringify(formData),
        });
      } else {
        await api('/api/v1/cameras', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      setShowModal(false);
      await load();
    } catch (e) {
      Alert.alert('Error', 'Failed to save camera');
    } finally {
      setSaving(false);
    }
  };

  const renderCameraCard = ({ item, index }: { item: Camera; index: number }) => {
    const previewUrl = CAMERA_PREVIEWS[index % CAMERA_PREVIEWS.length];
    const isOnline = item.is_enabled;

    return (
      <View style={[styles.card, { backgroundColor: Stitch.surfaceContainer }]}>
        <View style={styles.previewContainer}>
          {isOnline ? (
            <Image
              source={{ uri: previewUrl }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.previewOffline, { backgroundColor: Stitch.surfaceContainerLowest }]}>
              <MaterialCommunityIcons name="video-off" size={40} color={`${Stitch.error}33`} />
              <Text style={[styles.offlineText, { color: Stitch.error }]}>Signal Lost</Text>
            </View>
          )}
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? Stitch.secondary : Stitch.error }]} />
            <Text style={[styles.statusText, { color: isOnline ? Stitch.onSecondaryContainer : '#ffdad6' }]}>
              {isOnline ? 'Live' : 'Offline'}
            </Text>
          </View>
          <View style={styles.previewGradient} />
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.camName, { color: Stitch.onSurface }]}>{item.camera_name}</Text>
              <Text style={[styles.camUuid, { color: Stitch.outline }]}>UUID: {generateUUID(item.id)}</Text>
            </View>
          </View>
          <View style={[styles.rtspRow, { backgroundColor: Stitch.surfaceContainerLowest }]}>
            <MaterialCommunityIcons name="link-variant" size={14} color={Stitch.primary} />
            <Text style={[styles.rtsp, { color: Stitch.onSurfaceVariant }]}>{maskRtsp(item.rtsp_url)}</Text>
          </View>
          {isAdmin && (
            <View style={styles.actions}>
              <Pressable style={[styles.actionBtn, { backgroundColor: Stitch.surfaceContainerHighest }]} onPress={() => handleEdit(item)}>
                <MaterialCommunityIcons name="pencil" size={16} color={Stitch.primary} />
                <Text style={[styles.actionTxt, { color: Stitch.primary }]}>Edit</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: Stitch.surfaceContainerHighest }]}
                onPress={() => handleDelete(item)}
              >
                <MaterialCommunityIcons name="delete" size={16} color={Stitch.error} />
                <Text style={[styles.actionTxt, { color: Stitch.error }]}>Delete</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  };

  const header = (
    <View style={styles.hero}>
      <Text style={[styles.eyebrow, { color: Stitch.primary }]}>Network Management</Text>
      <Text style={[styles.h1, { color: Stitch.onSurface }]}>Active Cameras</Text>
      <Text style={[styles.heroSub, { color: Stitch.onSurfaceVariant, marginTop: 8 }]}>
        Manage your distributed security nodes and monitor real-time stream connectivity across the infrastructure.
      </Text>
      <View style={[styles.summary, { backgroundColor: Stitch.surfaceContainerLow }]}>
        <View style={styles.sumCol}>
          <Text style={[styles.sumLbl, { color: Stitch.onSurfaceVariant }]}>Total Nodes</Text>
          <Text style={[styles.sumVal, { color: Stitch.onSurface }]}>{items.length.toString().padStart(2, '0')}</Text>
        </View>
        <View style={styles.sumCol}>
          <Text style={[styles.sumLbl, { color: Stitch.onSurfaceVariant }]}>Online</Text>
          <Text style={[styles.sumVal, { color: Stitch.secondary }]}>{online.toString().padStart(2, '0')}</Text>
        </View>
        <View style={styles.sumCol}>
          <Text style={[styles.sumLbl, { color: Stitch.onSurfaceVariant }]}>Issues</Text>
          <Text style={[styles.sumVal, { color: Stitch.error }]}>{issues.toString().padStart(2, '0')}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: Stitch.surface }]}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
        contentContainerStyle={[styles.pad, { paddingBottom: 100 }]}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: Stitch.onSurfaceVariant }]}>{loading ? 'Loading…' : 'No cameras.'}</Text>
        }
        renderItem={renderCameraCard}
      />
      {isAdmin && (
        <Pressable style={[styles.fab, { backgroundColor: Stitch.primary }]} onPress={handleAdd}>
          <MaterialCommunityIcons name="plus" size={28} color={Stitch.onPrimary} />
        </Pressable>
      )}

      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: Stitch.surfaceContainer }]}>
            <ScrollView>
              <Text style={[styles.modalTitle, { color: Stitch.onSurface }]}>
                {editingCamera ? 'Edit Camera' : 'Add Camera'}
              </Text>
              <Text style={[styles.modalLabel, { color: Stitch.primary }]}>Camera Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: Stitch.surfaceContainerLowest, color: Stitch.onSurface, borderColor: Stitch.outlineVariant }]}
                value={formData.camera_name}
                onChangeText={(text) => setFormData({ ...formData, camera_name: text })}
                placeholder="Front Gate"
                placeholderTextColor={Stitch.outline}
              />
              <Text style={[styles.modalLabel, { color: Stitch.primary }]}>RTSP URL</Text>
              <TextInput
                style={[styles.input, { backgroundColor: Stitch.surfaceContainerLowest, color: Stitch.onSurface, borderColor: Stitch.outlineVariant }]}
                value={formData.rtsp_url}
                onChangeText={(text) => setFormData({ ...formData, rtsp_url: text })}
                placeholder="rtsp://192.168.1.100/stream"
                placeholderTextColor={Stitch.outline}
                autoCapitalize="none"
              />
              <View style={styles.modalActions}>
                <Pressable style={[styles.modalBtn, { backgroundColor: Stitch.surfaceContainerHighest }]} onPress={() => setShowModal(false)}>
                  <Text style={[styles.modalBtnTxt, { color: Stitch.onSurface }]}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.modalBtn, { backgroundColor: Stitch.primary }]} onPress={handleSave} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator size="small" color={Stitch.onPrimary} />
                  ) : (
                    <Text style={[styles.modalBtnTxt, { color: Stitch.onPrimary }]}>Save</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { marginBottom: 24 },
  eyebrow: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  h1: {
    fontFamily: FontFamily.headlineBlack,
    fontSize: 32,
    marginTop: 4,
  },
  heroSub: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 20,
  },
  pad: { padding: 16, gap: 16 },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: `${Stitch.primary}20`,
  },
  sumCol: { alignItems: 'center', flex: 1 },
  sumLbl: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sumVal: {
    fontFamily: FontFamily.headlineBlack,
    fontSize: 22,
    marginTop: 4,
  },
  card: { borderRadius: 16, overflow: 'hidden' },
  previewContainer: { height: 160, position: 'relative' },
  previewImage: { width: '100%', height: '100%', opacity: 0.6 },
  previewOffline: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', gap: 8 },
  offlineText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  previewGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'transparent',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardContent: { padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  camName: {
    fontFamily: FontFamily.headline,
    fontSize: 18,
    fontWeight: '700',
  },
  camUuid: {
    fontFamily: FontFamily.labelMedium,
    fontSize: 11,
    marginTop: 2,
  },
  rtspRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rtsp: { fontSize: 11, flex: 1, fontFamily: 'monospace' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
  },
  actionTxt: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 13,
  },
  empty: { textAlign: 'center', marginTop: 40 },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: Stitch.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontFamily: FontFamily.headlineBlack,
    fontSize: 24,
    marginBottom: 20,
  },
  modalLabel: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: FontFamily.body,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnTxt: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 16,
  },
});
