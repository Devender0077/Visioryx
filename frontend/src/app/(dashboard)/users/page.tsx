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
} from '@mui/material';
import { Add, CloudUpload } from '@mui/icons-material';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

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

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
          Users
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Register users for face recognition. After adding a user, click the upload icon to add a face photo. The system will detect and store the face for recognition in Live Monitoring.
        </Typography>
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
      <Card>
        <CardContent>
          {users.length === 0 ? (
            <Typography color="text.secondary">No users. Register a user, then click the upload icon to add a face photo.</Typography>
          ) : (
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
                    <TableCell>{u.image_path ? '✓ Ready' : 'Upload face'}</TableCell>
                    <TableCell align="right">
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
    </Box>
  );
}