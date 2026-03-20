'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Button, TextField, Typography, Paper } from '@mui/material';
import { Videocam } from '@mui/icons-material';
import { useToast } from '@/contexts/ToastContext';
import { getApiBase } from '@/lib/api';

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
      toast.success('Signed in successfully');
      router.push('/dashboard');
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
        bgcolor: 'background.default',
        backgroundImage: 'linear-gradient(135deg, rgba(32, 101, 209, 0.04) 0%, rgba(51, 102, 255, 0.04) 100%)',
      }}
    >
      <Paper
        sx={{
          p: { xs: 2, sm: 4 },
          mx: 2,
          maxWidth: 400,
          width: '100%',
          borderRadius: 3,
          boxShadow: '0px 0px 2px rgba(145, 158, 171, 0.2), 0px 12px 24px -4px rgba(145, 158, 171, 0.12)',
          border: '1px solid rgba(145, 158, 171, 0.12)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Videocam sx={{ color: 'white', fontSize: 28 }} />
          </Box>
          <Typography variant="h5" fontWeight={700}>
            Visioryx
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Sign in to access the AI Surveillance Dashboard
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
            label="Email"
            name="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Password"
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
            sx={{ py: 1.5, borderRadius: 2, fontWeight: 600 }}
          >
            Sign In
          </Button>
        </Box>
        <Typography variant="caption" display="block" sx={{ mt: 2 }} color="text.secondary">
          Demo: admin@visioryx.dev / admin123
        </Typography>
      </Paper>
    </Box>
  );
}
