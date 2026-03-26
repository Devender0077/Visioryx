import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getDashboardBase } from '@/lib/config';
import { Stitch, FontFamily } from '@/constants/stitchTheme';
import { useStitchTheme } from '@/hooks/useStitchTheme';
import { stitchStyles } from '@/styles/stitchStyles';

/** SMTP is edited in the web dashboard; mobile opens the same page in the browser (admin). */
export default function SettingsScreen() {
  const T = useStitchTheme();
  const base = getDashboardBase();
  const smtpUrl = `${base}/settings`;

  const openWeb = async () => {
    try {
      const supported = await Linking.canOpenURL(smtpUrl);
      if (!supported) {
        Alert.alert('Cannot open browser', `Copy this URL on your computer:\n${smtpUrl}`);
        return;
      }
      await Linking.openURL(smtpUrl);
    } catch {
      Alert.alert('Open failed', `Open this URL in a desktop browser:\n${smtpUrl}`);
    }
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: T.bg }]}
      contentContainerStyle={[styles.pad, { paddingBottom: 32 }]}
    >
      <Text style={[stitchStyles.screenEyebrow, { color: T.accent }]}>Admin</Text>
      <Text style={[stitchStyles.screenH1, { fontSize: 26, color: T.text, marginTop: 4 }]}>Email & SMTP</Text>
      <Text style={[stitchStyles.heroSub, { color: T.textMuted, marginTop: 12 }]}>
        Full SMTP and notification settings use the Visioryx web dashboard (same account). Use your machine’s LAN IP in
        the URL if you’re on another device.
      </Text>

      <View style={[styles.card, { backgroundColor: T.card }]}>
        <View style={styles.row}>
          <MaterialCommunityIcons name="link-variant" size={20} color={T.accent} />
          <Text style={[styles.url, { color: T.textMuted }]} selectable>
            {smtpUrl}
          </Text>
        </View>
      </View>

      <Pressable style={styles.ctaWrap} onPress={() => void openWeb()}>
        <LinearGradient
          colors={[Stitch.primary, Stitch.primaryContainer]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cta}
        >
          <MaterialCommunityIcons name="open-in-new" size={22} color={Stitch.onPrimaryContainer} />
          <Text style={styles.ctaText}>Open SMTP settings in browser</Text>
        </LinearGradient>
      </Pressable>

      <Text style={[styles.note, { color: T.textMuted }]}>
        Tip: set <Text style={{ fontFamily: FontFamily.labelSemibold }}>EXPO_PUBLIC_DASHBOARD_URL</Text> in mobile/.env
        to your Next.js URL (e.g. http://192.168.1.7:3000) so links open on your LAN.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pad: { padding: 20 },
  card: {
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  url: { flex: 1, fontSize: 12, lineHeight: 18 },
  ctaWrap: { marginTop: 20, borderRadius: 14, overflow: 'hidden' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  ctaText: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 16,
    color: Stitch.onPrimaryContainer,
  },
  note: { marginTop: 20, fontSize: 12, lineHeight: 18 },
});
