'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  FormControlLabel,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Stack,
  Switch,
  TablePagination,
  TextField,
  Typography,
  Chip,
} from '@mui/material';
import { CheckCircle, FileDownload, MarkEmailRead, MarkEmailUnread, Search } from '@mui/icons-material';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { downloadAuthenticatedFile } from '@/lib/downloadCsv';
import { formatDateTime } from '@/lib/formatDate';
import { EmptyState } from '@/components/EmptyState';
import { StitchPageHeader } from '@/components/StitchPageHeader';

interface Alert {
  id: number;
  alert_type: string;
  message: string;
  severity: string;
  is_read: boolean;
  timestamp: string;
}

export default function AlertsPage() {
  const toast = useToast();
  const [items, setItems] = useState<Alert[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [bulkBusy, setBulkBusy] = useState<'read' | 'unread' | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(rowsPerPage));
      params.set('offset', String(page * rowsPerPage));
      if (search.trim()) params.set('q', search.trim());
      if (unreadOnly) params.set('unread_only', 'true');
      const res = await api<{ items: Alert[]; total: number } | Alert[]>(`/api/v1/alerts?${params.toString()}`);
      if (Array.isArray(res)) {
        setItems(res);
        setTotal(res.length);
      } else {
        setItems(res.items ?? []);
        setTotal(typeof res.total === 'number' ? res.total : 0);
      }
    } catch {
      setError('Load failed');
    }
  }, [page, rowsPerPage, search, unreadOnly]);

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput), 400);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = async (id: number) => {
    try {
      await api(`/api/v1/alerts/${id}/read`, { method: 'PATCH' });
      void load();
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    setBulkBusy('read');
    try {
      const r = await api<{ updated: number }>('/api/v1/alerts/mark-all-read', { method: 'POST' });
      toast.success(r.updated ? `Marked ${r.updated} alert(s) as read` : 'No alerts to update');
      void load();
    } catch {
      toast.error('Could not mark all as read');
    } finally {
      setBulkBusy(null);
    }
  };

  const markAllUnread = async () => {
    setBulkBusy('unread');
    try {
      const r = await api<{ updated: number }>('/api/v1/alerts/mark-all-unread', { method: 'POST' });
      toast.success(r.updated ? `Marked ${r.updated} alert(s) as unread` : 'No alerts to update');
      void load();
    } catch {
      toast.error('Could not mark all as unread');
    } finally {
      setBulkBusy(null);
    }
  };

  const exportAlertsCsv = async () => {
    try {
      const params = new URLSearchParams();
      params.set('export_limit', '50000');
      if (search.trim()) params.set('q', search.trim());
      if (unreadOnly) params.set('unread_only', 'true');
      await downloadAuthenticatedFile(`/api/v1/alerts/export.csv?${params.toString()}`, 'visioryx-alerts.csv');
      toast.success('CSV download started');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed');
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <StitchPageHeader
        eyebrow="System Monitoring"
        title="Security Alerts"
        subtitle="Unknown face events, security notices, and camera status — search, filter unread, and export CSV."
      />
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 2 }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        flexWrap="wrap"
        useFlexGap
      >
        <TextField
          size="small"
          placeholder="Search message or type"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: { xs: '100%', sm: 280 }, flex: { sm: '1 1 auto' } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={unreadOnly}
              onChange={(_, v) => {
                setUnreadOnly(v);
                setPage(0);
              }}
            />
          }
          label="Unread only"
        />
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ ml: { sm: 'auto' } }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<MarkEmailRead />}
            onClick={() => void markAllRead()}
            disabled={!!bulkBusy || total === 0}
          >
            {bulkBusy === 'read' ? '…' : 'Mark all read'}
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<MarkEmailUnread />}
            onClick={() => void markAllUnread()}
            disabled={!!bulkBusy || total === 0}
          >
            {bulkBusy === 'unread' ? '…' : 'Mark all unread'}
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<FileDownload />}
            onClick={() => void exportAlertsCsv()}
            disabled={total === 0}
          >
            Export CSV
          </Button>
        </Stack>
      </Stack>
      {error && <Typography color="error" sx={{ mb: 1 }}>{error}</Typography>}
      <Card sx={{ bgcolor: 'background.paper' }}>
        <List sx={{ py: 0 }}>
          {items.map((a) => (
            <ListItem
              key={a.id}
              sx={{ bgcolor: a.is_read ? 'transparent' : 'action.hover' }}
              secondaryAction={
                !a.is_read && (
                  <IconButton edge="end" size="small" onClick={() => markRead(a.id)}>
                    <CheckCircle />
                  </IconButton>
                )
              }
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label={a.alert_type} size="small" color={a.severity === 'error' ? 'error' : 'default'} />
                    {a.message}
                  </Box>
                }
                secondary={formatDateTime(a.timestamp)}
              />
            </ListItem>
          ))}
        </List>
        {items.length === 0 && (
          <Box sx={{ p: 3 }}>
            <EmptyState message={total === 0 ? 'No alerts yet.' : 'No alerts match your filters.'} />
          </Box>
        )}
        {total > 0 && (
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
        )}
      </Card>
    </Box>
  );
}
