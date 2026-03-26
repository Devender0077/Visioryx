import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors, { Brand } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function EnrollTabScreen() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];
  const dashboard =
    (process.env.EXPO_PUBLIC_DASHBOARD_URL || '').replace(/\/$/, '') ||
    'http://localhost:3000';

  return (
    <View style={[styles.root, { backgroundColor: palette.background }]}>
      <MaterialCommunityIcons name="face-recognition" size={64} color={Brand.primary} style={{ alignSelf: 'center' }} />
      <Text style={[styles.title, { color: palette.text }]}>Face enrollment</Text>
      <Text style={[styles.body, { color: palette.textSecondary }]}>
        Open the enrollment link from your email on this device, or ask an admin for a new QR code / link. The full
        multi-step capture flow runs in the Visioryx web app for best camera support.
      </Text>
      <Pressable
        style={styles.btn}
        onPress={() => {
          void Linking.openURL(`${dashboard}/enroll`);
        }}
      >
        <Text style={styles.btnText}>Open enrollment in browser</Text>
      </Pressable>
      <Text style={[styles.note, { color: palette.textSecondary }]}>
        Tip: set your dashboard URL in the backend (PUBLIC_DASHBOARD_URL) so links use your LAN IP instead of localhost.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, paddingTop: 40 },
  title: { fontSize: 22, fontWeight: '700', marginTop: 16, textAlign: 'center' },
  body: { marginTop: 12, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  btn: {
    marginTop: 24,
    backgroundColor: Brand.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  note: { marginTop: 20, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
