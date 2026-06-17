import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useAuth } from '@/contexts/AuthContext';
import { Stitch, FontFamily } from '@/constants/stitchTheme';
import { StitchTabBarBackground } from '@/components/StitchTabBarBackground';
import { StitchTabIcon } from '@/components/StitchTabIcon';
import { isEnrolleeRole } from '@/lib/roles';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const { loading, user } = useAuth();
  const router = useRouter();
  const isEnrollee = isEnrolleeRole(user?.role);

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

  const dockShadow =
    Platform.OS === 'ios'
      ? {
          shadowColor: '#afc6ff',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 40,
        }
      : { elevation: 12 };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Stitch.primary,
        tabBarInactiveTintColor: isDark ? Stitch.tabInactive : palette.tabIconDefault,
        tabBarStyle: isDark
          ? {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              borderTopWidth: 0,
              backgroundColor: 'transparent',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              height: 56 + Math.max(insets.bottom, 10),
              paddingBottom: Math.max(insets.bottom, 10),
              paddingTop: 6,
              paddingHorizontal: 4,
              ...dockShadow,
            }
          : {
              backgroundColor: palette.card,
              borderTopColor: palette.border,
            },
        tabBarBackground: isDark ? () => <StitchTabBarBackground /> : undefined,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: FontFamily.labelMedium,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          marginTop: -2,
        },
        tabBarItemStyle: { paddingTop: 4 },
        headerStyle: {
          backgroundColor: isDark ? Stitch.surface : palette.card,
          borderBottomWidth: isDark ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: palette.border,
        },
        headerTintColor: isDark ? Stitch.primary : palette.text,
        headerTitleStyle: {
          fontFamily: FontFamily.headlineBlack,
          fontWeight: '800',
          fontSize: isDark ? 20 : 18,
          color: isDark ? Stitch.primary : palette.text,
        },
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isEnrollee ? 'Home' : 'Overview',
          tabBarIcon: ({ color, size, focused }) => (
            <StitchTabIcon
              name={focused ? 'view-dashboard' : 'view-dashboard-outline'}
              focused={focused}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: 'Live',
          href: isEnrollee ? null : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <StitchTabIcon name="video" focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="cameras"
        options={{
          title: 'Cameras',
          href: isEnrollee ? null : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <StitchTabIcon name="video-off" focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          href: isEnrollee ? null : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <StitchTabIcon name={focused ? 'bell' : 'bell-outline'} focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="enroll"
        options={{
          title: 'Enrollment',
          href: !isEnrollee ? null : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <StitchTabIcon name="face-recognition" focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size, focused }) => (
            <StitchTabIcon name="dots-horizontal" focused={focused} color={color} size={size} />
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
