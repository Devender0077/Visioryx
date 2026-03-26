import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stitch, FontFamily } from '@/constants/stitchTheme';
import { useStitchTheme } from '@/hooks/useStitchTheme';
import { stitchStyles } from '@/styles/stitchStyles';

export default function EnrollTabScreen() {
  const T = useStitchTheme();
  const dashboard =
    (process.env.EXPO_PUBLIC_DASHBOARD_URL || '').replace(/\/$/, '') ||
    'http://localhost:3000';

  return (
    <View style={[styles.root, { backgroundColor: T.bg, paddingBottom: T.tabBarPadBottom }]}>
      <MaterialCommunityIcons name="face-recognition" size={64} color={T.accent} style={{ alignSelf: 'center' }} />
      <Text style={[stitchStyles.screenTitle, { color: T.accent, textAlign: 'center', marginTop: 16 }]}>
        Face enrollment
      </Text>
      <Text style={[stitchStyles.heroSub, { color: T.textMuted, textAlign: 'center', alignSelf: 'center' }]}>
        Open the enrollment link from your email on this device, or ask an admin for a new QR code / link. The full
        multi-step capture flow runs in the Visioryx web app for best camera support.
      </Text>
      <Pressable
        style={styles.btnWrap}
        onPress={() => {
          void Linking.openURL(`${dashboard}/enroll`);
        }}
      >
        <LinearGradient
          colors={[Stitch.primary, Stitch.primaryContainer]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.btn}
        >
          <Text style={styles.btnText}>Open enrollment in browser</Text>
        </LinearGradient>
      </Pressable>
      <Text style={[styles.note, { color: T.textMuted }]}>
        Tip: set your dashboard URL in the backend (PUBLIC_DASHBOARD_URL) so links use your LAN IP instead of localhost.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, paddingTop: 40 },
  btnWrap: { marginTop: 24 },
  btn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnText: { color: Stitch.onPrimaryContainer, fontSize: 16, fontFamily: FontFamily.labelSemibold },
  note: { marginTop: 20, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
