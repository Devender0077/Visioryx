'use client';

import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Chip, Grid, Typography } from '@mui/material';
import { People, Videocam, History, Warning } from '@mui/icons-material';
import { api } from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function DashboardPage() {
  const [data, setData] = useState<{
    total_users?: number;
    total_cameras?: number;
    active_cameras?: number;
    detections_today?: number;
    unknown_detections_today?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    api<typeof data>('/api/v1/analytics/overview')
      .then(setData)
      .catch(() => setError('Login required'));

  const { connected } = useWebSocket((event) => {
    if (['face_recognized', 'unknown_person_detected', 'object_detected', 'camera_status'].includes(event.type)) {
      load();
    }
  });

  useEffect(() => {
    load();
  }, []);

  const cards = [
    {
      title: 'Total Users',
      value: data?.total_users ?? '-',
      icon: <People />,
      color: '#2065D1',
      bg: 'rgba(32, 101, 209, 0.08)',
    },
    {
      title: 'Active Cameras',
      value: data?.active_cameras ?? '-',
      icon: <Videocam />,
      color: '#00AB55',
      bg: 'rgba(0, 171, 85, 0.08)',
    },
    {
      title: "Today's Detections",
      value: data?.detections_today ?? '-',
      icon: <History />,
      color: '#FFAB00',
      bg: 'rgba(255, 171, 0, 0.08)',
    },
    {
      title: 'Unknown Today',
      value: data?.unknown_detections_today ?? '-',
      icon: <Warning />,
      color: '#FF5630',
      bg: 'rgba(255, 86, 48, 0.08)',
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            Hi, Welcome back 👋
          </Typography>
          <Typography variant="body2" color="text.secondary">
            AI Surveillance overview and real-time metrics
          </Typography>
        </Box>
        <Chip
          label={connected ? 'Live' : 'Offline'}
          size="medium"
          color={connected ? 'success' : 'default'}
          sx={{
            fontWeight: 600,
            '& .MuiChip-icon': { color: 'inherit' },
          }}
        />
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error} — Login at /login
        </Typography>
      )}

      <Grid container spacing={3}>
        {cards.map((c) => (
          <Grid item xs={12} sm={6} md={3} key={c.title}>
            <Card
              sx={{
                transition: 'box-shadow 0.3s ease, transform 0.2s ease',
                '&:hover': {
                  boxShadow: '0px 0px 2px rgba(145, 158, 171, 0.2), 0px 20px 40px -4px rgba(145, 158, 171, 0.12)',
                },
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 2,
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: c.bg,
                      color: c.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {c.icon}
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  {c.title}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {c.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
