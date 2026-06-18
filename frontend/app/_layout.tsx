import {
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from '@expo-google-fonts/geist';
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
} from '@expo-google-fonts/ibm-plex-sans';
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono';
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
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });

  useEffect(() => {
    if (error) {
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
