'use client';

import { useEffect, useState } from 'react';
import { Box, Card, Table, TableBody, TableCell, TableHead, TableRow, Typography, Chip, TableContainer } from '@mui/material';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/formatDate';
import { EmptyState } from '@/components/EmptyState';

interface Detection {
  id: number;
  camera_id: number;
  user_id?: number;
  status: string;
  confidence: number;
  timestamp: string;
}

export default function DetectionsPage() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Detection[]>('/api/v1/detections?limit=50')
      .then(setDetections)
      .catch(() => setError('Load failed'));
  }, []);

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
          Detections
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
          Face detection history. Filter by camera or date in future.
        </Typography>
      </Box>
      {error && <Typography color="error" sx={{ mb: 1 }}>{error}</Typography>}
      <Card sx={{ bgcolor: 'background.paper' }}>
        {detections.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <EmptyState message="No detections yet. Start cameras to see live detections." />
          </Box>
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Camera</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Confidence</TableCell>
                  <TableCell>Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detections.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.id}</TableCell>
                    <TableCell>{d.camera_id}</TableCell>
                    <TableCell><Chip label={d.status} size="small" color={d.status === 'known' ? 'success' : 'warning'} /></TableCell>
                    <TableCell>{(d.confidence * 100).toFixed(0)}%</TableCell>
                    <TableCell>{formatDateTime(d.timestamp)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Box>
  );
}
