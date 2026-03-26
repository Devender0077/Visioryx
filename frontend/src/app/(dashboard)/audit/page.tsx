'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  TableContainer,
  TablePagination,
  Chip,
  TextField,
  InputAdornment,
  Divider,
} from '@mui/material';
import Search from '@mui/icons-material/Search';
import Refresh from '@mui/icons-material/Refresh';
import DeleteSweep from '@mui/icons-material/DeleteSweep';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/formatDate';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/contexts/ToastContext';

interface AuditRow {
  id: number;
  actor_email: string;
  action: string;
  resource_type: string;
  resource_id: number | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

export default function AuditLogPage() {
  const toast = useToast();
  const [items, setItems] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purgeDays, setPurgeDays] = useState(90);
  const [purgeAlerts, setPurgeAlerts] = useState(false);
  const [purgeObjects, setPurgeObjects] = useState(true);
  const [purgeUnknown, setPurgeUnknown] = useState(false);
  const [purging, setPurging] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput), 400);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(0);
  }, [search, actionFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(rowsPerPage));
      params.set('offset', String(page * rowsPerPage));
      if (search.trim()) params.set('q', search.trim());
      if (actionFilter.trim()) params.set('action', actionFilter.trim());
      const r = await api<{ items: AuditRow[]; total: number }>(`/api/v1/audit?${params.toString()}`);
      setItems(r.items);
      setTotal(r.total);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load audit log';
      setError(msg);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, actionFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    api<Record<string, number>>('/api/v1/admin/storage-summary')
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);

  const runPurge = async () => {
    setPurging(true);
    try {
      const r = await api<{
        detections_deleted: number;
        alerts_deleted: number;
        objects_deleted: number;
        unknown_faces_deleted: number;
      }>('/api/v1/admin/purge-old-data', {
        method: 'POST',
        body: JSON.stringify({
          days: purgeDays,
          include_alerts: purgeAlerts,
          include_objects: purgeObjects,
          include_unknown_faces: purgeUnknown,
        }),
      });
      toast.success(
        `Purge complete: ${r.detections_deleted} detections, ${r.objects_deleted} objects, ${r.alerts_deleted} alerts, ${r.unknown_faces_deleted} unknown-face rows.`,
      );
      setPurgeOpen(false);
      void load();
      const s = await api<Record<string, number>>('/api/v1/admin/storage-summary').catch(() => null);
      if (s) setSummary(s);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Purge failed');
    } finally {
      setPurging(false);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
          Audit log
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
          Admin actions: user and camera changes, email settings updates. Entries are append-only.
        </Typography>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" startIcon={<Refresh />} onClick={() => void load()}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <TextField
          size="small"
          label="Search"
          placeholder="Actor, action, resource"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
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
          label="Action contains"
          placeholder="e.g. user.create"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          sx={{ minWidth: { xs: '100%', sm: 200 } }}
        />
      </Stack>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Storage summary
          </Typography>
          {summary ? (
            <Typography variant="body2" color="text.secondary">
              Detections: <strong>{summary.detections}</strong> · Alerts: <strong>{summary.alerts}</strong> · Objects:{' '}
              <strong>{summary.object_detections}</strong> · Unknown snapshots:{' '}
              <strong>{summary.unknown_face_snapshots}</strong>
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Counts unavailable.
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Webhook: set <code>ALERT_WEBHOOK_URL</code> in backend <code>.env</code> to POST alert JSON to Slack/Discord.
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Button
            variant="outlined"
            color="warning"
            size="small"
            startIcon={<DeleteSweep />}
            onClick={() => setPurgeOpen(true)}
          >
            Purge old data…
          </Button>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Deletes rows older than the chosen age (destructive). Run backups first in production.
          </Typography>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={36} />
            </Box>
          ) : !error && items.length === 0 ? (
            <Box sx={{ p: 3 }}>
              <EmptyState message="No audit events match your filters. Events appear after user/camera/email changes." />
            </Box>
          ) : error ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Audit entries could not be loaded. Use Retry above after fixing the issue (e.g. run database migrations).
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Actor</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Resource</TableCell>
                      <TableCell>Detail</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(row.created_at)}</TableCell>
                        <TableCell>{row.actor_email}</TableCell>
                        <TableCell>
                          <Chip label={row.action} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          {row.resource_type}
                          {row.resource_id != null ? ` #${row.resource_id}` : ''}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 360, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                          {row.detail ? JSON.stringify(row.detail) : '—'}
                        </TableCell>
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
        </CardContent>
      </Card>

      <Dialog open={purgeOpen} onClose={() => !purging && setPurgeOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Purge old data</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Permanently delete database rows with timestamps older than the number of days below. This cannot be undone.
          </Typography>
          <TextField
            label="Older than (days)"
            type="number"
            fullWidth
            value={purgeDays}
            onChange={(e) => setPurgeDays(Math.max(1, parseInt(e.target.value, 10) || 90))}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={<Checkbox checked={purgeObjects} onChange={(_, v) => setPurgeObjects(v)} />}
            label="Include object detection rows"
          />
          <FormControlLabel
            control={<Checkbox checked={purgeAlerts} onChange={(_, v) => setPurgeAlerts(v)} />}
            label="Include alerts"
          />
          <FormControlLabel
            control={<Checkbox checked={purgeUnknown} onChange={(_, v) => setPurgeUnknown(v)} />}
            label="Include unknown face snapshot rows"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPurgeOpen(false)} disabled={purging}>
            Cancel
          </Button>
          <Button color="warning" variant="contained" onClick={() => void runPurge()} disabled={purging}>
            {purging ? <CircularProgress size={22} color="inherit" /> : 'Purge'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
