'use client';

import { Box, Card, CardContent, Typography } from '@mui/material';
import { TrendingUp } from '@mui/icons-material';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartEmptyIllustration } from '@/components/illustrations';

type TrendPoint = { date: string; count: number };

export default function DetectionTrendsChart({ trends }: { trends: TrendPoint[] }) {
  return (
    <Card sx={{ height: '100%', bgcolor: '#222a3d' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 3,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
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
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#c2c6d5' }} stroke="#424753" />
                <YAxis tick={{ fontSize: 12, fill: '#c2c6d5' }} stroke="#424753" />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
                    background: '#171f33',
                    color: '#dae2fd',
                  }}
                  labelStyle={{ color: '#c2c6d5' }}
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
  );
}
