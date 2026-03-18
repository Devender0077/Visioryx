'use client';

import { useEffect, useRef, useState } from 'react';
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
  TableContainer,
  Avatar,
  Stack,
  Chip,
} from '@mui/material';
import { Add, CloudUpload, Visibility } from '@mui/icons-material';
import { api, getStreamBase, getToken } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { EmptyState } from '@/components/EmptyState';

interface User {
  id: number;
  name: string;
  email: string;
  image_path?: string;
  is_active: boolean;
}

export default function UsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<number | null>(null);
  const [uploadUserId, setUploadUserId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUser, setPreviewUser] = useState<User | null>(null);
  const [photoLoadError, setPhotoLoadError] = useState(false);

  const load = () => api<User[]>('/api/v1/users').then(setUsers).catch(() => setError('Load failed'));

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    try {
      await api('/api/v1/users', {
        method: 'POST',
        body: JSON.stringify({ name, email }),
      });
      setOpen(false);
      setName('');
      setEmail('');
      load();
      toast.success('User registered successfully');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      setError(msg);
      toast.error(msg);
    }
  };

  const handleUpload = async (userId: number, file: File) => {
    setUploading(userId);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      await api(`/api/v1/users/${userId}/upload-face`, {
        method: 'POST',
        body: form,
      });
      await load();
      toast.success('Face photo uploaded successfully');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(null);
    }
  };

  const photoUrlFor = (userId: number) => {
    const token = getToken();
    if (!token) return null;
    const base = getStreamBase();
    // cache-bust to avoid stale 401/old image after upload
    return `${base}/api/v1/users/${userId}/photo?token=${encodeURIComponent(token)}&_=${Date.now()}`;
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Box sx={{ mb: { xs: 2, sm: 3 }, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
            Users
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
            Register users for face recognition. After adding a user, click the upload icon to add a face photo.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)} sx={{ fontWeight: 600 }}>
          Register User
        </Button>
      </Box>
      {error && <Typography color="error" sx={{ mb: 1 }}>{error}</Typography>}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && uploadUserId) handleUpload(uploadUserId, f);
          setUploadUserId(null);
          e.target.value = '';
        }}
      />
      <Card sx={{ bgcolor: 'background.paper' }}>
        <CardContent>
          {users.length === 0 ? (
            <EmptyState message="No users registered. Register a user, then upload a face photo for recognition." />
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Face</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <Avatar
                          src={u.image_path ? photoUrlFor(u.id) ?? undefined : undefined}
                          sx={{ width: 32, height: 32 }}
                        >
                          {u.name?.[0]?.toUpperCase?.() ?? 'U'}
                        </Avatar>
                        {u.image_path ? (
                          <Chip label="Ready" size="small" color="success" variant="outlined" />
                        ) : (
                          <Chip label="Not uploaded" size="small" variant="outlined" />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setPhotoLoadError(false);
                          setPreviewUser(u);
                        }}
                        disabled={!u.image_path}
                        title={u.image_path ? 'View photo' : 'No photo uploaded'}
                      >
                        <Visibility />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setUploadUserId(u.id);
                          fileInputRef.current?.click();
                        }}
                        disabled={uploading === u.id}
                        title="Upload face image"
                      >
                        <CloudUpload />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Register User</DialogTitle>
        <DialogContent>
          <TextField label="Name" fullWidth value={name} onChange={(e) => setName(e.target.value)} sx={{ mt: 1 }} />
          <TextField label="Email" fullWidth type="email" value={email} onChange={(e) => setEmail(e.target.value)} sx={{ mt: 2 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Register</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!previewUser} onClose={() => setPreviewUser(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Uploaded photo</DialogTitle>
        <DialogContent>
          {previewUser?.image_path ? (
            <Box
              sx={{
                width: '100%',
                borderRadius: 2,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.default',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrlFor(previewUser.id) ?? undefined}
                alt={previewUser.name}
                style={{ width: '100%', height: 360, display: 'block', objectFit: 'contain', background: '#fff' }}
                onError={() => setPhotoLoadError(true)}
              />
            </Box>
          ) : (
            <Typography color="text.secondary">No photo uploaded.</Typography>
          )}
          {photoLoadError && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              Couldn&apos;t load the photo. This is usually due to an expired login token or missing file on disk.
              Please logout/login once, then try again.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewUser(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}