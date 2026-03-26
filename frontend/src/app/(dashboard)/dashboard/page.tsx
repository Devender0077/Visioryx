'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  List,
  ListItem,
  ListItemText,
  Typography,
  alpha,
} from '@mui/material';
import {
  People,
  Videocam,
  History,
  Warning,
  Notifications,
  Security,
  ArrowForward,
  Face,
} from '@mui/icons-material';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/formatDate';
import { useWebSocket } from '@/hooks/useWebSocket';
import { EmptyStateIllustration } from '@/components/illustrations';
import { WelcomeCard, FeaturedCard } from '@/components/dashboard';
import { StitchPageHeader } from '@/components/StitchPageHeader';

const DetectionTrendsChartLazy = dynamic(
  () => import('@/components/dashboard/DetectionTrendsChart'),
  {
    ssr: false,
    loading: () => (
      <Card sx={{ height: '100%' }}>
        <CardContent sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 360 }}>
          <CircularProgress size={40} />
        </CardContent>
      </Card>
    ),
  },
);

interface OverviewData {
  total_users?: number;
  total_cameras?: number;
  active_cameras?: number;
  detections_today?: number;
  unknown_detections_today?: number;
  detection_trend_7d?: number;
}

interface RecentDetection {
  id: number;
  camera_id: number;
  camera_name?: string | null;
  status: string;
  confidence: number;
  timestamp: string;
}

interface RecentAlert {
  id: number;
  alert_type: string;
  message: string;
  severity: string;
  is_read: boolean;
  timestamp: string;
}

const StatCard = ({
  title,
  value,
  icon,
  color,
  href,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  href: string;
  trend?: number;
}) => (
  <Link href={href} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
    <Card
      sx={{
        textDecoration: 'none',
        color: 'inherit',
        overflow: 'hidden',
        position: 'relative',
        isolation: 'isolate',
        bgcolor: '#222a3d',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: '0 1px 0 0 rgba(255,255,255,0.05), 0 16px 48px -12px rgba(0,0,0,0.5)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        minHeight: 160,
        height: '100%',
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: alpha(color, 0.6),
          outlineOffset: 2,
        },
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 20px 48px -12px ${alpha(color, 0.35)}`,
          '& .stat-icon': { transform: 'scale(1.05)' },
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -16,
          right: -16,
          width: 64,
          height: 64,
          borderRadius: '50%',
          bgcolor: alpha(color, 0.10),
          zIndex: 0,
        }}
      />
      <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            mb: 1,
          }}
        >
          <Box
            className="stat-icon"
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              bgcolor: alpha(color, 0.14),
              color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.3s ease',
            }}
          >
            {icon}
          </Box>
          {typeof trend === 'number' && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.25,
                color: trend >= 0 ? 'success.main' : 'error.main',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              {trend >= 0 ? '+' : ''}
              {trend}%
              <Typography component="span" variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                vs 7d
              </Typography>
            </Box>
          )}
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 700, mb: 1, textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '0.7rem' }}
        >
          {title}
        </Typography>
        <Typography
          variant="h4"
          sx={{
            fontFamily: '"Manrope", "Public Sans", sans-serif',
            fontWeight: 800,
            fontSize: { xs: '1.75rem', sm: '2rem' },
            letterSpacing: '-0.02em',
            color: 'text.primary',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5 }}>
          <Typography variant="caption" color="primary.light" fontWeight={700}>
            View details
          </Typography>
          <ArrowForward sx={{ fontSize: 16, color: 'primary.light' }} />
        </Box>
      </CardContent>
    </Card>
  </Link>
);

interface UserMe {
  id: number;
  email: string;
  role: string;
}

function displayNameFromEmail(email: string): string {
  const part = email.split('@')[0];
  return part ? part.charAt(0).toUpperCase() + part.slice(1) : 'Admin';
}

export default function DashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [trends, setTrends] = useState<{ date: string; count: number }[]>([]);
  const [recentDetections, setRecentDetections] = useState<RecentDetection[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<RecentAlert[]>([]);
  const [user, setUser] = useState<UserMe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    api<UserMe>('/api/v1/auth/me')
      .then(async (me) => {
        setUser(me);
        if (me.role === 'enrollee') {
          return;
        }
        const [overview, trendData, detections, alerts] = await Promise.all([
          api<OverviewData>('/api/v1/analytics/overview'),
          api<{ date: string; count: number }[]>('/api/v1/analytics/detection-trends?days=7'),
          api<RecentDetection[]>('/api/v1/analytics/recent-detections?limit=5'),
          api<RecentAlert[]>('/api/v1/analytics/recent-alerts?limit=5'),
        ]);
        setData(overview);
        setTrends(trendData);
        setRecentDetections(detections);
        setRecentAlerts(alerts);
      })
      .catch(() => setError('Login required'))
      .finally(() => {
        setLoading(false);
      });
  };

  const { connected } = useWebSocket((event) => {
    if (
      ['face_recognized', 'unknown_person_detected', 'object_detected', 'camera_status', 'alert'].includes(
        event.type,
      )
    ) {
      load(false);
    }
  });

  useEffect(() => {
    load();
  }, []);

  const cards = [
    {
      title: 'Total Users',
      value: data?.total_users ?? '-',
      icon: <People sx={{ fontSize: 28 }} />,
      color: '#2065D1',
      href: '/users',
    },
    {
      title: 'Total Cameras',
      value: data?.total_cameras ?? '-',
      icon: <Videocam sx={{ fontSize: 28 }} />,
      color: '#57e082',
      href: '/cameras',
    },
    {
      title: "Today's Detections",
      value: data?.detections_today ?? '-',
      icon: <History sx={{ fontSize: 28 }} />,
      color: '#ffb950',
      href: '/detections',
      trend: data?.detection_trend_7d,
    },
    {
      title: 'Unknown Today',
      value: data?.unknown_detections_today ?? '-',
      icon: <Warning sx={{ fontSize: 28 }} />,
      color: '#ffb4ab',
      href: '/detections',
    },
  ];

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <StitchPageHeader
        eyebrow="System Status"
        title="System Overview"
        subtitle="Operational metrics, detection trends, and real-time activity — WebSocket status on the right."
        actions={
          <Chip
            label={connected ? 'Live' : 'Offline'}
            size="medium"
            color={connected ? 'success' : 'default'}
            sx={{ fontWeight: 600 }}
          />
        }
      />

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error} — Login at /login
        </Typography>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={40} />
        </Box>
      ) : user?.role === 'enrollee' ? (
        <Box sx={{ maxWidth: 640 }}>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
            Welcome
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Your account is set up for face enrollment. Live monitoring and analytics require an operator or admin role.
          </Typography>
          <Card
            sx={{
              border: '1px solid rgba(255, 255, 255, 0.06)',
              bgcolor: 'background.paper',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Face sx={{ fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Enroll your face
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Upload photos so the system can recognize you on camera.
                  </Typography>
                </Box>
              </Box>
              <Typography
                component={Link}
                href="/enroll"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  fontWeight: 600,
                  color: 'primary.main',
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Open enrollment
                <ArrowForward sx={{ fontSize: 18 }} />
              </Typography>
            </CardContent>
          </Card>
        </Box>
      ) : (
        <>
          {/* Welcome + Featured cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} lg={8}>
              <WelcomeCard displayName={user ? displayNameFromEmail(user.email) : 'Admin'} />
            </Grid>
            <Grid item xs={12} lg={4}>
              <FeaturedCard />
            </Grid>
          </Grid>

          {/* Stat cards - always visible with consistent styling */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {cards.map((c) => (
              <Grid item xs={12} sm={6} lg={3} key={c.title}>
                <StatCard {...c} />
              </Grid>
            ))}
          </Grid>

          {/* Chart + Recent activity */}
          <Grid container spacing={3}>
            {/* Detection trends */}
            <Grid item xs={12} lg={8}>
              <DetectionTrendsChartLazy trends={trends} />
            </Grid>

            {/* Recent detections */}
            <Grid item xs={12} lg={4}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Security color="primary" sx={{ fontSize: 24 }} />
                      <Typography variant="h6" fontWeight={700}>
                        Recent Detections
                      </Typography>
                    </Box>
                    <Typography
                      href="/detections"
                      component={Link}
                      sx={{
                        fontSize: '0.8rem',
                        color: 'primary.main',
                        textDecoration: 'none',
                        fontWeight: 600,
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      View all
                    </Typography>
                  </Box>
                  <List dense disablePadding>
                    {recentDetections.length === 0 ? (
                      <Box sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <EmptyStateIllustration size={140} sx={{ mb: 2 }} />
                        <Typography variant="body2" color="text.secondary">
                          No detections yet
                        </Typography>
                      </Box>
                    ) : (
                      recentDetections.map((d) => (
                        <ListItem
                          key={d.id}
                          disablePadding
                          sx={{
                            py: 1.5,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            '&:last-child': { borderBottom: 'none' },
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Chip
                                  label={d.status}
                                  size="small"
                                  color={d.status === 'known' ? 'success' : 'warning'}
                                  sx={{ height: 22, fontSize: '0.7rem' }}
                                />
                                <Typography variant="body2" fontWeight={500}>
                                  {d.camera_name?.trim() || `Camera ${d.camera_id}`}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                {(d.confidence * 100).toFixed(0)}% · {formatDateTime(d.timestamp)}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Recent alerts */}
            <Grid item xs={12}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Notifications color="primary" sx={{ fontSize: 24 }} />
                      <Typography variant="h6" fontWeight={700}>
                        Recent Alerts
                      </Typography>
                    </Box>
                    <Typography
                      href="/alerts"
                      component={Link}
                      sx={{
                        fontSize: '0.8rem',
                        color: 'primary.main',
                        textDecoration: 'none',
                        fontWeight: 600,
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      View all
                    </Typography>
                  </Box>
                  <List dense disablePadding>
                    {recentAlerts.length === 0 ? (
                      <Box sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <EmptyStateIllustration size={140} sx={{ mb: 2 }} />
                        <Typography variant="body2" color="text.secondary">
                          No alerts yet
                        </Typography>
                      </Box>
                    ) : (
                      recentAlerts.map((a) => (
                        <ListItem
                          key={a.id}
                          disablePadding
                          sx={{
                            py: 1.5,
                            px: 0,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            '&:last-child': { borderBottom: 'none' },
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                                <Chip
                                  label={a.alert_type}
                                  size="small"
                                  color={a.severity === 'error' ? 'error' : 'default'}
                                  sx={{ height: 22, fontSize: '0.7rem' }}
                                />
                                <Typography variant="body2" fontWeight={a.is_read ? 400 : 600}>
                                  {a.message}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                {formatDateTime(a.timestamp)}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
