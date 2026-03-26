'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Card, CardContent, Grid, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
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
  Legend,
  Area,
  ComposedChart,
} from 'recharts';
import { api } from '@/lib/api';
import { ChartEmptyIllustration } from '@/components/illustrations';
import { StitchPageHeader } from '@/components/StitchPageHeader';
import { stitchChart } from '@/theme/stitchSx';

type DayRange = 7 | 14 | 30;

export default function AnalyticsPage() {
  const [days, setDays] = useState<DayRange>(7);
  const [trends, setTrends] = useState<{ date: string; count: number }[]>([]);
  const [statusTrend, setStatusTrend] = useState<{ date: string; known: number; unknown: number }[]>([]);
  const [byCamera, setByCamera] = useState<{ camera_name: string; count: number }[]>([]);
  const [objectStats, setObjectStats] = useState<{ object: string; count: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    const q = `days=${days}`;
    api<{ date: string; count: number }[]>(`/api/v1/analytics/detection-trends?${q}`)
      .then(setTrends)
      .catch(() => setError('Load trends failed'));
    api<{ date: string; known: number; unknown: number }[]>(`/api/v1/analytics/detection-status-trends?${q}`)
      .then(setStatusTrend)
      .catch(() => setStatusTrend([]));
    api<{ camera_name: string; count: number }[]>(`/api/v1/analytics/detections-by-camera?${q}&limit=12`)
      .then(setByCamera)
      .catch(() => setByCamera([]));
    api<{ object: string; count: number }[]>(`/api/v1/analytics/object-stats?${q}`)
      .then(setObjectStats)
      .catch(() => setObjectStats([]));
  }, [days]);

  const rangeLabel = useMemo(() => `Last ${days} days`, [days]);

  const axisCommon = { stroke: stitchChart.axisStroke, tick: { fill: stitchChart.tickFill, fontSize: 11 } };
  const tooltipSx = {
    contentStyle: {
      backgroundColor: stitchChart.tooltipBg,
      border: `1px solid ${stitchChart.tooltipBorder}`,
      borderRadius: 12,
      color: '#dae2fd',
    },
    labelStyle: { color: '#c2c6d5' },
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <StitchPageHeader
        eyebrow="Telemetry"
        title="Detection Intelligence"
        subtitle="Real-time and historical face detections, object events, and per-camera load — switch the range to compare periods."
        actions={
          <ToggleButtonGroup
            exclusive
            size="small"
            value={days}
            onChange={(_, v: DayRange | null) => v && setDays(v)}
            sx={{ flexShrink: 0 }}
          >
            <ToggleButton value={7}>7d</ToggleButton>
            <ToggleButton value={14}>14d</ToggleButton>
            <ToggleButton value={30}>30d</ToggleButton>
          </ToggleButtonGroup>
        }
      />
      {error && <Typography color="error" sx={{ mb: 1 }}>{error}</Typography>}
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2, fontFamily: '"Manrope", "Public Sans", sans-serif' }}>
                All detections ({rangeLabel})
              </Typography>
              {trends.length === 0 ? (
                <Box sx={{ py: 4 }}>
                  <ChartEmptyIllustration size={120} sx={{ mx: 'auto', display: 'block', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                    No detection data. Start cameras to see trends.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ height: { xs: 240, sm: 300 } }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" stroke={stitchChart.gridStroke} vertical={false} />
                      <XAxis dataKey="date" {...axisCommon} />
                      <YAxis allowDecimals={false} {...axisCommon} />
                      <Tooltip {...tooltipSx} />
                      <Line type="monotone" dataKey="count" name="Total" stroke="#2065d1" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2, fontFamily: '"Manrope", "Public Sans", sans-serif' }}>
                Objects ({rangeLabel})
              </Typography>
              {objectStats.length === 0 ? (
                <Box sx={{ py: 4 }}>
                  <ChartEmptyIllustration size={100} sx={{ mx: 'auto', display: 'block', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                    No object stats yet.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ height: { xs: 240, sm: 300 } }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={objectStats} layout="vertical" margin={{ left: 8, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={stitchChart.gridStroke} horizontal={false} />
                      <XAxis type="number" allowDecimals={false} {...axisCommon} />
                      <YAxis dataKey="object" type="category" width={88} tick={{ fill: stitchChart.tickFill, fontSize: 11 }} />
                      <Tooltip {...tooltipSx} />
                      <Bar dataKey="count" name="Count" fill="#00aa54" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2, fontFamily: '"Manrope", "Public Sans", sans-serif' }}>
                Known vs unknown faces ({rangeLabel})
              </Typography>
              {statusTrend.length === 0 ? (
                <Box sx={{ py: 4 }}>
                  <ChartEmptyIllustration size={120} sx={{ mx: 'auto', display: 'block', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                    No face detection breakdown yet.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ height: { xs: 260, sm: 320 } }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={statusTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke={stitchChart.gridStroke} vertical={false} />
                      <XAxis dataKey="date" {...axisCommon} />
                      <YAxis allowDecimals={false} {...axisCommon} />
                      <Tooltip {...tooltipSx} />
                      <Legend wrapperStyle={{ color: '#c2c6d5' }} />
                      <Area
                        type="monotone"
                        dataKey="unknown"
                        name="Unknown"
                        stackId="a"
                        fill="#ffb950"
                        stroke="#e5a545"
                      />
                      <Area
                        type="monotone"
                        dataKey="known"
                        name="Known"
                        stackId="a"
                        fill="#57e082"
                        stroke="#3dcc6a"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2, fontFamily: '"Manrope", "Public Sans", sans-serif' }}>
                Detections by camera ({rangeLabel})
              </Typography>
              {byCamera.length === 0 ? (
                <Box sx={{ py: 4 }}>
                  <ChartEmptyIllustration size={100} sx={{ mx: 'auto', display: 'block', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                    No per-camera data in this range.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ height: Math.min(420, 48 + byCamera.length * 36) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byCamera} layout="vertical" margin={{ left: 16, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={stitchChart.gridStroke} horizontal={false} />
                      <XAxis type="number" allowDecimals={false} {...axisCommon} />
                      <YAxis dataKey="camera_name" type="category" width={140} tick={{ fill: stitchChart.tickFill, fontSize: 11 }} />
                      <Tooltip {...tooltipSx} />
                      <Bar dataKey="count" name="Detections" fill="#2065d1" radius={[0, 4, 4, 0]} />
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
