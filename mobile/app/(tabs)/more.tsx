import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useAuth } from '@/contexts/AuthContext';
import Colors, { Brand } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];
  const isAdmin = user?.role === 'admin';
  const isSurveillance = user?.role === 'admin' || user?.role === 'operator';

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
    <ScrollView style={[styles.root, { backgroundColor: palette.background }]} contentContainerStyle={styles.pad}>
      <View style={[styles.profile, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <MaterialCommunityIcons name="account-circle" size={48} color={Brand.primary} />
        <Text style={[styles.email, { color: palette.text }]}>{user?.email}</Text>
        <Text style={[styles.role, { color: palette.textSecondary }]}>Role: {user?.role}</Text>
      </View>

      {isSurveillance ? (
        <>
          <NavRow
            icon="chart-line"
            label="Analytics"
            palette={palette}
            onPress={() => router.push('/analytics')}
          />
          <NavRow
            icon="history"
            label="Detections"
            palette={palette}
            onPress={() => router.push('/detections')}
          />
        </>
      ) : null}
      {isAdmin ? (
        <>
          <NavRow
            icon="clipboard-text-outline"
            label="Audit log"
            palette={palette}
            onPress={() => router.push('/audit')}
          />
          <NavRow
            icon="email-outline"
            label="Email & SMTP"
            palette={palette}
            onPress={() => router.push('/settings')}
          />
        </>
      ) : null}

      <Text style={[styles.ver, { color: palette.textSecondary }]}>
        Visioryx mobile · {Constants.expoConfig?.version ?? '1.0.0'}
      </Text>

      <Pressable style={styles.logout} onPress={onLogout}>
        <MaterialCommunityIcons name="logout" size={22} color={Brand.danger} />
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

type Palette = (typeof Colors)[keyof typeof Colors];

function NavRow({
  icon,
  label,
  palette,
  onPress,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  palette: Palette;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.row, { backgroundColor: palette.card, borderColor: palette.border }]}
      onPress={onPress}
    >
      <MaterialCommunityIcons name={icon} size={22} color={Brand.primary} />
      <Text style={[styles.rowLabel, { color: palette.text }]}>{label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={22} color={palette.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pad: { padding: 16, paddingBottom: 40, gap: 10 },
  profile: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  email: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  role: { fontSize: 14, marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: '500' },
  ver: { textAlign: 'center', marginTop: 16, fontSize: 12 },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    padding: 14,
  },
  logoutText: { color: Brand.danger, fontSize: 16, fontWeight: '600' },
});
