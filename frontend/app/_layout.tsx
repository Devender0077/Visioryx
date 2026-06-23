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
import { DesktopShell } from '@/components/DesktopShell';

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
          <DesktopShell>
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: PaletteDark.surface, borderBottomWidth: 0 },
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
              <Stack.Screen name="analytics" options={{ title: 'Analytics', headerShown: false }} />
              <Stack.Screen name="detections" options={{ title: 'Detections', headerShown: false }} />
              <Stack.Screen name="audit" options={{ title: 'Audit log', headerShown: false }} />
              <Stack.Screen name="settings" options={{ title: 'Settings', headerShown: false }} />
              <Stack.Screen name="users" options={{ title: 'User management', headerShown: false }} />
              <Stack.Screen name="ai/index" options={{ title: 'AI Studio', headerShown: false }} />
              <Stack.Screen name="ai/chat" options={{ title: 'Bot Reply', headerShown: false }} />
              <Stack.Screen name="ai/agents" options={{ title: 'Agents', headerShown: false }} />
              <Stack.Screen name="ai/automations" options={{ title: 'Automations', headerShown: false }} />
              <Stack.Screen name="ai/models" options={{ title: 'Models', headerShown: false }} />
              <Stack.Screen name="ai/rag" options={{ title: 'RAG', headerShown: false }} />
              <Stack.Screen name="ai/mcp" options={{ title: 'MCP', headerShown: false }} />
            </Stack>
          </DesktopShell>
        </ThemeProvider>
      </RealtimeProvider>
    </AuthProvider>
  );
}
