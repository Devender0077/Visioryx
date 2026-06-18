/**
 * Responsive layout for the authenticated app shell.
 *
 * - **Desktop (≥1024px)**: 260px fixed side-nav (VisionaryX wordmark + nav
 *   rail + user pill at the bottom). Bottom tab-bar is hidden.
 * - **Tablet / mobile (<1024px)**: Standard Expo-Router bottom tabs (≤5 visible
 *   slots — the rest accessible via the "More" tab).
 *
 * Implementation note: we use `useWindowDimensions` and toggle two branches.
 * Expo-Router still owns route registration; the side-nav links to the same
 * routes the tabs do, so URLs stay portable across viewports.
 */
import { useEffect } from 'react';
import { Tabs, useRouter, useSegments, useRootNavigationState, Link } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeConnected } from '@/contexts/RealtimeContext';
import { isEnrolleeRole } from '@/lib/roles';
import { PaletteDark as C, FontFamily as F, Radius, Space, TextStyles, Breakpoint, Brand } from '@/constants/visionTheme';
import { VisionaryXLogo } from '@/components/VisionaryXLogo';
import { CommandBackground } from '@/components/CommandBackground';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  iconActive?: IconName;
  testID: string;
  /** Hide for enrollee role. */
  hideForEnrollee?: boolean;
  /** Show ONLY for enrollee. */
  enrolleeOnly?: boolean;
}

const NAV: NavItem[] = [
  { href: '/(tabs)', label: 'Overview', icon: 'view-dashboard-outline', iconActive: 'view-dashboard', testID: 'nav-overview' },
  { href: '/(tabs)/live', label: 'Live grid', icon: 'video-outline', iconActive: 'video', testID: 'nav-live', hideForEnrollee: true },
  { href: '/(tabs)/cameras', label: 'Cameras', icon: 'cctv', iconActive: 'cctv', testID: 'nav-cameras', hideForEnrollee: true },
  { href: '/(tabs)/alerts', label: 'Alerts', icon: 'bell-outline', iconActive: 'bell-ring', testID: 'nav-alerts', hideForEnrollee: true },
  { href: '/(tabs)/enroll', label: 'Enrollment', icon: 'face-recognition', testID: 'nav-enroll', enrolleeOnly: true },
  { href: '/(tabs)/more', label: 'More', icon: 'dots-horizontal', testID: 'nav-more' },
];

const SECONDARY_NAV: NavItem[] = [
  { href: '/detections', label: 'Detections', icon: 'account-search', testID: 'nav-detections', hideForEnrollee: true },
  { href: '/analytics', label: 'Analytics', icon: 'chart-line', testID: 'nav-analytics', hideForEnrollee: true },
  { href: '/users', label: 'Users', icon: 'account-group-outline', testID: 'nav-users', hideForEnrollee: true },
  { href: '/audit', label: 'Audit log', icon: 'clipboard-text-clock-outline', testID: 'nav-audit', hideForEnrollee: true },
  { href: '/settings', label: 'Settings', icon: 'cog-outline', testID: 'nav-settings', hideForEnrollee: true },
];

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { loading, user } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= Breakpoint.desktop;
  const isEnrollee = isEnrolleeRole(user?.role);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <View style={styles.boot} testID="tabs-boot">
        <ActivityIndicator size="large" color={C.primaryAccent} />
      </View>
    );
  }

  const visibleNav = NAV.filter(
    (n) => (!n.hideForEnrollee || !isEnrollee) && (!n.enrolleeOnly || isEnrollee),
  );

  // Desktop side-nav layout ----------------------------------------------------
  if (isDesktop) {
    return (
      <View style={styles.deskRoot} testID="desk-shell">
        <CommandBackground />
        <SideNav user={user} isEnrollee={isEnrollee} visibleNav={visibleNav} />
        <View style={styles.deskMain}>
          <Tabs
            screenOptions={{
              tabBarStyle: { display: 'none' },
              headerShown: false,
              sceneStyle: { backgroundColor: 'transparent' },
            }}
          >
            <Tabs.Screen name="index" />
            <Tabs.Screen name="live" options={{ href: isEnrollee ? null : undefined }} />
            <Tabs.Screen name="cameras" options={{ href: isEnrollee ? null : undefined }} />
            <Tabs.Screen name="alerts" options={{ href: isEnrollee ? null : undefined }} />
            <Tabs.Screen name="enroll" options={{ href: !isEnrollee ? null : undefined }} />
            <Tabs.Screen name="more" />
          </Tabs>
        </View>
      </View>
    );
  }

  // Mobile / tablet bottom-tab layout ------------------------------------------
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.primaryAccent,
        tabBarInactiveTintColor: C.textMuted,
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: 60 + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: F.mono,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          marginTop: -2,
        },
        headerStyle: { backgroundColor: C.surface, borderBottomWidth: 0 },
        headerTintColor: C.text,
        headerTitleStyle: { fontFamily: F.heading, fontSize: 18 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isEnrollee ? 'Home' : 'Overview',
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons name={focused ? 'view-dashboard' : 'view-dashboard-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: 'Live',
          href: isEnrollee ? null : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons name={focused ? 'video' : 'video-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cameras"
        options={{
          title: 'Cameras',
          href: isEnrollee ? null : undefined,
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="cctv" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          href: isEnrollee ? null : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons name={focused ? 'bell-ring' : 'bell-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="enroll"
        options={{
          title: 'Enroll',
          href: !isEnrollee ? null : undefined,
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="face-recognition" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="dots-horizontal" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

// ---------------------------------------------------------------------------
// Side-nav (desktop only)
// ---------------------------------------------------------------------------
function SideNav({
  user,
  isEnrollee,
  visibleNav,
}: {
  user: NonNullable<ReturnType<typeof useAuth>['user']>;
  isEnrollee: boolean;
  visibleNav: NavItem[];
}) {
  const segments = useSegments();
  const navState = useRootNavigationState();
  const connected = useRealtimeConnected();
  const router = useRouter();
  const { logout } = useAuth();

  const currentPath = '/' + (segments as string[]).filter(Boolean).join('/');

  function isActive(href: string): boolean {
    if (href === '/(tabs)') {
      // Active for /(tabs) AND /(tabs)/index (which both render Overview)
      return currentPath === '/(tabs)' || currentPath.endsWith('/index') || currentPath === '/(tabs)/';
    }
    return currentPath === href || currentPath.startsWith(href + '/');
  }

  const secondaryVisible = SECONDARY_NAV.filter((n) => !n.hideForEnrollee || !isEnrollee);

  return (
    <View style={styles.sideNav} testID="desk-sidenav">
      {/* Brand */}
      <View style={styles.sideBrand}>
        <VisionaryXLogo variant="wordmark" size={32} testID="sidenav-logo" />
      </View>

      <Text style={styles.sideTagline}>{Brand.tagline}</Text>

      {/* Primary nav */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: Space.lg }}>
        <Text style={styles.sectionLabel}>WORKSPACE</Text>
        {visibleNav.map((item) => {
          const active = isActive(item.href);
          return (
            <Pressable
              key={item.href}
              style={[styles.navRow, active && styles.navRowActive]}
              onPress={() => router.push(item.href as any)}
              testID={item.testID}
            >
              {active ? <View style={styles.navBar} /> : null}
              <MaterialCommunityIcons
                name={(active && item.iconActive) || item.icon}
                size={18}
                color={active ? C.primaryAccent : C.textMuted}
              />
              <Text style={[styles.navText, active && styles.navTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}

        {!isEnrollee && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: Space.lg }]}>OPERATIONS</Text>
            {secondaryVisible.map((item) => {
              const active = isActive(item.href);
              return (
                <Pressable
                  key={item.href}
                  style={[styles.navRow, active && styles.navRowActive]}
                  onPress={() => router.push(item.href as any)}
                  testID={item.testID}
                >
                  {active ? <View style={styles.navBar} /> : null}
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={18}
                    color={active ? C.primaryAccent : C.textMuted}
                  />
                  <Text style={[styles.navText, active && styles.navTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* User pill */}
      <View style={styles.userPill} testID="sidenav-userpill">
        <View style={styles.userAvatar}>
          <Text style={styles.userInitial}>
            {(user.name || user.email).charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: Space.sm, overflow: 'hidden' }}>
          <Text style={styles.userName} numberOfLines={1}>
            {user.name || user.email}
          </Text>
          <View style={styles.userMetaRow}>
            <View style={[styles.statusDot, { backgroundColor: connected ? C.cyan : C.warning }]} />
            <Text style={styles.userMeta}>
              {(user.role || 'operator').toUpperCase()} · {connected ? 'LIVE' : 'IDLE'}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => logout().then(() => router.replace('/login'))}
          style={styles.signOutBtn}
          testID="sidenav-logout"
          hitSlop={8}
        >
          <MaterialCommunityIcons name="logout" size={16} color={C.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },

  // Desktop shell
  deskRoot: { flex: 1, flexDirection: 'row', backgroundColor: C.bg },
  deskMain: { flex: 1, overflow: 'hidden' },

  // Side-nav
  sideNav: {
    width: 260,
    backgroundColor: C.surface,
    borderRightWidth: 1,
    borderRightColor: C.border,
    paddingHorizontal: Space.md,
    paddingTop: Space.xl,
    paddingBottom: Space.md,
  },
  sideBrand: { paddingHorizontal: Space.sm, marginBottom: Space.sm },
  sideTagline: {
    ...TextStyles.label,
    color: C.textFaint,
    fontSize: 9,
    marginTop: Space.sm,
    marginLeft: Space.sm,
    marginBottom: Space.xl,
  },
  sectionLabel: {
    ...TextStyles.label,
    color: C.textFaint,
    fontSize: 9,
    paddingHorizontal: Space.sm,
    marginBottom: Space.sm,
    marginTop: Space.xs,
  },

  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    paddingHorizontal: Space.sm,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    marginBottom: 2,
    position: 'relative',
  },
  navRowActive: { backgroundColor: C.primaryFaint },
  navBar: {
    position: 'absolute',
    left: -Space.md,
    top: 6,
    bottom: 6,
    width: 3,
    backgroundColor: C.primaryAccent,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  navText: {
    ...TextStyles.bodySmall,
    color: C.textMuted,
    fontFamily: F.bodyMedium,
  },
  navTextActive: { color: C.text },

  // User pill
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface2,
    borderRadius: Radius.md,
    paddingHorizontal: Space.sm,
    paddingVertical: Space.sm,
    borderWidth: 1,
    borderColor: C.border,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInitial: { ...TextStyles.bodySmall, color: '#fff', fontFamily: F.heading },
  userName: { ...TextStyles.bodySmall, color: C.text, fontFamily: F.bodySemibold },
  userMetaRow: { flexDirection: 'row', alignItems: 'center', gap: Space.xs, marginTop: 2 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  userMeta: { ...TextStyles.caption, color: C.textMuted, fontFamily: F.mono, fontSize: 9, letterSpacing: 0.8 },
  signOutBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
});
