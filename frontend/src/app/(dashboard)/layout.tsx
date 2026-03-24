'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { api } from '@/lib/api';
import {
  Box,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Videocam,
  LiveTv,
  People,
  History,
  Analytics,
  Notifications,
  Menu as MenuIcon,
  Logout,
  ChevronLeft,
  ChevronRight,
  Person as PersonIcon,
  Face as FaceIcon,
} from '@mui/icons-material';

const DRAWER_WIDTH = 280;
const DRAWER_WIDTH_COLLAPSED = 80;
const HEADER_HEIGHT = 64;
const SIDEBAR_COLLAPSED_KEY = 'visioryx-sidebar-collapsed';

const FULL_NAV_ITEMS = [
  { path: '/dashboard', label: 'Overview', icon: <DashboardIcon /> },
  { path: '/live', label: 'Live Monitoring', icon: <LiveTv /> },
  { path: '/cameras', label: 'Cameras', icon: <Videocam /> },
  { path: '/users', label: 'Users', icon: <People /> },
  { path: '/detections', label: 'Detections', icon: <History /> },
  { path: '/analytics', label: 'Analytics', icon: <Analytics /> },
  { path: '/alerts', label: 'Alerts', icon: <Notifications /> },
  { path: '/profile', label: 'Profile', icon: <PersonIcon /> },
];

const ENROLLEE_NAV_ITEMS = [
  { path: '/dashboard', label: 'Home', icon: <DashboardIcon /> },
  { path: '/enroll', label: 'Face enrollment', icon: <FaceIcon /> },
  { path: '/profile', label: 'Profile', icon: <PersonIcon /> },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userRole, setUserRole] = useState<string | undefined>(undefined);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    api<{ role: string }>('/api/v1/auth/me')
      .then((r) => setUserRole(r.role))
      .catch(() => setUserRole(''));
  }, [mounted]);

  useEffect(() => {
    if (userRole !== 'enrollee') return;
    const blocked = ['/live', '/cameras', '/users', '/detections', '/analytics', '/alerts'];
    if (blocked.includes(pathname)) {
      router.replace('/dashboard');
    }
  }, [userRole, pathname, router]);

  const navItems = useMemo(
    () => (userRole === 'enrollee' ? ENROLLEE_NAV_ITEMS : FULL_NAV_ITEMS),
    [userRole],
  );

  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      setCollapsed(stored === 'true');
    }
  }, [mounted]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      if (typeof window !== 'undefined') {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      }
      return next;
    });
  };

  const drawerWidth = mounted && collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

  const pageTitle = (() => {
    if (pathname === '/dashboard') {
      return userRole === 'enrollee' ? 'Home' : 'Hi, Welcome back 👋';
    }
    const item = navItems.find((i) => pathname === i.path);
    return item ? item.label : pathname === '/' ? 'Overview' : 'Visioryx';
  })();

  const navContent = (isCollapsed: boolean) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box
        sx={{
          px: isCollapsed ? 1.5 : 2,
          py: 2,
          mb: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
        }}
      >
        <Typography
          component={Link}
          href="/dashboard"
          variant="h6"
          onClick={() => setMobileOpen(false)}
          sx={{
            color: 'text.primary',
            textDecoration: 'none',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              flexShrink: 0,
              borderRadius: 1,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Videocam sx={{ color: 'white', fontSize: 20 }} />
          </Box>
          {!isCollapsed && <Box component="span" sx={{ whiteSpace: 'nowrap' }}>Visioryx</Box>}
        </Typography>
      </Box>
      {!isCollapsed && (
        <Typography
          variant="caption"
          sx={{
            px: 2,
            py: 1,
            color: 'text.disabled',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Menu
        </Typography>
      )}
      <List disablePadding sx={{ mt: 0.5 }}>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              component={Link}
              href={item.path}
              selected={pathname === item.path}
              onClick={() => setMobileOpen(false)}
              sx={{
                py: 1.25,
                px: isCollapsed ? 1.5 : 2,
                justifyContent: isCollapsed ? 'center' : 'flex-start',
              }}
              title={isCollapsed ? item.label : undefined}
            >
              <ListItemIcon
                sx={{
                  minWidth: isCollapsed ? 0 : 40,
                  color: 'inherit',
                  justifyContent: 'center',
                }}
              >
                {item.icon}
              </ListItemIcon>
              {!isCollapsed && (
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: pathname === item.path ? 600 : 500,
                    fontSize: '0.875rem',
                  }}
                />
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Box sx={{ p: 1, mt: 'auto', display: { xs: 'none', md: 'flex' }, justifyContent: isCollapsed ? 'center' : 'flex-end' }}>
        <IconButton
          size="small"
          onClick={toggleCollapsed}
          sx={{ color: 'text.secondary' }}
          aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
        >
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </IconButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header - fixed, content has padding to avoid overlap */}
      <AppBar
        position="fixed"
        sx={{
          width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
          ml: { xs: 0, md: `${drawerWidth}px` },
          zIndex: (t) => t.zIndex.drawer + 1,
          pt: { xs: 'env(safe-area-inset-top, 0px)', md: 0 },
          transition: (theme) => theme.transitions.create(['width', 'margin'], { duration: theme.transitions.duration.enteringScreen }),
        }}
      >
        <Toolbar
          sx={{
            minHeight: { xs: 56, sm: HEADER_HEIGHT },
            px: { xs: 1.5, sm: 2, md: 3 },
          }}
        >
          <IconButton
            color="inherit"
            edge="start"
            sx={{ mr: 1, display: { md: 'none' } }}
            aria-label="menu"
            onClick={() => setMobileOpen(true)}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            component="span"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              fontSize: { xs: '1rem', sm: '1.125rem' },
            }}
          >
            {pageTitle}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            color="inherit"
            size="small"
            startIcon={<Logout sx={{ fontSize: 20 }} />}
            onClick={() => {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
                window.location.href = '/login';
              }
            }}
            sx={{
              color: 'text.secondary',
              '&:hover': { color: 'primary.main', bgcolor: 'rgba(32, 101, 209, 0.08)' },
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Logout</Box>
          </Button>
        </Toolbar>
      </AppBar>

      {/* Mobile drawer - full width on small screens, safe area padding */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: { xs: 'min(100%, 320px)', sm: DRAWER_WIDTH },
            maxWidth: '85vw',
            boxSizing: 'border-box',
            pt: 'calc(16px + env(safe-area-inset-top, 0px))',
            pb: 'calc(16px + env(safe-area-inset-bottom, 0px))',
            px: 1.5,
          },
        }}
      >
        {navContent(false)}
      </Drawer>

      {/* Desktop sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            top: 0,
            left: 0,
            height: '100%',
            pt: 2,
            pb: 2,
            px: collapsed ? 0.5 : 1.5,
            overflowX: 'hidden',
            transition: (theme) => theme.transitions.create('width', { duration: theme.transitions.duration.enteringScreen }),
          },
        }}
      >
        {navContent(collapsed)}
      </Drawer>

      {/* Main content - extra top padding to prevent overlap with fixed header; safe-area for mobile */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          pt: {
            xs: 'calc(56px + env(safe-area-inset-top, 0px) + 12px)',
            sm: `calc(${HEADER_HEIGHT}px + env(safe-area-inset-top, 0px) + 12px)`,
          },
          pb: { xs: 'calc(24px + env(safe-area-inset-bottom, 0px))', sm: 24 },
          px: { xs: 1.5, sm: 2, md: 3 },
          transition: (theme) => theme.transitions.create(['width', 'margin'], { duration: theme.transitions.duration.enteringScreen }),
        }}
      >
        <AuthGuard>
          <Box sx={{ minHeight: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 64px)' }, overflow: 'auto' }}>
            {children}
          </Box>
        </AuthGuard>
      </Box>
    </Box>
  );
}
