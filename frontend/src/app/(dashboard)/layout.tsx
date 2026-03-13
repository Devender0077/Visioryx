'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
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
} from '@mui/icons-material';

const DRAWER_WIDTH = 280;
const HEADER_HEIGHT = 64;

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Overview', icon: <DashboardIcon /> },
  { path: '/live', label: 'Live Monitoring', icon: <LiveTv /> },
  { path: '/cameras', label: 'Cameras', icon: <Videocam /> },
  { path: '/users', label: 'Users', icon: <People /> },
  { path: '/detections', label: 'Detections', icon: <History /> },
  { path: '/analytics', label: 'Analytics', icon: <Analytics /> },
  { path: '/alerts', label: 'Alerts', icon: <Notifications /> },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navContent = (
    <>
      <Box sx={{ px: 2, py: 2, mb: 1 }}>
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
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Videocam sx={{ color: 'white', fontSize: 20 }} />
          </Box>
          Visioryx
        </Typography>
      </Box>
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
      <List disablePadding sx={{ mt: 0.5 }}>
        {NAV_ITEMS.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              component={Link}
              href={item.path}
              selected={pathname === item.path}
              onClick={() => setMobileOpen(false)}
              sx={{ py: 1.25, px: 2 }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontWeight: pathname === item.path ? 600 : 500,
                  fontSize: '0.875rem',
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header - Minimal style */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          zIndex: (t) => t.zIndex.drawer + 1,
        }}
      >
        <Toolbar
          sx={{
            minHeight: HEADER_HEIGHT,
            px: { xs: 2, sm: 3 },
          }}
        >
          <IconButton
            color="inherit"
            edge="start"
            sx={{ mr: 2, display: { md: 'none' } }}
            aria-label="menu"
            onClick={() => setMobileOpen(true)}
          >
            <MenuIcon />
          </IconButton>
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
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            pt: 2,
            pb: 2,
            px: 1.5,
          },
        }}
      >
        {navContent}
      </Drawer>

      {/* Desktop sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            top: 0,
            left: 0,
            height: '100%',
            pt: 2,
            pb: 2,
            px: 1.5,
          },
        }}
      >
        {navContent}
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          pt: `${HEADER_HEIGHT}px`,
          px: { xs: 2, sm: 3 },
          py: 3,
        }}
      >
        <AuthGuard>{children}</AuthGuard>
      </Box>
    </Box>
  );
}
