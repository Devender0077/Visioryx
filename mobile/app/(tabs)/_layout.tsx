import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useAuth } from '@/contexts/AuthContext';
import { Stitch } from '@/constants/stitchTheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const { loading, user } = useAuth();
  const router = useRouter();
  const isEnrollee = user?.role === 'enrollee';

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <View style={[styles.boot, { backgroundColor: Stitch.surface }]}>
        <ActivityIndicator size="large" color={Stitch.primary} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.tint,
        tabBarInactiveTintColor: palette.tabIconDefault,
        tabBarStyle: isDark
          ? {
              marginHorizontal: 14,
              marginBottom: Math.max(insets.bottom, 8),
              borderRadius: 22,
              minHeight: 58,
              paddingTop: 6,
              paddingBottom: 6,
              borderTopWidth: 0,
              backgroundColor: 'rgba(34, 42, 61, 0.9)',
              borderWidth: 1,
              borderColor: 'rgba(66, 71, 83, 0.4)',
              elevation: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
            }
          : {
              backgroundColor: palette.card,
              borderTopColor: palette.border,
            },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
        headerStyle: {
          backgroundColor: isDark ? Stitch.surface : palette.card,
          borderBottomWidth: isDark ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: palette.border,
        },
        headerTintColor: palette.text,
        headerTitleStyle: { fontWeight: '700' },
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isEnrollee ? 'Home' : 'Overview',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: 'Live',
          href: isEnrollee ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="television-play" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="cameras"
        options={{
          title: 'Cameras',
          href: isEnrollee ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cctv" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          href: isEnrollee ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="bell-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="enroll"
        options={{
          title: 'Enrollment',
          href: !isEnrollee ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="face-recognition" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="menu" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
