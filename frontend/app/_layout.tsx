import {
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AuthProvider } from '@/contexts/AuthContext';
import { RealtimeProvider } from '@/contexts/RealtimeContext';
import { PaletteDark, FontFamily as Fonts } from '@/constants/visionTheme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync().catch(() => undefined);

// VisionaryX runs dark-first (command center identity).
const VxNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: PaletteDark.primary,
    background: PaletteDark.bg,
    card: PaletteDark.surface,
    text: PaletteDark.text,
    border: PaletteDark.border,
    notification: PaletteDark.danger,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    if (error) {
      // Don't throw — just log so web doesn't blank out.
      // eslint-disable-next-line no-console
      console.warn('Font load error', error);
    }
  }, [error]);

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <AuthProvider>
      <RealtimeProvider>
        <ThemeProvider value={VxNavTheme}>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: PaletteDark.surface },
              headerTintColor: PaletteDark.text,
              headerTitleStyle: { fontFamily: Fonts.heading, fontSize: 18 },
              contentStyle: { backgroundColor: PaletteDark.bg },
              headerBackTitle: 'Back',
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="camera/[id]" options={{ title: 'Live view' }} />
            <Stack.Screen name="analytics" options={{ title: 'Analytics' }} />
            <Stack.Screen name="detections" options={{ title: 'Detections' }} />
            <Stack.Screen name="audit" options={{ title: 'Audit log' }} />
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
            <Stack.Screen name="users" options={{ title: 'User management' }} />
          </Stack>
        </ThemeProvider>
      </RealtimeProvider>
    </AuthProvider>
  );
}
