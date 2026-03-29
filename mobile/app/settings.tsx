import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Dimensions,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Stitch, FontFamily } from '@/constants/stitchTheme';
import { useStitchTheme } from '@/hooks/useStitchTheme';
import { isAdminRole } from '@/lib/roles';

type EmailSettings = {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
  use_ssl: boolean;
  public_base_url: string;
  password_configured: boolean;
  public_dashboard_url_default: string;
};

export default function SettingsScreen() {
  const router = useRouter();
  const T = useStitchTheme();
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [testEmail, setTestEmail] = useState('');

  const [formData, setFormData] = useState({
    enabled: false,
    host: '',
    port: '587',
    user: '',
    smtp_password: '',
    from_email: '',
    from_name: '',
    use_tls: true,
    use_ssl: false,
    public_base_url: '',
  });

  const loadSettings = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    try {
      const data = await api<EmailSettings>('/api/v1/settings/email');
      setSettings(data);
      setFormData({
        enabled: data.enabled,
        host: data.host || '',
        port: String(data.port || 587),
        user: data.user || '',
        smtp_password: '',
        from_email: data.from_email || '',
        from_name: data.from_name || '',
        use_tls: data.use_tls,
        use_ssl: data.use_ssl,
        public_base_url: data.public_base_url || '',
      });
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    if (!formData.host.trim() || !formData.from_email.trim()) {
      Alert.alert('Validation Error', 'Please fill in host and from email');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        enabled: formData.enabled,
        host: formData.host.trim(),
        port: parseInt(formData.port, 10) || 587,
        user: formData.user.trim(),
        from_email: formData.from_email.trim(),
        from_name: formData.from_name.trim(),
        use_tls: formData.use_tls,
        use_ssl: formData.use_ssl,
        public_base_url: formData.public_base_url.trim(),
      };
      if (formData.smtp_password) {
        payload.smtp_password = formData.smtp_password;
      }
      
      await api('/api/v1/settings/email', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      await loadSettings();
      Alert.alert('Success', 'SMTP settings saved');
    } catch (e) {
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail.trim()) {
      Alert.alert('Validation Error', 'Please enter a test email address');
      return;
    }
    setTesting(true);
    try {
      await api('/api/v1/settings/email/test', {
        method: 'POST',
        body: JSON.stringify({ to: testEmail.trim() }),
      });
      Alert.alert('Success', `Test email sent to ${testEmail}`);
      setTestEmail('');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to send test email');
    } finally {
      setTesting(false);
    }
  };

  const openDashboard = () => {
    const base = formData.public_base_url || settings?.public_dashboard_url_default;
    if (base) {
      Linking.openURL(`${base}/settings`).catch(() => {
        Alert.alert('Error', 'Could not open browser');
      });
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.centered, { backgroundColor: Stitch.surface }]}>
        <ActivityIndicator size="large" color={Stitch.primary} />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <ScrollView style={[styles.root, { backgroundColor: Stitch.surface }]} contentContainerStyle={styles.pad}>
        <View style={styles.hero}>
          <Text style={[styles.eyebrow, { color: Stitch.primary }]}>Admin</Text>
          <Text style={[styles.title, { color: Stitch.onSurface }]}>SMTP Configuration</Text>
          <Text style={[styles.subtitle, { color: Stitch.onSurfaceVariant }]}>
            Manage email servers for alert notifications and system reports.
          </Text>
        </View>

        <View style={[styles.infoBox, { backgroundColor: `${Stitch.primary}10` }]}>
          <MaterialCommunityIcons name="information-outline" size={20} color={Stitch.primary} />
          <Text style={[styles.infoText, { color: Stitch.onSurfaceVariant }]}>
            Contact your administrator to configure SMTP settings.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: Stitch.onSurface }]}>Quick Links</Text>
        
        <Pressable style={[styles.linkCard, { backgroundColor: Stitch.surfaceContainer }]} onPress={() => router.push('/users')}>
          <View style={styles.linkLeft}>
            <MaterialCommunityIcons name="account-group-outline" size={22} color={Stitch.primary} />
            <Text style={[styles.linkTitle, { color: Stitch.onSurface }]}>User Management</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={Stitch.outline} />
        </Pressable>

        <Pressable style={[styles.linkCard, { backgroundColor: Stitch.surfaceContainer }]} onPress={() => router.push('/audit')}>
          <View style={styles.linkLeft}>
            <MaterialCommunityIcons name="clipboard-text-clock-outline" size={22} color={Stitch.primary} />
            <Text style={[styles.linkTitle, { color: Stitch.onSurface }]}>Audit Log</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={Stitch.outline} />
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[styles.root, { backgroundColor: Stitch.surface }]} contentContainerStyle={styles.pad}>
      <View style={styles.hero}>
        <Text style={[styles.eyebrow, { color: Stitch.primary }]}>Admin</Text>
        <Text style={[styles.title, { color: Stitch.onSurface }]}>SMTP Configuration</Text>
        <Text style={[styles.subtitle, { color: Stitch.onSurfaceVariant }]}>
          Configure email server for alert notifications and system reports.
        </Text>
      </View>

      <View style={[styles.toggleCard, { backgroundColor: Stitch.surfaceContainer }]}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={[styles.toggleLabel, { color: Stitch.onSurface }]}>Enable SMTP</Text>
            <Text style={[styles.toggleDesc, { color: Stitch.onSurfaceVariant }]}>
              Send email notifications for alerts
            </Text>
          </View>
          <Switch
            value={formData.enabled}
            onValueChange={(v) => setFormData({ ...formData, enabled: v })}
            trackColor={{ false: Stitch.surfaceContainerHighest, true: Stitch.primary }}
            thumbColor={Stitch.onPrimary}
          />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: Stitch.surfaceContainer }]}>
        <Text style={[styles.sectionTitle, { color: Stitch.onSurface, marginBottom: 16 }]}>Server Settings</Text>
        
        <Text style={[styles.inputLabel, { color: Stitch.primary }]}>SMTP Host</Text>
        <TextInput
          style={[styles.input, { backgroundColor: Stitch.surfaceContainerLowest, color: Stitch.onSurface, borderColor: Stitch.outlineVariant }]}
          value={formData.host}
          onChangeText={(v) => setFormData({ ...formData, host: v })}
          placeholder="smtp.gmail.com"
          placeholderTextColor={Stitch.outline}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={[styles.inputLabel, { color: Stitch.primary }]}>Port</Text>
        <TextInput
          style={[styles.input, { backgroundColor: Stitch.surfaceContainerLowest, color: Stitch.onSurface, borderColor: Stitch.outlineVariant }]}
          value={formData.port}
          onChangeText={(v) => setFormData({ ...formData, port: v })}
          placeholder="587"
          placeholderTextColor={Stitch.outline}
          keyboardType="number-pad"
        />

        <Text style={[styles.inputLabel, { color: Stitch.primary }]}>Username</Text>
        <TextInput
          style={[styles.input, { backgroundColor: Stitch.surfaceContainerLowest, color: Stitch.onSurface, borderColor: Stitch.outlineVariant }]}
          value={formData.user}
          onChangeText={(v) => setFormData({ ...formData, user: v })}
          placeholder="your@email.com"
          placeholderTextColor={Stitch.outline}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={[styles.inputLabel, { color: Stitch.primary }]}>
          Password {settings?.password_configured && <Text style={{ color: Stitch.secondary }}>(configured)</Text>}
        </Text>
        <TextInput
          style={[styles.input, { backgroundColor: Stitch.surfaceContainerLowest, color: Stitch.onSurface, borderColor: Stitch.outlineVariant }]}
          value={formData.smtp_password}
          onChangeText={(v) => setFormData({ ...formData, smtp_password: v })}
          placeholder={settings?.password_configured ? '••••••••' : 'Enter password'}
          placeholderTextColor={Stitch.outline}
          secureTextEntry
        />

        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, { color: Stitch.onSurface }]}>Use TLS</Text>
          <Switch
            value={formData.use_tls}
            onValueChange={(v) => setFormData({ ...formData, use_tls: v, use_ssl: v ? false : formData.use_ssl })}
            trackColor={{ false: Stitch.surfaceContainerHighest, true: Stitch.primary }}
            thumbColor={Stitch.onPrimary}
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, { color: Stitch.onSurface }]}>Use SSL</Text>
          <Switch
            value={formData.use_ssl}
            onValueChange={(v) => setFormData({ ...formData, use_ssl: v, use_tls: v ? false : formData.use_tls })}
            trackColor={{ false: Stitch.surfaceContainerHighest, true: Stitch.primary }}
            thumbColor={Stitch.onPrimary}
          />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: Stitch.surfaceContainer }]}>
        <Text style={[styles.sectionTitle, { color: Stitch.onSurface, marginBottom: 16 }]}>Email Settings</Text>
        
        <Text style={[styles.inputLabel, { color: Stitch.primary }]}>From Email</Text>
        <TextInput
          style={[styles.input, { backgroundColor: Stitch.surfaceContainerLowest, color: Stitch.onSurface, borderColor: Stitch.outlineVariant }]}
          value={formData.from_email}
          onChangeText={(v) => setFormData({ ...formData, from_email: v })}
          placeholder="noreply@company.com"
          placeholderTextColor={Stitch.outline}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />

        <Text style={[styles.inputLabel, { color: Stitch.primary }]}>From Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: Stitch.surfaceContainerLowest, color: Stitch.onSurface, borderColor: Stitch.outlineVariant }]}
          value={formData.from_name}
          onChangeText={(v) => setFormData({ ...formData, from_name: v })}
          placeholder="Visioryx Alert System"
          placeholderTextColor={Stitch.outline}
        />

        <Text style={[styles.inputLabel, { color: Stitch.primary }]}>Public Base URL</Text>
        <TextInput
          style={[styles.input, { backgroundColor: Stitch.surfaceContainerLowest, color: Stitch.onSurface, borderColor: Stitch.outlineVariant }]}
          value={formData.public_base_url}
          onChangeText={(v) => setFormData({ ...formData, public_base_url: v })}
          placeholder={settings?.public_dashboard_url_default || 'https://visioryx.example.com'}
          placeholderTextColor={Stitch.outline}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={[styles.hint, { color: Stitch.onSurfaceVariant }]}>
          Used for enrollment links in emails. Default: {settings?.public_dashboard_url_default}
        </Text>
      </View>

      <Pressable
        style={[styles.saveBtn, { backgroundColor: Stitch.primary }]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color={Stitch.onPrimary} />
        ) : (
          <>
            <MaterialCommunityIcons name="content-save" size={20} color={Stitch.onPrimary} />
            <Text style={styles.saveBtnText}>Save Settings</Text>
          </>
        )}
      </Pressable>

      <View style={[styles.card, { backgroundColor: Stitch.surfaceContainer }]}>
        <Text style={[styles.sectionTitle, { color: Stitch.onSurface, marginBottom: 16 }]}>Test Connection</Text>
        
        <Text style={[styles.inputLabel, { color: Stitch.primary }]}>Send Test To</Text>
        <View style={styles.testRow}>
          <TextInput
            style={[styles.testInput, { backgroundColor: Stitch.surfaceContainerLowest, color: Stitch.onSurface, borderColor: Stitch.outlineVariant }]}
            value={testEmail}
            onChangeText={setTestEmail}
            placeholder="test@example.com"
            placeholderTextColor={Stitch.outline}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          <Pressable
            style={[styles.testBtn, { backgroundColor: Stitch.primaryContainer }]}
            onPress={handleTest}
            disabled={testing || !formData.enabled}
          >
            {testing ? (
              <ActivityIndicator size="small" color={Stitch.onPrimaryContainer} />
            ) : (
              <Text style={[styles.testBtnText, { color: Stitch.onPrimaryContainer }]}>Send</Text>
            )}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  pad: { padding: 16, paddingBottom: 32 },
  hero: { marginBottom: 20 },
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
  toggleCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  toggleInfo: { flex: 1 },
  toggleLabel: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 15,
  },
  toggleDesc: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: FontFamily.headline,
    fontSize: 17,
    marginBottom: 12,
  },
  inputLabel: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    fontFamily: FontFamily.body,
  },
  hint: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    marginTop: 6,
    lineHeight: 16,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 24,
  },
  saveBtnText: {
    fontFamily: FontFamily.headline,
    fontSize: 16,
    color: Stitch.onPrimary,
  },
  testRow: {
    flexDirection: 'row',
    gap: 10,
  },
  testInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    fontFamily: FontFamily.body,
  },
  testBtn: {
    paddingHorizontal: 20,
    borderRadius: 10,
    justifyContent: 'center',
  },
  testBtnText: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: 13,
    lineHeight: 18,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  linkTitle: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 15,
  },
  linkDesc: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    marginTop: 2,
  },
});
