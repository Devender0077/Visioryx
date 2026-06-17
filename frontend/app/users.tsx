import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  Image,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/lib/api';
import { useStitchTheme } from '@/hooks/useStitchTheme';
import { Stitch, FontFamily } from '@/constants/stitchTheme';
import { useRealtimeTick } from '@/contexts/RealtimeContext';
import { isAdminRole } from '@/lib/roles';
import { useAuth } from '@/contexts/AuthContext';

type User = {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  has_face_embedding: boolean;
  image_path?: string;
  role?: string;
};

const ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full system access' },
  { value: 'operator', label: 'Operator', description: 'Camera & detection access' },
  { value: 'enrollee', label: 'Enrollee', description: 'Face enrollment only' },
];

export default function UsersScreen() {
  const realtimeTick = useRealtimeTick();
  const router = useRouter();
  const T = useStitchTheme();
  const { user: currentUser } = useAuth();
  const isAdmin = isAdminRole(currentUser?.role);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [addVisible, setAddVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('operator');
  const [adding, setAdding] = useState(false);
  const [menuVisible, setMenuVisible] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [editRoleUser, setEditRoleUser] = useState<User | null>(null);
  const [updatingRole, setUpdatingRole] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const r = await api<{ items: User[]; total: number }>('/api/v1/users?limit=100&offset=0');
      setUsers(r.items ?? []);
      setTotal(r.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, realtimeTick]);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const enrolledCount = users.filter(u => u.has_face_embedding).length;
  const pendingCount = users.filter(u => !u.has_face_embedding).length;
  const activeCount = users.filter(u => u.is_active).length;

  const handleAddUser = async () => {
    if (!newName.trim() || !newEmail.trim()) {
      Alert.alert('Validation Error', 'Please enter name and email');
      return;
    }
    setAdding(true);
    try {
      await api('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), email: newEmail.trim(), role: newRole }),
      });
      setAddVisible(false);
      setNewName('');
      setNewEmail('');
      setNewRole('operator');
      load();
    } catch (e) {
      Alert.alert('Registration Failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteUser = (u: User) => {
    setMenuVisible(null);
    Alert.alert('Delete User', `Are you sure you want to delete ${u.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api(`/api/v1/users/${u.id}`, { method: 'DELETE' });
            load();
          } catch (e) {
            Alert.alert('Delete Failed', e instanceof Error ? e.message : 'Unknown error');
          }
        },
      },
    ]);
  };

  const handleSendEnrollmentLink = async (u: User) => {
    setMenuVisible(null);
    try {
      const result = await api<{ ok: boolean; sent_to?: string; enroll_url?: string }>(`/api/v1/users/${u.id}/enrollment-link`, {
        method: 'POST',
      });
      if (result.ok) {
        Alert.alert('Success', `Enrollment link generated for ${u.name}.${result.enroll_url ? `\n\nLink: ${result.enroll_url}` : ''}`);
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to generate enrollment link');
    }
  };

  const handleViewPhoto = (u: User) => {
    setMenuVisible(null);
    if (u.image_path) {
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
      const imageUrl = `${baseUrl}${u.image_path}`;
      Linking.openURL(imageUrl).catch(() => {
        Alert.alert('Error', 'Could not open image');
      });
    } else {
      Alert.alert('No Photo', 'This user does not have a photo enrolled.');
    }
  };

  const handleEditRole = (u: User) => {
    setMenuVisible(null);
    setEditRoleUser(u);
    setRoleModalVisible(true);
  };

  const handleUpdateRole = async (newRole: string) => {
    if (!editRoleUser) return;
    setUpdatingRole(true);
    try {
      await api(`/api/v1/users/${editRoleUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      setRoleModalVisible(false);
      setEditRoleUser(null);
      load();
      Alert.alert('Success', 'User role updated successfully');
    } catch (e) {
      Alert.alert('Error', 'Failed to update role');
    } finally {
      setUpdatingRole(false);
    }
  };

  const renderHeader = () => (
    <View>
      <View style={styles.hero}>
        <Text style={[styles.eyebrow, { color: Stitch.primary }]}>Directory</Text>
        <Text style={[styles.title, { color: Stitch.onSurface }]}>User Management</Text>
        <Text style={[styles.subtitle, { color: Stitch.onSurfaceVariant }]}>
          Oversee access controls and biometrics enrollment status for your security perimeter.
        </Text>
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: Stitch.surfaceContainerLowest }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={Stitch.outline} />
          <TextInput
            style={[styles.searchInput, { color: Stitch.onSurface }]}
            placeholder="Search by name..."
            placeholderTextColor={Stitch.outline}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <Pressable onPress={() => setAddVisible(true)}>
          <LinearGradient
            colors={[Stitch.primary, Stitch.primaryContainer]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addBtn}
          >
            <MaterialCommunityIcons name="plus" size={20} color={Stitch.onPrimary} />
          </LinearGradient>
        </Pressable>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: Stitch.surfaceContainerLow }]}>
          <View style={styles.statHeader}>
            <Text style={[styles.statLabel, { color: Stitch.onSurfaceVariant }]}>Total Enrolled</Text>
            <MaterialCommunityIcons name="account-multiple" size={18} color={Stitch.primary} />
          </View>
          <Text style={[styles.statValue, { color: Stitch.onSurface }]}>{enrolledCount.toLocaleString()}</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: Stitch.surfaceContainerLow }]}>
          <View style={styles.statHeader}>
            <Text style={[styles.statLabel, { color: Stitch.onSurfaceVariant }]}>Pending</Text>
            <MaterialCommunityIcons name="clock-outline" size={18} color={Stitch.tertiary} />
          </View>
          <Text style={[styles.statValue, { color: Stitch.onSurface }]}>{pendingCount.toLocaleString()}</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: Stitch.surfaceContainerLow }]}>
          <View style={styles.statHeader}>
            <Text style={[styles.statLabel, { color: Stitch.onSurfaceVariant }]}>Active</Text>
            <MaterialCommunityIcons name="pulse" size={18} color={Stitch.secondary} />
          </View>
          <Text style={[styles.statValue, { color: Stitch.onSurface }]}>{activeCount.toLocaleString()}</Text>
        </View>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: User }) => (
    <View style={[styles.userCard, { backgroundColor: Stitch.surfaceContainer }]}>
      <View style={styles.cardMain}>
        <View style={[styles.avatar, { borderColor: item.has_face_embedding ? `${Stitch.primary}33` : `${Stitch.outlineVariant}33` }]}>
          {item.image_path ? (
            <Image source={{ uri: `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'}${item.image_path}` }} style={styles.avatarImage} />
          ) : (
            <MaterialCommunityIcons 
              name={item.has_face_embedding ? 'face-recognition' : 'account'} 
              size={22} 
              color={item.has_face_embedding ? Stitch.primary : Stitch.outline} 
            />
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: Stitch.onSurface }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.userEmail, { color: Stitch.onSurfaceVariant }]} numberOfLines={1}>{item.email}</Text>
          <Text style={[styles.userId, { color: Stitch.outline }]}>ID: VX-{String(item.id).padStart(5, '0')}</Text>
        </View>

        <View style={styles.actionsContainer}>
          <View style={[styles.roleBadge, { backgroundColor: item.role === 'admin' ? `${Stitch.primary}22` : Stitch.surfaceContainerHigh }]}>
            <Text style={[styles.roleText, { color: item.role === 'admin' ? Stitch.primary : Stitch.onSurfaceVariant }]}>
              {item.role || 'Operator'}
            </Text>
          </View>
          
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: item.has_face_embedding ? Stitch.secondary : Stitch.tertiary }]} />
            <Text style={[styles.statusText, { color: item.has_face_embedding ? Stitch.secondary : Stitch.tertiary }]}>
              {item.has_face_embedding ? 'Enrolled' : 'Pending'}
            </Text>
          </View>

          <Pressable 
            style={[styles.moreBtn, { backgroundColor: menuVisible === item.id ? Stitch.primary : Stitch.surfaceContainerHighest }]}
            onPress={() => setMenuVisible(menuVisible === item.id ? null : item.id)}
          >
            <MaterialCommunityIcons name="dots-vertical" size={18} color={menuVisible === item.id ? Stitch.onPrimary : Stitch.onSurfaceVariant} />
          </Pressable>
        </View>
      </View>

      {menuVisible === item.id && (
        <View style={[styles.menu, { backgroundColor: Stitch.surfaceContainerHigh }]}>
          <Pressable style={styles.menuItem} onPress={() => handleSendEnrollmentLink(item)}>
            <MaterialCommunityIcons name="email-outline" size={18} color={Stitch.primary} />
            <Text style={[styles.menuText, { color: Stitch.onSurface }]}>Send Enrollment Link</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => handleViewPhoto(item)}>
            <MaterialCommunityIcons name="eye-outline" size={18} color={Stitch.primary} />
            <Text style={[styles.menuText, { color: Stitch.onSurface }]}>View Photo</Text>
          </Pressable>
          {isAdmin && (
            <Pressable style={styles.menuItem} onPress={() => handleEditRole(item)}>
              <MaterialCommunityIcons name="account-cog" size={18} color={Stitch.primary} />
              <Text style={[styles.menuText, { color: Stitch.onSurface }]}>Edit Role</Text>
            </Pressable>
          )}
          <View style={[styles.menuDivider, { borderColor: Stitch.outlineVariant }]} />
          <Pressable style={styles.menuItem} onPress={() => handleDeleteUser(item)}>
            <MaterialCommunityIcons name="delete-outline" size={18} color={Stitch.error} />
            <Text style={[styles.menuText, { color: Stitch.error }]}>Delete</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: Stitch.surface }]}>
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={renderHeader}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
        contentContainerStyle={[styles.listPad, { paddingBottom: 24 }]}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: Stitch.onSurfaceVariant }]}>
            {loading ? 'Loading…' : error ? '' : 'No users registered.'}
          </Text>
        }
        renderItem={renderItem}
      />
      {menuVisible !== null && (
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(null)} />
      )}

      <Modal visible={addVisible} transparent animationType="fade" onRequestClose={() => setAddVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: Stitch.surfaceContainer }]}>
            <Text style={[styles.modalTitle, { color: Stitch.onSurface }]}>System Registration</Text>
            <Text style={[styles.modalSub, { color: Stitch.onSurfaceVariant }]}>
              Initialize a new user protocol in the Visioryx network.
            </Text>
            
            <Text style={[styles.modalLabel, { color: Stitch.primary }]}>Full Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: Stitch.surfaceContainerLowest, color: Stitch.onSurface, borderColor: Stitch.outlineVariant }]}
              placeholder="e.g. John Doe"
              placeholderTextColor={Stitch.outline}
              value={newName}
              onChangeText={setNewName}
            />
            
            <Text style={[styles.modalLabel, { color: Stitch.primary }]}>Email Address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: Stitch.surfaceContainerLowest, color: Stitch.onSurface, borderColor: Stitch.outlineVariant }]}
              placeholder="name@company.com"
              placeholderTextColor={Stitch.outline}
              keyboardType="email-address"
              autoCapitalize="none"
              value={newEmail}
              onChangeText={setNewEmail}
            />

            {isAdmin && (
              <>
                <Text style={[styles.modalLabel, { color: Stitch.primary }]}>Role</Text>
                <View style={styles.roleSelector}>
                  {ROLES.map((role) => (
                    <Pressable
                      key={role.value}
                      style={[styles.roleOption, newRole === role.value && styles.roleOptionSelected]}
                      onPress={() => setNewRole(role.value)}
                    >
                      <Text style={[styles.roleOptionText, newRole === role.value && styles.roleOptionTextSelected]}>
                        {role.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, { backgroundColor: Stitch.surfaceContainerHighest }]} onPress={() => setAddVisible(false)}>
                <Text style={[styles.modalBtnText, { color: Stitch.onSurface }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: Stitch.primary }]}
                onPress={handleAddUser}
                disabled={adding}
              >
                {adding ? (
                  <ActivityIndicator size="small" color={Stitch.onPrimary} />
                ) : (
                  <Text style={[styles.modalBtnText, { color: Stitch.onPrimary }]}>Authorize</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={roleModalVisible} transparent animationType="fade" onRequestClose={() => setRoleModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setRoleModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: Stitch.surfaceContainer }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.modalTitle, { color: Stitch.onSurface }]}>Edit User Role</Text>
            <Text style={[styles.modalSub, { color: Stitch.onSurfaceVariant, marginBottom: 16 }]}>
              Select a new role for {editRoleUser?.name}
            </Text>
            <ScrollView>
              {ROLES.map((role) => (
                <Pressable
                  key={role.value}
                  style={[styles.roleCard, editRoleUser?.role === role.value && styles.roleCardSelected]}
                  onPress={() => handleUpdateRole(role.value)}
                >
                  <View style={styles.roleCardContent}>
                    <Text style={[styles.roleCardLabel, { color: Stitch.onSurface }]}>{role.label}</Text>
                    <Text style={[styles.roleCardDesc, { color: Stitch.onSurfaceVariant }]}>{role.description}</Text>
                  </View>
                  {editRoleUser?.role === role.value && (
                    <MaterialCommunityIcons name="check-circle" size={24} color={Stitch.primary} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, { backgroundColor: Stitch.surfaceContainerHighest }]} onPress={() => setRoleModalVisible(false)}>
                <Text style={[styles.modalBtnText, { color: Stitch.onSurface }]}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { marginBottom: 16 },
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
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: FontFamily.headlineBlack,
    fontSize: 24,
  },
  listPad: { padding: 16, gap: 12 },
  userCard: {
    borderRadius: 14,
    padding: 14,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Stitch.surfaceContainerHigh,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 16,
  },
  userEmail: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    marginTop: 2,
  },
  userId: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    marginTop: 2,
  },
  actionsContainer: {
    alignItems: 'flex-end',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: FontFamily.labelMedium,
    fontSize: 12,
  },
  moreBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menu: {
    position: 'absolute',
    right: 14,
    top: 70,
    width: 200,
    borderRadius: 12,
    padding: 8,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  menuText: {
    fontFamily: FontFamily.body,
    fontSize: 14,
  },
  menuDivider: {
    borderTopWidth: 1,
    marginVertical: 4,
  },
  empty: { textAlign: 'center', marginTop: 40 },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontFamily: FontFamily.headlineBlack,
    fontSize: 22,
  },
  modalSub: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 20,
  },
  modalLabel: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    fontFamily: FontFamily.body,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 90,
    alignItems: 'center',
  },
  modalBtnText: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 14,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: Stitch.surfaceContainerHigh,
    alignItems: 'center',
  },
  roleOptionSelected: {
    backgroundColor: Stitch.primary,
  },
  roleOptionText: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 12,
    color: Stitch.onSurfaceVariant,
  },
  roleOptionTextSelected: {
    color: Stitch.onPrimary,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: Stitch.surfaceContainerHigh,
    marginBottom: 10,
  },
  roleCardSelected: {
    borderWidth: 2,
    borderColor: Stitch.primary,
  },
  roleCardContent: {
    flex: 1,
  },
  roleCardLabel: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 16,
  },
  roleCardDesc: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    marginTop: 2,
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
});
