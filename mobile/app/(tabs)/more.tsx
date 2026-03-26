import { useCallback } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAuth } from '@/contexts/AuthContext';
import { Stitch, FontFamily } from '@/constants/stitchTheme';
import { useStitchTheme, type StitchTheme } from '@/hooks/useStitchTheme';
import { stitchStyles } from '@/styles/stitchStyles';
import { isAdminRole, isSurveillanceRole, normalizeRole } from '@/lib/roles';

export default function MoreScreen() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const T = useStitchTheme();

  const role = normalizeRole(user?.role);
  const isAdmin = isAdminRole(user?.role);
  const isSurveillance = isSurveillanceRole(user?.role);

  useFocusEffect(
    useCallback(() => {
      void refreshUser();
    }, [refreshUser]),
  );

  const roleLabel =
    role === 'admin'
      ? 'System Administrator'
      : role === 'operator'
        ? 'Surveillance operator'
        : role === 'enrollee'
          ? 'Enrollee'
          : user?.role
            ? user.role
            : 'User';

  const onLogout = () => {
    Alert.alert('Sign out', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void logout();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: T.bg }]}
      contentContainerStyle={[styles.pad, { paddingBottom: T.tabBarPadBottom }]}
    >
      <View style={styles.profileHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[stitchStyles.screenEyebrow, { color: T.accent, opacity: 0.85 }]}>Identity</Text>
          <Text style={[stitchStyles.screenH1, { fontSize: 30, marginTop: 4, color: T.text }]}>Profile</Text>
        </View>
        <View style={[styles.roleChip, { backgroundColor: T.card }]}>
          <MaterialCommunityIcons name="check-decagram" size={16} color={Stitch.secondary} />
          <Text style={[styles.roleChipTxt, { color: T.textMuted }]} numberOfLines={2}>
            {roleLabel}
          </Text>
        </View>
      </View>

      <View style={[styles.emailCard, { backgroundColor: T.card, borderLeftColor: Stitch.primary }]}>
        <Text style={[styles.emailLbl, { color: T.textMuted }]}>Connected email</Text>
        <Text style={[styles.emailVal, { color: T.text }]}>{user?.email}</Text>
      </View>

      {/* Stitch more_settings: Admin block before shortcuts for visibility */}
      {isAdmin ? (
        <>
          <View style={styles.adminHead}>
            <Text style={[stitchStyles.screenTitle, { color: T.text, fontSize: 20 }]}>Admin settings</Text>
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeTxt}>Admin only</Text>
            </View>
          </View>
          <View style={[styles.adminShell, { backgroundColor: T.cardLow }]}>
            <Pressable
              style={[styles.adminTile, { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: `${Stitch.outlineVariant}22` }]}
              onPress={() => router.push('/settings')}
            >
              <MaterialCommunityIcons name="email-outline" size={28} color={T.accent} style={styles.adminIcon} />
              <Text style={[styles.adminTitle, { color: T.text }]}>SMTP configuration</Text>
              <Text style={[styles.adminSub, { color: T.textMuted }]}>
                Manage email servers for alert notifications and system reports.
              </Text>
              <View style={styles.rowHint}>
                <Text style={[styles.openHint, { color: T.accent }]}>Configure in app →</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color={T.accent} />
              </View>
            </Pressable>
            <Pressable style={styles.adminTile} onPress={() => router.push('/audit')}>
              <MaterialCommunityIcons name="clipboard-text-clock-outline" size={28} color={T.accent} style={styles.adminIcon} />
              <Text style={[styles.adminTitle, { color: T.text }]}>Audit log</Text>
              <Text style={[styles.adminSub, { color: T.textMuted }]}>
                Complete chronological record of all system access and changes.
              </Text>
              <View style={styles.rowHint}>
                <Text style={[styles.openHint, { color: T.accent }]}>View log →</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color={T.accent} />
              </View>
            </Pressable>
          </View>
        </>
      ) : null}

      {isSurveillance ? (
        <>
          <Text style={[stitchStyles.sectionLabel, { color: T.textMuted, marginTop: isAdmin ? 4 : 8 }]}>Shortcuts</Text>
          <NavRow
            icon="chart-line"
            title="Analytics"
            subtitle="Visualized security insights"
            T={T}
            onPress={() => router.push('/analytics')}
          />
          <NavRow
            icon="radar"
            title="Detections"
            subtitle="Review motion and AI triggers"
            T={T}
            onPress={() => router.push('/detections')}
          />
        </>
      ) : null}

      <View style={[styles.metaBox, { backgroundColor: `${Stitch.surfaceContainerLowest}88`, borderColor: `${Stitch.outlineVariant}18` }]}>
        <View style={styles.metaCol}>
          <Text style={styles.metaLbl}>App version</Text>
          <Text style={[styles.metaVal, { color: T.text }]}>v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
        </View>
        <View style={[styles.metaDivider, { backgroundColor: `${Stitch.outlineVariant}33` }]} />
        <View style={styles.metaCol}>
          <Text style={styles.metaLbl}>Status</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: Stitch.secondary }]} />
            <Text style={[styles.statusTxt, { color: T.text }]}>Fully operational</Text>
          </View>
        </View>
      </View>

      <Pressable style={styles.logout} onPress={onLogout}>
        <MaterialCommunityIcons name="logout" size={22} color={Stitch.error} />
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

function NavRow({
  icon,
  title,
  subtitle,
  T,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  subtitle: string;
  T: StitchTheme;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.row, { backgroundColor: T.card }]} onPress={onPress}>
      <View style={[styles.rowIcon, { backgroundColor: Stitch.surfaceContainerHighest }]}>
        <MaterialCommunityIcons name={icon} size={24} color={T.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: T.text }]}>{title}</Text>
        <Text style={[styles.rowSub, { color: T.textMuted }]}>{subtitle}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={T.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pad: { padding: 16, gap: 12 },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 12,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    maxWidth: '46%',
  },
  roleChipTxt: { fontFamily: FontFamily.labelMedium, fontSize: 12, flexShrink: 1 },
  emailCard: {
    borderRadius: 14,
    padding: 20,
    borderLeftWidth: 4,
  },
  emailLbl: {
    fontFamily: FontFamily.labelMedium,
    fontSize: 13,
  },
  emailVal: {
    fontFamily: FontFamily.headlineBlack,
    fontSize: 20,
    marginTop: 6,
  },
  adminHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  adminBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 180, 171, 0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 180, 171, 0.25)',
  },
  adminBadgeTxt: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Stitch.error,
  },
  adminShell: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  adminTile: {
    padding: 20,
    gap: 6,
  },
  adminIcon: { marginBottom: 4 },
  adminTitle: { fontFamily: FontFamily.headline, fontSize: 18 },
  adminSub: { fontFamily: FontFamily.body, fontSize: 13, lineHeight: 20 },
  rowHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 4,
  },
  openHint: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 14,
  },
  rowIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontFamily: FontFamily.headline, fontSize: 17 },
  rowSub: { fontFamily: FontFamily.body, fontSize: 13, marginTop: 2 },
  metaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  metaCol: { alignItems: 'center', flex: 1 },
  metaDivider: { width: 1, height: 36 },
  metaLbl: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Stitch.outline,
  },
  metaVal: {
    fontFamily: FontFamily.headline,
    fontSize: 14,
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTxt: {
    fontFamily: FontFamily.labelMedium,
    fontSize: 14,
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    padding: 14,
  },
  logoutText: { color: Stitch.error, fontSize: 16, fontFamily: FontFamily.labelSemibold },
});
