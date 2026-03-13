'use client';

import { useEffect, useState } from 'react';
import { Box, Card, Table, TableBody, TableCell, TableHead, TableRow, Typography, Chip } from '@mui/material';
import { api } from '@/lib/api';

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
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
          Detections
        </Typography>
        <Typography variant="body2" color="text.secondary">
        Face detection history. Filter by camera or date in future.
        </Typography>
      </Box>
      {error && <Typography color="error" sx={{ mb: 1 }}>{error}</Typography>}
      <Card>
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
                <TableCell>{new Date(d.timestamp).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {detections.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">No detections yet. Start cameras to see live detections.</Typography>
          </Box>
        )}
      </Card>
    </Box>
  );
}
