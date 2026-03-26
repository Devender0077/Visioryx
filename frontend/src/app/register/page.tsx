'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Box, Button, TextField, Typography, Paper } from '@mui/material';
import { Security } from '@mui/icons-material';
import { useToast } from '@/contexts/ToastContext';
import { getApiBase } from '@/lib/api';
import { stitchAuthBackdrop, stitchGlassPaper } from '@/theme/stitchSx';

function formatApiError(data: unknown, fallback: string): string {
  if (data == null || typeof data !== 'object') return fallback;
  const d = data as { detail?: unknown };
  const { detail } = d;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (item && typeof item === 'object' && 'msg' in item) {
          return String((item as { msg: string }).msg);
        }
        return JSON.stringify(item);
      })
      .join(' ');
  }
  return fallback;
}

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      const r = await fetch(`${getApiBase()}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email, password }),
      });
      let data: unknown = null;
      try {
        data = await r.json();
      } catch {
        data = null;
      }
      if (!r.ok) {
        throw new Error(formatApiError(data, r.status === 503 ? 'Service unavailable' : 'Registration failed'));
      }
      const payload = data as { access_token?: string };
      if (!payload?.access_token) {
        throw new Error('Invalid registration response');
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', payload.access_token);
      }
      toast.success('Account created');
      router.push('/enroll');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Registration failed';
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...stitchAuthBackdrop,
      }}
    >
      <Paper
        sx={{
          p: { xs: 2, sm: 4 },
          mx: 2,
          maxWidth: 400,
          width: '100%',
          borderRadius: 3,
          ...stitchGlassPaper,
          backdropFilter: 'blur(20px)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #afc6ff 0%, #2065d1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Security sx={{ color: '#002d6c', fontSize: 28 }} />
          </Box>
          <Typography
            variant="h5"
            fontWeight={800}
            sx={{ fontFamily: '"Manrope", "Public Sans", sans-serif', letterSpacing: '-0.03em', color: 'primary.light' }}
          >
            Visioryx
          </Typography>
        </Box>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5, fontFamily: '"Manrope", "Public Sans", sans-serif' }}>
          Create account
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Sign up to enroll your face and use Visioryx. Surveillance features require an operator or admin role.
        </Typography>
        <Box
          component="form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void handleRegister();
          }}
        >
          <TextField
            fullWidth
            label="Name"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Confirm password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            sx={{ mb: 2 }}
          />
          {error && (
            <Typography color="error" sx={{ mb: 1 }} variant="body2">
              {error}
            </Typography>
          )}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            sx={{ py: 1.5, borderRadius: 2, fontWeight: 600 }}
          >
            Sign up
          </Button>
        </Box>
        <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary">
          Already have an account?{' '}
          <Link href="/login" style={{ fontWeight: 600, color: '#afc6ff' }}>
            Sign in
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
