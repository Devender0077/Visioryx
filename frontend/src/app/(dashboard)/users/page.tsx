'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
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
  Tooltip,
} from '@mui/material';
import { Add, CloudUpload, DeleteOutline, QrCode2, Visibility } from '@mui/icons-material';
import { api, getStreamBase, getToken } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { EmptyState } from '@/components/EmptyState';
import QRCode from 'react-qr-code';

interface User {
  id: number;
  name: string;
  email: string;
  image_path?: string;
  is_active: boolean;
  has_face_embedding?: boolean;
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
  const [enrollUser, setEnrollUser] = useState<User | null>(null);
  const [enrollUrl, setEnrollUrl] = useState<string | null>(null);
  const [enrollHours, setEnrollHours] = useState(48);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  const handleDelete = async () => {
    if (!deleteUser) return;
    const id = deleteUser.id;
    setDeletingId(id);
    setError(null);
    try {
      await api(`/api/v1/users/${id}`, { method: 'DELETE' });
      setDeleteUser(null);
      if (previewUser?.id === id) setPreviewUser(null);
      if (enrollUser?.id === id) {
        setEnrollUser(null);
        setEnrollUrl(null);
      }
      await load();
      toast.success('User removed');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Delete failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const openEnrollmentQr = async (u: User) => {
    setEnrollUser(u);
    setEnrollUrl(null);
    setEnrollError(null);
    setEnrollLoading(true);
    try {
      const data = await api<{ token: string; enroll_path: string; expires_in_hours: number }>(
        `/api/v1/users/${u.id}/enrollment-link`,
        { method: 'POST' },
      );
      const full = `${typeof window !== 'undefined' ? window.location.origin : ''}${data.enroll_path}`;
      setEnrollUrl(full);
      setEnrollHours(data.expires_in_hours);
    } catch (e) {
      setEnrollError(e instanceof Error ? e.message : 'Failed to create link');
    } finally {
      setEnrollLoading(false);
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
            Register users for face recognition. Use the QR icon to send a phone link for self-capture
            (multi-angle), or the upload icon for a single image from this browser. Supported: JPEG, PNG, WebP, HEIC.
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
                        {u.has_face_embedding ? (
                          <Tooltip title="Face vector saved — live recognition can match this person.">
                            <Chip label="Enrolled" size="small" color="success" variant="outlined" />
                          </Tooltip>
                        ) : u.image_path ? (
                          <Tooltip
                            title={
                              'No embedding yet: the server could not build a face “fingerprint” from this photo. ' +
                              'Re-upload a single, clear, front-facing face (good light). ' +
                              'If upload fails, ensure InsightFace is installed on the backend (not OpenCV-only).'
                            }
                            arrow
                            placement="top"
                          >
                            <Chip label="No embedding" size="small" color="warning" variant="outlined" />
                          </Tooltip>
                        ) : (
                          <Tooltip title="Click the upload icon to add a face photo.">
                            <Chip label="Not uploaded" size="small" variant="outlined" />
                          </Tooltip>
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
                        onClick={() => openEnrollmentQr(u)}
                        title="Enrollment link & QR (open on phone for multi-angle capture)"
                      >
                        <QrCode2 />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setUploadUserId(u.id);
                          fileInputRef.current?.click();
                        }}
                        disabled={uploading === u.id}
                        title="Upload face image (JPEG, PNG, HEIC, …)"
                      >
                        <CloudUpload />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteUser(u)}
                        disabled={deletingId === u.id}
                        title="Delete user (admin)"
                      >
                        <DeleteOutline />
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

      <Dialog open={!!deleteUser} onClose={() => !deletingId && setDeleteUser(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Delete user</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Remove <strong>{deleteUser?.name}</strong> ({deleteUser?.email}) from face recognition? This cannot be undone.
            Past detection rows stay in the database but will no longer link to this person.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteUser(null)} disabled={!!deletingId}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={() => void handleDelete()} disabled={!!deletingId}>
            {deletingId ? <CircularProgress size={22} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

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

      <Dialog
        open={!!enrollUser}
        onClose={() => {
          setEnrollUser(null);
          setEnrollUrl(null);
          setEnrollError(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Enrollment link & QR</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {enrollUser?.name} — open this link on a phone (same Wi‑Fi/LAN as your server) or scan the QR. The
            person completes face capture on their device; link expires in {enrollHours}h.
          </Typography>
          {enrollLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          )}
          {enrollError && (
            <Typography color="error" variant="body2" sx={{ mb: 1 }}>
              {enrollError}
            </Typography>
          )}
          {enrollUrl && !enrollLoading && (
            <Stack spacing={2} alignItems="center">
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2, bgcolor: 'background.paper' }}>
                <QRCode value={enrollUrl} size={220} />
              </Box>
              <Typography
                variant="caption"
                sx={{
                  wordBreak: 'break-all',
                  fontFamily: 'monospace',
                  bgcolor: 'action.hover',
                  p: 1,
                  borderRadius: 1,
                  width: '100%',
                }}
              >
                {enrollUrl}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  navigator.clipboard.writeText(enrollUrl).then(() => toast.success('Copied'));
                }}
              >
                Copy link
              </Button>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEnrollUser(null)}>Close</Button>
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