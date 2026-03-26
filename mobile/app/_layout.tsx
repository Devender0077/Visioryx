import {
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider } from '@/contexts/AuthContext';
import { Brand } from '@/constants/Colors';
import { Stitch } from '@/constants/stitchTheme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync();

const NavLight = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Brand.primary,
    background: '#F4F6F8',
    card: '#FFFFFF',
    text: '#111827',
    border: '#E5E7EB',
    notification: Brand.danger,
  },
};

const NavDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Stitch.primary,
    background: Stitch.surface,
    card: Stitch.surfaceContainerHigh,
    text: Stitch.onSurface,
    border: 'rgba(66, 71, 83, 0.45)',
    notification: Brand.danger,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? NavDark : NavLight}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="camera/[id]" options={{ title: 'Live view', headerBackTitle: 'Back' }} />
        <Stack.Screen name="analytics" options={{ title: 'Analytics' }} />
        <Stack.Screen name="detections" options={{ title: 'Detections' }} />
        <Stack.Screen name="audit" options={{ title: 'Audit log' }} />
        <Stack.Screen name="settings" options={{ title: 'Email & SMTP' }} />
      </Stack>
    </ThemeProvider>
  );
}
