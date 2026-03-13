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
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
          Analytics
        </Typography>
        <Typography variant="body2" color="text.secondary">
        Detection trends and object statistics
        </Typography>
      </Box>
      {error && <Typography color="error" sx={{ mb: 1 }}>{error}</Typography>}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Detection Trends (7 days)</Typography>
              <Box sx={{ height: 300 }}>
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
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Object Detection (7 days)</Typography>
              <Box sx={{ height: 300 }}>
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
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {trends.length === 0 && objectStats.length === 0 && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography color="text.secondary">
              No analytics data yet. Start cameras and run detection to see trends.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
