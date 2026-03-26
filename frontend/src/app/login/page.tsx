'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Box, Button, TextField, Typography, Paper } from '@mui/material';
import { Security } from '@mui/icons-material';
import { useToast } from '@/contexts/ToastContext';
import { api, getApiBase } from '@/lib/api';
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

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState('admin@visioryx.dev');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    try {
      const r = await fetch(`${getApiBase()}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      let data: unknown = null;
      try {
        data = await r.json();
      } catch {
        data = null;
      }
      if (!r.ok) {
        throw new Error(formatApiError(data, r.status === 503 ? 'Service unavailable' : 'Login failed'));
      }
      const payload = data as { access_token?: string };
      if (!payload?.access_token) {
        throw new Error('Invalid login response');
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', payload.access_token);
      }
      const me = await api<{ role: string }>('/api/v1/auth/me');
      toast.success('Signed in successfully');
      router.push(me.role === 'enrollee' ? '/enroll' : '/dashboard');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Login failed';
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
          Secure Access
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter your credentials to monitor your assets.
        </Typography>
        <Box
          component="form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void handleLogin();
          }}
        >
          <TextField
            fullWidth
            label="Work Email"
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Access Code"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
            disableElevation
            sx={{
              py: 1.5,
              borderRadius: 2,
              fontWeight: 800,
              fontFamily: '"Manrope", "Public Sans", sans-serif',
              backgroundImage: 'linear-gradient(135deg, #afc6ff 0%, #2065d1 100%)',
              backgroundColor: 'transparent',
              color: '#002d6c',
              boxShadow: '0 8px 24px rgba(32, 101, 209, 0.35)',
              '&:hover': {
                backgroundImage: 'linear-gradient(135deg, #c4d4ff 0%, #1a5ac4 100%)',
                backgroundColor: 'transparent',
                boxShadow: '0 10px 28px rgba(32, 101, 209, 0.45)',
              },
            }}
          >
            Initialize Protocol
          </Button>
        </Box>
        <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary">
          No account?{' '}
          <Link href="/register" style={{ fontWeight: 600, color: '#afc6ff' }}>
            Create one
          </Link>
        </Typography>
        <Typography variant="caption" display="block" sx={{ mt: 1 }} color="text.secondary">
          Demo: admin@visioryx.dev / admin123
        </Typography>
      </Paper>
    </Box>
  );
}
