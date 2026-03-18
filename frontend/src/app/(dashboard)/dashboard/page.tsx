'use client';

import { useEffect, useState } from 'react';
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
  TrendingUp,
  Notifications,
  Security,
  ArrowForward,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/formatDate';
import { useWebSocket } from '@/hooks/useWebSocket';
import {
  EmptyStateIllustration,
  ChartEmptyIllustration,
} from '@/components/illustrations';
import { WelcomeCard, FeaturedCard } from '@/components/dashboard';

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
        bgcolor: '#ffffff',
        border: '1px solid rgba(145, 158, 171, 0.24)',
        boxShadow: '0px 0px 2px rgba(145, 158, 171, 0.16), 0px 16px 32px -8px rgba(145, 158, 171, 0.22)',
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
          boxShadow: `0 20px 40px -12px ${alpha(color, 0.28)}`,
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
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5 }}>
          {title}
        </Typography>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            fontSize: { xs: '1.75rem', sm: '2rem' },
            letterSpacing: '-0.02em',
            color: 'text.primary',
          }}
        >
          {value}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5 }}>
          <Typography variant="caption" color="primary.main" fontWeight={700}>
            View details
          </Typography>
          <ArrowForward sx={{ fontSize: 16, color: 'primary.main' }} />
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
    Promise.all([
      api<OverviewData>('/api/v1/analytics/overview'),
      api<{ date: string; count: number }[]>('/api/v1/analytics/detection-trends?days=7'),
      api<RecentDetection[]>('/api/v1/analytics/recent-detections?limit=5'),
      api<RecentAlert[]>('/api/v1/analytics/recent-alerts?limit=5'),
      api<UserMe>('/api/v1/auth/me').catch(() => null),
    ])
      .then(([overview, trendData, detections, alerts, me]) => {
        setData(overview);
        setTrends(trendData);
        setRecentDetections(detections);
        setRecentAlerts(alerts);
        setUser(me ?? null);
      })
      .catch(() => setError('Login required'))
      .finally(() => setLoading(false));
  };

  const { connected } = useWebSocket((event) => {
    if (['face_recognized', 'unknown_person_detected', 'object_detected', 'camera_status'].includes(event.type)) {
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
      color: '#00AB55',
      href: '/cameras',
    },
    {
      title: "Today's Detections",
      value: data?.detections_today ?? '-',
      icon: <History sx={{ fontSize: 28 }} />,
      color: '#FFAB00',
      href: '/detections',
      trend: data?.detection_trend_7d,
    },
    {
      title: 'Unknown Today',
      value: data?.unknown_detections_today ?? '-',
      icon: <Warning sx={{ fontSize: 28 }} />,
      color: '#FF5630',
      href: '/detections',
    },
  ];

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      {/* Header with Live chip */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
            Overview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            AI Surveillance metrics and real-time activity
          </Typography>
        </Box>
        <Chip
          label={connected ? 'Live' : 'Offline'}
          size="medium"
          color={connected ? 'success' : 'default'}
          sx={{ fontWeight: 600 }}
        />
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error} — Login at /login
        </Typography>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={40} />
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
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 3,
                        bgcolor: 'primary.main',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <TrendingUp sx={{ fontSize: 22 }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        Detection Trends
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Last 7 days
                      </Typography>
                    </Box>
                  </Box>
                  {trends.length === 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                      <ChartEmptyIllustration size={140} sx={{ mb: 2 }} />
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                        No detection data yet. Start cameras to see trends.
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={trends}>
                          <defs>
                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2065D1" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#2065D1" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(145, 158, 171, 0.2)" vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#637381" />
                          <YAxis tick={{ fontSize: 12 }} stroke="#637381" />
                          <Tooltip
                            contentStyle={{
                              borderRadius: 12,
                              border: '1px solid rgba(145, 158, 171, 0.24)',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                            }}
                          />
                          <Area type="monotone" dataKey="count" stroke="none" fill="url(#colorCount)" />
                          <Line
                            type="monotone"
                            dataKey="count"
                            stroke="#2065D1"
                            strokeWidth={2}
                            dot={{ fill: '#2065D1', r: 4 }}
                            activeDot={{ r: 6, fill: '#2065D1', stroke: 'white', strokeWidth: 2 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </Box>
                  )}
                </CardContent>
              </Card>
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
                                  Camera {d.camera_id}
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
