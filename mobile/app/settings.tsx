import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

/** SMTP is managed in the web dashboard; deep link here for parity with Stitch IA. */
export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];

  return (
    <ScrollView style={[styles.root, { backgroundColor: palette.background }]} contentContainerStyle={styles.pad}>
      <Text style={[styles.body, { color: palette.text }]}>
        Email & SMTP settings are configured in the Visioryx web app under{' '}
        <Text style={{ fontWeight: '700' }}>Email & SMTP</Text> (admin). Use the same browser session on a desktop or
        tablet for the full form.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pad: { padding: 20 },
  body: { fontSize: 15, lineHeight: 22 },
});
