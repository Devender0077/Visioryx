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

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

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
      Alert.alert('Sign in failed', e instanceof Error ? e.message : 'Unknown error');
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
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@company.com"
            placeholderTextColor={Stitch.onSurfaceVariant}
            value={email}
            onChangeText={setEmail}
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={Stitch.onSurfaceVariant}
            value={password}
            onChangeText={setPassword}
          />
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
                <Text style={styles.buttonText}>Sign in</Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>

        <Text style={styles.hint}>
          Set EXPO_PUBLIC_API_URL to your backend (e.g. http://192.168.1.10:8000) on a physical device.
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
  card: {
    backgroundColor: 'rgba(34, 42, 61, 0.55)',
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(66, 71, 83, 0.35)',
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
    backgroundColor: Stitch.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(66, 71, 83, 0.4)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
    color: Stitch.onSurface,
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
