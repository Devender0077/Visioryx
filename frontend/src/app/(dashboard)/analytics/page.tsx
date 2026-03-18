'use client';

import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Grid, Typography } from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { api } from '@/lib/api';
import { ChartEmptyIllustration } from '@/components/illustrations';

export default function AnalyticsPage() {
  const [trends, setTrends] = useState<{ date: string; count: number }[]>([]);
  const [objectStats, setObjectStats] = useState<{ object: string; count: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ date: string; count: number }[]>('/api/v1/analytics/detection-trends?days=7')
      .then(setTrends)
      .catch(() => setError('Load trends failed'));
    api<{ object: string; count: number }[]>('/api/v1/analytics/object-stats?days=7')
      .then(setObjectStats)
      .catch(() => {});
  }, []);

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
          Analytics
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
          Detection trends and object statistics
        </Typography>
      </Box>
      {error && <Typography color="error" sx={{ mb: 1 }}>{error}</Typography>}
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        <Grid item xs={12} md={8}>
          <Card sx={{ bgcolor: 'background.paper', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Detection Trends (7 days)</Typography>
              {trends.length === 0 ? (
                <Box sx={{ py: 4 }}>
                  <ChartEmptyIllustration size={120} sx={{ mx: 'auto', display: 'block', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                    No detection data. Start cameras to see trends.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ height: { xs: 220, sm: 280, md: 300 } }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#2065D1" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ bgcolor: 'background.paper', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Object Detection (7 days)</Typography>
              {objectStats.length === 0 ? (
                <Box sx={{ py: 4 }}>
                  <ChartEmptyIllustration size={100} sx={{ mx: 'auto', display: 'block', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                    No object stats yet.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ height: { xs: 220, sm: 280, md: 300 } }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={objectStats} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="object" type="category" width={80} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#00AB55" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
