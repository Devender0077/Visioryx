import { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { Stitch, FontFamily } from '@/constants/stitchTheme';
import { getApiBase } from '@/lib/config';
import { LAN_TROUBLESHOOTING, testApiReachable } from '@/lib/api';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testingApi, setTestingApi] = useState(false);

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
    if (!email.trim() || !password) {
      Alert.alert('Sign in', 'Enter email and password.');
      return;
    }
    setBusy(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Sign in failed', `${msg}\n\n${LAN_TROUBLESHOOTING}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient
      colors={['#060e20', Stitch.surface, Stitch.surfaceContainerLow]}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar style="light" />
        <View style={styles.header}>
          <LinearGradient
            colors={[Stitch.primary, Stitch.primaryContainer]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoRing}
          >
            <MaterialCommunityIcons name="cctv" size={40} color={Stitch.onPrimaryContainer} />
          </LinearGradient>
          <Text style={styles.title}>Visioryx</Text>
          <Text style={styles.subtitle}>Secure access to your surveillance workspace</Text>
          <Text style={styles.apiUrl} selectable>
            API: {getApiBase()}
          </Text>
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
        </View>

        <View style={styles.card}>
          <View style={styles.cardIntro}>
            <Text style={styles.cardTitle}>Secure Access</Text>
            <Text style={styles.cardSub}>Enter your credentials to monitor your assets.</Text>
          </View>
          <Text style={styles.label}>Work Email</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="name@company.com"
            placeholderTextColor={Stitch.outline}
            value={email}
            onChangeText={setEmail}
          />
          <Text style={styles.label}>Access Code</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.inputPassword}
              secureTextEntry={!showPassword}
              placeholder="••••••••"
              placeholderTextColor={Stitch.onSurfaceVariant}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              style={styles.eyeBtn}
              onPress={() => setShowPassword((v) => !v)}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <MaterialCommunityIcons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color={Stitch.onSurfaceVariant}
              />
            </Pressable>
          </View>
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
                <Text style={styles.buttonText}>Initialize Protocol</Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>

        <Text style={styles.hint}>
          Phone on Wi‑Fi: in mobile/.env set EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:8000 (not localhost), then npm run
          start:clear. Android emulator: http://10.0.2.2:8000.
        </Text>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  root: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.headlineBlack,
    fontSize: 32,
    color: Stitch.primary,
    marginTop: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: FontFamily.body,
    marginTop: 10,
    fontSize: 15,
    color: Stitch.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  apiUrl: {
    fontFamily: FontFamily.body,
    marginTop: 10,
    fontSize: 11,
    color: Stitch.onSurfaceVariant,
    opacity: 0.85,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  testLink: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  testLinkText: {
    fontFamily: FontFamily.labelMedium,
    fontSize: 14,
    color: Stitch.primary,
    textDecorationLine: 'underline',
  },
  card: {
    backgroundColor: 'rgba(34, 42, 61, 0.4)',
    borderRadius: 16,
    padding: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(66, 71, 83, 0.2)',
    shadowColor: '#afc6ff',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 40,
    elevation: 8,
  },
  cardIntro: { marginBottom: 20 },
  cardTitle: {
    fontFamily: FontFamily.headline,
    fontSize: 26,
    color: Stitch.onSurface,
  },
  cardSub: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    color: Stitch.onSurfaceVariant,
    marginTop: 6,
    lineHeight: 20,
  },
  label: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Stitch.onSurfaceVariant,
    marginBottom: 8,
  },
  input: {
    fontFamily: FontFamily.body,
    backgroundColor: Stitch.surfaceContainerLowest,
    borderWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
    color: Stitch.onSurface,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: Stitch.surfaceContainerLowest,
    borderWidth: 0,
    borderRadius: 12,
    paddingRight: 4,
  },
  inputPassword: {
    flex: 1,
    fontFamily: FontFamily.body,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: Stitch.onSurface,
  },
  eyeBtn: {
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
    minHeight: 50,
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonText: {
    fontFamily: FontFamily.labelSemibold,
    color: Stitch.onPrimaryContainer,
    fontSize: 17,
  },
  hint: {
    fontFamily: FontFamily.body,
    marginTop: 24,
    fontSize: 12,
    color: Stitch.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
  },
});
