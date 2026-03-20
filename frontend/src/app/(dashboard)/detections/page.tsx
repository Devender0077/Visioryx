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
  camera_name?: string | null;
  user_id?: number | null;
  user_name?: string | null;
  status: string;
  confidence: number;
  timestamp: string;
}

interface UserRow {
  id: number;
  has_face_embedding?: boolean;
  image_path?: string | null;
}

export default function DetectionsPage() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [enrolledCount, setEnrolledCount] = useState<number | null>(null);
  const [usersSummary, setUsersSummary] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Detection[]>('/api/v1/detections?limit=50')
      .then(setDetections)
      .catch(() => setError('Load failed'));
    api<UserRow[]>('/api/v1/users')
      .then((users) => {
        setUsersSummary(users);
        setEnrolledCount(users.filter((u) => u.has_face_embedding).length);
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
          <strong>Known</strong> rows show the matched person’s name when recognition succeeds. Confidence for <strong>known</strong> is
          similarity to the enrolled face; for <strong>unknown</strong> it is face-detector score only.
        </Typography>
      </Box>
      {enrolledCount === 0 && usersSummary.length > 0 && usersSummary.some((u) => u.image_path && !u.has_face_embedding) && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          A photo is saved but <strong>no face embedding</strong> was stored — usually the face was unclear, too small, or the server
          is in OpenCV-only mode (no InsightFace). Re-upload a <strong>single, front-facing</strong> photo on the{' '}
          <Link href="/users" style={{ fontWeight: 600 }}>
            Users
          </Link>{' '}
          page, or install InsightFace in the backend and restart the API.
        </Alert>
      )}
      {enrolledCount === 0 && !(usersSummary.some((u) => u.image_path && !u.has_face_embedding)) && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No enrolled faces yet — add users on the{' '}
          <Link href="/users" style={{ fontWeight: 600 }}>
            Users
          </Link>{' '}
          page and upload a clear front-facing photo so names can appear here as <strong>known</strong>.
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
                  <TableCell>Person</TableCell>
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
                    <TableCell sx={{ fontWeight: d.user_name ? 600 : 400 }}>
                      {d.user_name ?? '—'}
                    </TableCell>
                    <TableCell>{d.camera_name ?? d.camera_id}</TableCell>
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
