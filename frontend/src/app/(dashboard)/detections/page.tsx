'use client';

import { useCallback, useEffect, useState } from 'react';
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
  TextField,
  MenuItem,
  TablePagination,
  InputAdornment,
  Stack,
  Button,
} from '@mui/material';
import Search from '@mui/icons-material/Search';
import FileDownload from '@mui/icons-material/FileDownload';
import Link from 'next/link';
import { api } from '@/lib/api';
import { downloadAuthenticatedFile } from '@/lib/downloadCsv';
import { useToast } from '@/contexts/ToastContext';
import { formatDateTime } from '@/lib/formatDate';
import { EmptyState } from '@/components/EmptyState';
import { StitchPageHeader } from '@/components/StitchPageHeader';

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

interface CameraOpt {
  id: number;
  camera_name: string;
}

interface UserRow {
  id: number;
  has_face_embedding?: boolean;
  image_path?: string | null;
}

export default function DetectionsPage() {
  const toast = useToast();
  const [items, setItems] = useState<Detection[]>([]);
  const [total, setTotal] = useState(0);
  const [cameras, setCameras] = useState<CameraOpt[]>([]);
  const [enrolledCount, setEnrolledCount] = useState<number | null>(null);
  const [usersSummary, setUsersSummary] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [cameraId, setCameraId] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(rowsPerPage));
      params.set('offset', String(page * rowsPerPage));
      if (search.trim()) params.set('q', search.trim());
      if (status) params.set('status', status);
      if (cameraId) params.set('camera_id', cameraId);
      const res = await api<{ items: Detection[]; total: number } | Detection[]>(
        `/api/v1/detections?${params.toString()}`,
      );
      if (Array.isArray(res)) {
        setItems(res);
        setTotal(res.length);
      } else {
        setItems(res.items ?? []);
        setTotal(typeof res.total === 'number' ? res.total : 0);
      }
    } catch {
      setError('Load failed');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, status, cameraId]);

  useEffect(() => {
    api<CameraOpt[]>('/api/v1/cameras').then(setCameras).catch(() => {});
  }, []);

  useEffect(() => {
    api<{ items: UserRow[]; total: number } | UserRow[]>('/api/v1/users?limit=200')
      .then((r) => {
        const rows = Array.isArray(r) ? r : r.items ?? [];
        setUsersSummary(rows);
        setEnrolledCount(rows.filter((u) => u.has_face_embedding).length);
      })
      .catch(() => setEnrolledCount(null));
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput), 400);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    void load();
  }, [load]);

  const cameraLabel = (d: Detection) => d.camera_name?.trim() || `Camera ${d.camera_id}`;

  const exportQuery = () => {
    const params = new URLSearchParams();
    params.set('export_limit', '50000');
    if (search.trim()) params.set('q', search.trim());
    if (status) params.set('status', status);
    if (cameraId) params.set('camera_id', cameraId);
    return params.toString();
  };

  const handleExportCsv = async () => {
    try {
      await downloadAuthenticatedFile(`/api/v1/detections/export.csv?${exportQuery()}`, 'visioryx-detections.csv');
      toast.success('CSV download started');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed');
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <StitchPageHeader
        eyebrow="Forensics"
        title="Detection Intelligence"
        subtitle="Deep-layer face detections across your camera grid. Known rows show enrolled names; confidence for known is similarity to the enrolled face, for unknown it is detector score only. Export CSV for audits."
      />
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
      {enrolledCount === 0 && !usersSummary.some((u) => u.image_path && !u.has_face_embedding) && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No enrolled faces yet — add users on the{' '}
          <Link href="/users" style={{ fontWeight: 600 }}>
            Users
          </Link>{' '}
          page and upload a clear front-facing photo so names can appear here as <strong>known</strong>.
        </Alert>
      )}
      {error && <Typography color="error" sx={{ mb: 1 }}>{error}</Typography>}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <TextField
          size="small"
          label="Search"
          placeholder="Camera, person, or ID"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: { xs: '100%', sm: 260 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          size="small"
          label="Status"
          select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="known">Known</MenuItem>
          <MenuItem value="unknown">Unknown</MenuItem>
        </TextField>
        <TextField
          size="small"
          label="Camera"
          select
          value={cameraId}
          onChange={(e) => {
            setCameraId(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All cameras</MenuItem>
          {cameras.map((c) => (
            <MenuItem key={c.id} value={String(c.id)}>
              {c.camera_name}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="outlined"
          size="medium"
          startIcon={<FileDownload />}
          onClick={() => void handleExportCsv()}
          sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}
        >
          Export CSV
        </Button>
      </Stack>

      <Card sx={{ bgcolor: 'background.paper' }}>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">Loading…</Typography>
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <EmptyState message="No detections match your filters. Start cameras or adjust search." />
          </Box>
        ) : (
          <>
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
                  {items.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{d.id}</TableCell>
                      <TableCell sx={{ fontWeight: d.user_name ? 600 : 400 }}>
                        {d.user_name ?? '—'}
                      </TableCell>
                      <TableCell>{cameraLabel(d)}</TableCell>
                      <TableCell>
                        <Chip label={d.status} size="small" color={d.status === 'known' ? 'success' : 'warning'} />
                      </TableCell>
                      <TableCell>{(d.confidence * 100).toFixed(0)}%</TableCell>
                      <TableCell>{formatDateTime(d.timestamp)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </>
        )}
      </Card>
    </Box>
  );
}
