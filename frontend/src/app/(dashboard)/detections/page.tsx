'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Chip,
  TableContainer,
  Alert,
} from '@mui/material';
import Link from 'next/link';
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

interface UserRow {
  id: number;
  has_face_embedding?: boolean;
}

export default function DetectionsPage() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [enrolledCount, setEnrolledCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Detection[]>('/api/v1/detections?limit=50')
      .then(setDetections)
      .catch(() => setError('Load failed'));
    api<UserRow[]>('/api/v1/users')
      .then((users) => {
        const n = users.filter((u) => u.has_face_embedding).length;
        setEnrolledCount(n);
      })
      .catch(() => setEnrolledCount(null));
  }, []);

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
          Detections
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
          Face events from live streams. <strong>Known</strong> = matched to a user with an enrolled face photo;
          <strong> unknown</strong> = face seen but not matched (or no enrolled faces yet).
        </Typography>
      </Box>
      {enrolledCount === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No users have a face embedding yet — detections will show as <strong>unknown</strong> until you add users
          on the{' '}
          <Link href="/users" style={{ fontWeight: 600 }}>
            Users
          </Link>{' '}
          page and upload a clear front-facing photo for each person.
        </Alert>
      )}
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
