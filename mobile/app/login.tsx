import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { Stitch, FontFamily } from '@/constants/stitchTheme';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { LAN_TROUBLESHOOTING, publicApi, testApiReachable } from '@/lib/api';
import { getApiBase, setCustomApiBase, getDashboardBase, setCustomDashboardBase, fetchPublicApiUrl } from '@/lib/config';

const API_URL_KEY = 'custom_api_url';
const MEDIAMTX_URL_KEY = 'custom_mediamtx_url';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testingApi, setTestingApi] = useState(false);
  const [apiVersion, setApiVersion] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showApiModal, setShowApiModal] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState('');
  const [mediamtxUrl, setMediamtxUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    void publicApi<{ backend_version?: string }>('/api/v1/meta/version')
      .then((r) => {
        if (!cancelled && r.backend_version) setApiVersion(r.backend_version);
      })
      .catch(() => {
        if (!cancelled) setApiVersion(null);
      });
    void fetchPublicApiUrl();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const loadSecure = async () => {
      try {
        const url = await SecureStore.getItemAsync(API_URL_KEY);
        if (url) {
          setCustomApiBase(url);
          setCustomDashboardBase(url.replace(':8000', ':3000').replace('/api/v1', ''));
          setCustomApiUrl(url);
        }
      } catch {}
      try {
        const mtxUrl = await SecureStore.getItemAsync(MEDIAMTX_URL_KEY);
        if (mtxUrl) {
          setMediamtxUrl(mtxUrl);
        }
      } catch {}
    };
    loadSecure();
  }, []);

  const saveCustomApiUrl = async () => {
    const url = customApiUrl.trim();
    const mtx = mediamtxUrl.trim();
    if (url) {
      await SecureStore.setItemAsync(API_URL_KEY, url);
      setCustomApiBase(url);
      setCustomDashboardBase(url.replace(':8000', ':3000').replace('/api/v1', ''));
    } else {
      await SecureStore.deleteItemAsync(API_URL_KEY);
      setCustomApiBase(null);
      setCustomDashboardBase(null);
    }
    if (mtx) {
      await SecureStore.setItemAsync(MEDIAMTX_URL_KEY, mtx);
    } else {
      await SecureStore.deleteItemAsync(MEDIAMTX_URL_KEY);
    }
    Alert.alert('Saved', 'URLs updated. Please restart the app for full effect.');
    setShowApiModal(false);
  };

  const runConnectionTest = async () => {
    setTestingApi(true);
    try {
      const r = await testApiReachable();
      Alert.alert(
        r.ok ? 'Connection OK' : 'Cannot reach API',
        `${r.detail}\n\n${LAN_TROUBLESHOOTING}`,
      );
    } finally {
      setTestingApi(false);
    }
  };

  const onSubmit = async () => {
    setLoginError(null);
    if (!email.trim() || !password) {
      setLoginError('Enter email and password.');
      return;
    }
    if (password.length < 8) {
      setLoginError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      await login(email.trim(), password, rememberMe);
      router.replace('/(tabs)');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setLoginError('Invalid login credentials. Please try again.');
      const credIssue =
        /invalid email|password|account disabled|too many failed/i.test(msg) ||
        msg.includes('429');
      if (!credIssue) {
        // Network / server issue — also show detailed alert
        Alert.alert('Sign in failed', `${msg}\n\n${LAN_TROUBLESHOOTING}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRecovery = async () => {
    if (!email.trim()) {
      Alert.alert('Recovery', 'Please enter your email address first.');
      return;
    }
    setBusy(true);
    try {
      const result = await publicApi<{ ok: boolean; message: string }>('/api/v1/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      Alert.alert('Password Recovery', result.message);
    } catch (e) {
      Alert.alert('Error', 'Failed to process recovery request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0b1326', '#131b2e']}
      style={styles.gradient}
    >
      {/* Decorative glow blobs matching stitch */}
      <View style={styles.blobTopRight} pointerEvents="none" />
      <View style={styles.blobBottomLeft} pointerEvents="none" />

      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Top branding — matches stitch header */}
          <View style={styles.brandRow}>
            <MaterialCommunityIcons name="shield-lock" size={22} color={Stitch.primary} />
            <Text style={styles.brandName}>Visioryx</Text>
          </View>

          {/* Glass card */}
          <View style={styles.card}>
            <View style={styles.cardIntro}>
              <Text style={styles.cardTitle}>Secure Access</Text>
              <Text style={styles.cardSub}>Enter your credentials to monitor your assets.</Text>
            </View>

            {/* Inline error banner — like stitch error state */}
            {loginError ? (
              <View style={styles.errorBanner}>
                <MaterialCommunityIcons name="alert-circle-outline" size={20} color={Stitch.error} />
                <Text style={styles.errorText}>{loginError}</Text>
              </View>
            ) : null}

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Work Email</Text>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="email-outline" size={20} color={Stitch.outline} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="name@company.com"
                  placeholderTextColor={`${Stitch.outline}80`}
                  value={email}
                  onChangeText={(v) => { setEmail(v); setLoginError(null); }}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Access Code</Text>
                <Pressable onPress={handleRecovery}>
                  <Text style={styles.recoveryLink}>Recovery</Text>
                </Pressable>
              </View>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="lock-outline" size={20} color={Stitch.outline} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  placeholder="••••••••"
                  placeholderTextColor={`${Stitch.outline}80`}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setLoginError(null); }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
                  <MaterialCommunityIcons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={Stitch.outline}
                  />
                </Pressable>
              </View>
            </View>

            {/* Remember Me */}
            <Pressable style={styles.rememberRow} onPress={() => setRememberMe(!rememberMe)}>
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <MaterialCommunityIcons name="check" size={14} color={Stitch.onPrimary} />}
              </View>
              <Text style={styles.rememberText}>Trusted device for 30 days</Text>
            </Pressable>

            {/* CTA Button */}
            <Pressable
              style={[styles.buttonWrap, busy && styles.buttonDisabled]}
              onPress={() => void onSubmit()}
              disabled={busy}
            >
              <LinearGradient
                colors={[Stitch.primary, Stitch.primaryContainer]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.button}
              >
                {busy ? (
                  <ActivityIndicator color={Stitch.onPrimaryContainer} />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Initialize Protocol</Text>
                    <MaterialCommunityIcons name="arrow-right" size={20} color={Stitch.onPrimary} />
                  </>
                )}
              </LinearGradient>
            </Pressable>


          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2024 Visioryx Systems</Text>
            <Text style={styles.footerText}>Privacy Policy</Text>
          </View>

          {/* Debug / Connection */}
          <Pressable
            style={styles.testLink}
            onPress={() => void runConnectionTest()}
            disabled={testingApi || busy}
          >
            {testingApi ? (
              <ActivityIndicator size="small" color={Stitch.primary} />
            ) : (
              <Text style={styles.testLinkText}>Test API connection</Text>
            )}
          </Pressable>
          <Pressable
            style={styles.testLink}
            onPress={() => setShowApiModal(true)}
          >
            <Text style={styles.testLinkText}>Configure API URL</Text>
          </Pressable>
          <Text style={styles.versionLine} selectable>
            App v{Constants.expoConfig?.version ?? '1.0.0'}
            {apiVersion != null ? ` · API v${apiVersion}` : ''}
          </Text>
          <Text style={styles.apiUrl} selectable>
            API: {getApiBase()}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom API URL Modal */}
      <Modal visible={showApiModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Configure URLs</Text>
            <Text style={styles.modalSubtitle}>
              Enter your backend and MediaMTX URLs. Use public URLs (ngrok, tunnel) when not on the same network.
            </Text>
            
            <Text style={[styles.inputLabel, { color: Stitch.primary, marginBottom: 4 }]}>Backend API URL</Text>
            <TextInput
              style={styles.apiInput}
              value={customApiUrl}
              onChangeText={setCustomApiUrl}
              placeholder="http://192.168.1.100:8000"
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            
            <Text style={[styles.inputLabel, { color: Stitch.primary, marginBottom: 4 }]}>MediaMTX URL (for live streams)</Text>
            <TextInput
              style={styles.apiInput}
              value={mediamtxUrl}
              onChangeText={setMediamtxUrl}
              placeholder="http://192.168.1.100:8889"
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: '#333' }]}
                onPress={() => setShowApiModal(false)}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: Stitch.primary }]}
                onPress={saveCustomApiUrl}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  blobTopRight: {
    position: 'absolute',
    top: '-10%',
    right: '-10%',
    width: '50%',
    height: '40%',
    borderRadius: 9999,
    backgroundColor: `${Stitch.primary}33`,
    // blur not natively supported — opacity simulates effect
    opacity: 0.2,
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: '-10%',
    left: '-10%',
    width: '40%',
    height: '35%',
    borderRadius: 9999,
    backgroundColor: `${Stitch.secondaryContainer}22`,
    opacity: 0.15,
  },
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 40,
  },
  // Brand header matching stitch
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  brandName: {
    fontFamily: FontFamily.headlineBlack,
    fontSize: 28,
    color: Stitch.primary,
    letterSpacing: -0.5,
  },
  // Glass card
  card: {
    backgroundColor: 'rgba(34, 42, 61, 0.4)',
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(175, 198, 255, 0.06)',
  },
  cardIntro: {
    marginBottom: 20,
  },
  cardTitle: {
    fontFamily: FontFamily.headlineBlack,
    fontSize: 28,
    color: Stitch.onSurface,
    letterSpacing: -0.5,
  },
  cardSub: {
    fontFamily: FontFamily.body,
    fontSize: 15,
    color: Stitch.onSurfaceVariant,
    marginTop: 6,
    lineHeight: 22,
  },
  // Error banner — inline in card
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(147, 0, 10, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 171, 0.2)',
    marginBottom: 20,
  },
  errorText: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    color: Stitch.error,
    flex: 1,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: Stitch.onSurfaceVariant,
    marginBottom: 8,
  },
  recoveryLink: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Stitch.primary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Stitch.surfaceContainerLowest,
    borderRadius: 12,
    paddingHorizontal: 4,
    height: 56,
  },
  inputIcon: {
    marginLeft: 12,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.body,
    paddingHorizontal: 12,
    paddingVertical: 16,
    fontSize: 16,
    color: Stitch.onSurface,
  },
  eyeBtn: {
    padding: 12,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Stitch.outlineVariant,
    backgroundColor: Stitch.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Stitch.primary,
    borderColor: Stitch.primary,
  },
  rememberText: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    color: Stitch.onSurfaceVariant,
  },
  buttonWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: Stitch.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  button: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  buttonText: {
    fontFamily: FontFamily.headlineBlack,
    color: Stitch.onPrimary,
    fontSize: 17,
    letterSpacing: 0.3,
  },
  // SSO
  ssoSection: {
    marginTop: 28,
    paddingTop: 28,
    borderTopWidth: 1,
    borderTopColor: 'rgba(140, 144, 159, 0.18)',
  },
  ssoDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ssoLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(140, 144, 159, 0.18)',
  },
  ssoText: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Stitch.outline,
    marginHorizontal: 14,
  },
  ssoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  ssoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    backgroundColor: Stitch.surfaceContainerHigh,
    borderRadius: 12,
  },
  ssoButtonText: {
    fontFamily: FontFamily.labelMedium,
    fontSize: 14,
    color: Stitch.onSurfaceVariant,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    marginTop: 32,
  },
  footerText: {
    fontFamily: FontFamily.labelMedium,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Stitch.outline,
    opacity: 0.5,
  },
  testLink: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 8,
  },
  testLinkText: {
    fontFamily: FontFamily.labelMedium,
    fontSize: 12,
    color: Stitch.primary,
    letterSpacing: 0.5,
  },
  versionLine: {
    fontFamily: FontFamily.body,
    marginTop: 8,
    fontSize: 11,
    color: Stitch.onSurfaceVariant,
    opacity: 0.45,
    textAlign: 'center',
  },
  apiUrl: {
    fontFamily: FontFamily.body,
    marginTop: 4,
    fontSize: 10,
    color: Stitch.onSurfaceVariant,
    opacity: 0.25,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Stitch.surfaceContainerHigh,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontFamily: FontFamily.headlineBlack,
    fontSize: 22,
    color: Stitch.onSurface,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    color: Stitch.onSurfaceVariant,
    marginBottom: 20,
    lineHeight: 20,
  },
  apiInput: {
    backgroundColor: Stitch.surfaceContainerLowest,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Stitch.onSurface,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Stitch.outlineVariant,
  },
  inputLabel: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 12,
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnText: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 15,
    color: Stitch.onSurface,
  },
});
