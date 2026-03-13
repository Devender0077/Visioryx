'use client';

import { useEffect, useState } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

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

  const load = () => api<Camera[]>('/api/v1/cameras').then(setCameras).catch(() => setError('Load failed'));

  useEffect(() => {
    load();
  }, []);

  const handleOpen = (cam?: Camera) => {
    setEditing(cam || null);
    setName(cam?.camera_name || '');
    setUrl(cam?.rtsp_url || '');
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
    setName('');
    setUrl('');
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
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
          Cameras
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage camera sources for live monitoring and detection
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()} sx={{ fontWeight: 600 }}>
          Add Camera
        </Button>
      </Box>
      {error && <Typography color="error" sx={{ mb: 1 }}>{error}</Typography>}
      <Card>
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
            {cameras.map((cam) => (
              <TableRow key={cam.id}>
                <TableCell>{cam.camera_name}</TableCell>
                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{cam.rtsp_url}</TableCell>
                <TableCell><Chip label={cam.status} size="small" color={cam.status === 'active' ? 'success' : 'default'} /></TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleOpen(cam)}><Edit /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(cam.id)}><Delete /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {cameras.length === 0 && (
          <CardContent>
            <Typography color="text.secondary">No cameras. Click Add Camera to add one.</Typography>
          </CardContent>
        )}
      </Card>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Camera' : 'Add Camera'}</DialogTitle>
        <DialogContent>
          <TextField label="Camera Name" fullWidth value={name} onChange={(e) => setName(e.target.value)} sx={{ mt: 1 }} />
          <TextField label="RTSP URL" fullWidth value={url} onChange={(e) => setUrl(e.target.value)} placeholder="rtsp://..." sx={{ mt: 2 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
