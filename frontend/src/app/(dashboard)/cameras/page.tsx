'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
  TableContainer,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { Add, Delete, Edit, Info, Search, Visibility, VisibilityOff } from '@mui/icons-material';
import { api } from '@/lib/api';
import { maskRtspUrl } from '@/lib/maskRtsp';
import { useToast } from '@/contexts/ToastContext';
import { EmptyState } from '@/components/EmptyState';
import { StitchPageHeader } from '@/components/StitchPageHeader';

interface Camera {
  id: number;
  camera_name: string;
  rtsp_url: string;
  status: string;
  is_enabled: boolean;
}

export default function CamerasPage() {
  const toast = useToast();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Camera | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  /** Row id → show full RTSP (otherwise masked) */
  const [rtspRevealed, setRtspRevealed] = useState<Record<number, boolean>>({});
  const [showRtspInDialog, setShowRtspInDialog] = useState(false);

  const filteredCameras = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return cameras;
    return cameras.filter(
      (c) =>
        c.camera_name.toLowerCase().includes(q) ||
        c.rtsp_url.toLowerCase().includes(q) ||
        String(c.id).includes(q),
    );
  }, [cameras, filter]);

  const load = () => {
    setLoading(true);
    api<Camera[]>('/api/v1/cameras')
      .then(setCameras)
      .catch(() => setError('Load failed'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleOpen = (cam?: Camera) => {
    setEditing(cam || null);
    setName(cam?.camera_name || '');
    setUrl(cam?.rtsp_url || '');
    setShowRtspInDialog(false);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
    setName('');
    setUrl('');
    setShowRtspInDialog(false);
  };

  const toggleRtspReveal = (id: number) => {
    setRtspRevealed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await api(`/api/v1/cameras/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ camera_name: name, rtsp_url: url }),
        });
        toast.success('Camera updated');
      } else {
        await api('/api/v1/cameras', {
          method: 'POST',
          body: JSON.stringify({ camera_name: name, rtsp_url: url }),
        });
        toast.success('Camera added');
      }
      handleClose();
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      setError(msg);
      toast.error(msg);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this camera?')) return;
    try {
      await api(`/api/v1/cameras/${id}`, { method: 'DELETE' });
      load();
      toast.success('Camera deleted');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Delete failed';
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <StitchPageHeader
        eyebrow="Network Management"
        title="Active Cameras"
        subtitle="Manage your distributed security nodes and RTSP sources for live monitoring and detection."
      />

      <Alert severity="info" icon={<Info />} sx={{ mb: 2 }}>
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>RTSP & Remote Access</Typography>
        <Typography variant="body2" component="span">
          RTSP URLs with local IPs (e.g. 192.168.x.x) only work when <strong>Visioryx runs on the same network</strong> as your cameras.
          If you&apos;re at home and cameras are at the office: deploy Visioryx on a machine at the office, or connect via VPN to the office network.
        </Typography>
      </Alert>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search by name, URL, or ID"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          sx={{ minWidth: { xs: '100%', sm: 280 } }}
          InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} fontSize="small" /> }}
        />
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()} sx={{ fontWeight: 600 }} size="medium">
          Add Camera
        </Button>
      </Box>
      {error && <Typography color="error" sx={{ mb: 1 }}>{error}</Typography>}
      <Card>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
        <TableContainer sx={{ overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>RTSP URL</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCameras.map((cam) => (
              <TableRow key={cam.id}>
                <TableCell>{cam.camera_name}</TableCell>
                <TableCell sx={{ maxWidth: 280 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      component="span"
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}
                      title={rtspRevealed[cam.id] ? cam.rtsp_url : maskRtspUrl(cam.rtsp_url)}
                    >
                      {rtspRevealed[cam.id] ? cam.rtsp_url : maskRtspUrl(cam.rtsp_url)}
                    </Typography>
                    <Tooltip title={rtspRevealed[cam.id] ? 'Hide URL' : 'Show full URL'}>
                      <IconButton
                        size="small"
                        aria-label={rtspRevealed[cam.id] ? 'Hide RTSP URL' : 'Reveal RTSP URL'}
                        onClick={() => toggleRtspReveal(cam.id)}
                      >
                        {rtspRevealed[cam.id] ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell><Chip label={cam.status} size="small" color={cam.status === 'active' ? 'success' : 'default'} /></TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleOpen(cam)}><Edit /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(cam.id)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </TableContainer>
        )}
        {!loading && cameras.length === 0 && (
          <CardContent>
            <EmptyState message="No cameras configured. Click Add Camera to add a camera with a real RTSP URL." />
          </CardContent>
        )}
        {!loading && cameras.length > 0 && filteredCameras.length === 0 && (
          <CardContent>
            <EmptyState message="No cameras match your search." />
          </CardContent>
        )}
      </Card>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Camera' : 'Add Camera'}</DialogTitle>
        <DialogContent>
          <TextField label="Camera Name" fullWidth value={name} onChange={(e) => setName(e.target.value)} sx={{ mt: 1 }} placeholder="e.g. Office Cam 1" />
          <TextField
            label="RTSP URL"
            fullWidth
            type={showRtspInDialog ? 'text' : 'password'}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="rtsp://user:pass@ip:554/path"
            sx={{ mt: 2 }}
            helperText="Credentials are masked until you click the eye. Same network as Visioryx required."
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showRtspInDialog ? 'Hide RTSP URL' : 'Show RTSP URL'}
                    edge="end"
                    onClick={() => setShowRtspInDialog((v) => !v)}
                  >
                    {showRtspInDialog ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
