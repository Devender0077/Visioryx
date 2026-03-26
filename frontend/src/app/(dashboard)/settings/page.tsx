'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { Save } from '@mui/icons-material';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { StitchPageHeader } from '@/components/StitchPageHeader';

interface EmailSettingsDto {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
  use_ssl: boolean;
  public_base_url: string;
  password_configured: boolean;
  public_dashboard_url_default: string;
}

export default function EmailSettingsPage() {
  const router = useRouter();
  const toast = useToast();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [form, setForm] = useState<EmailSettingsDto | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ role: string }>('/api/v1/auth/me')
      .then((me) => {
        setRole(me.role);
        if (me.role !== 'admin') {
          router.replace('/dashboard');
        }
      })
      .catch(() => router.replace('/dashboard'));
  }, [router]);

  useEffect(() => {
    if (role !== 'admin') return;
    setLoading(true);
    api<EmailSettingsDto>('/api/v1/settings/email')
      .then((d) => {
        setForm(d);
        setTestTo(d.from_email || '');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [role]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        enabled: form.enabled,
        host: form.host,
        port: form.port,
        user: form.user,
        from_email: form.from_email,
        from_name: form.from_name,
        use_tls: form.use_tls,
        use_ssl: form.use_ssl,
        public_base_url: form.public_base_url,
      };
      if (password.length > 0) {
        body.smtp_password = password;
      }
      const next = await api<EmailSettingsDto>('/api/v1/settings/email', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setForm(next);
      setPassword('');
      toast.success('Email settings saved');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!testTo.trim()) {
      toast.error('Enter a recipient email');
      return;
    }
    setTesting(true);
    setError(null);
    try {
      const r = await api<{ ok: boolean; message: string }>('/api/v1/settings/email/test', {
        method: 'POST',
        body: JSON.stringify({ to: testTo.trim() }),
      });
      toast.success(r.message || 'Test sent');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Test failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  };

  if (role !== 'admin') {
    return (
      <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 720 }}>
      <StitchPageHeader
        eyebrow="System Administration"
        title="Communication Node"
        subtitle="Configure SMTP for system alerts, enrollment links, and automated reports. Password is stored server-side only; leave blank when saving to keep the current password."
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading || !form ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Card>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.enabled}
                  onChange={(_, v) => setForm((f) => (f ? { ...f, enabled: v } : f))}
                />
              }
              label="Enable SMTP"
            />

            <TextField
              label="SMTP host"
              value={form.host}
              onChange={(e) => setForm((f) => (f ? { ...f, host: e.target.value } : f))}
              fullWidth
              size="small"
              placeholder="smtp.example.com"
            />
            <TextField
              label="Port"
              type="number"
              value={form.port}
              onChange={(e) => setForm((f) => (f ? { ...f, port: parseInt(e.target.value, 10) || 587 } : f))}
              fullWidth
              size="small"
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.use_tls}
                    disabled={form.use_ssl}
                    onChange={(_, v) => setForm((f) => (f ? { ...f, use_tls: v, use_ssl: v ? false : f.use_ssl } : f))}
                  />
                }
                label="STARTTLS (587)"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.use_ssl}
                    onChange={(_, v) =>
                      setForm((f) => (f ? { ...f, use_ssl: v, use_tls: v ? false : f.use_tls } : f))
                    }
                  />
                }
                label="SSL (465)"
              />
            </Stack>
            <TextField
              label="SMTP username"
              value={form.user}
              onChange={(e) => setForm((f) => (f ? { ...f, user: e.target.value } : f))}
              fullWidth
              size="small"
              autoComplete="off"
            />
            <TextField
              label={form.password_configured ? 'SMTP password (leave blank to keep)' : 'SMTP password'}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              size="small"
              autoComplete="new-password"
            />
            <TextField
              label="From email"
              value={form.from_email}
              onChange={(e) => setForm((f) => (f ? { ...f, from_email: e.target.value } : f))}
              fullWidth
              size="small"
            />
            <TextField
              label="From name"
              value={form.from_name}
              onChange={(e) => setForm((f) => (f ? { ...f, from_name: e.target.value } : f))}
              fullWidth
              size="small"
            />
            <TextField
              label="Public dashboard URL (enrollment links & email)"
              value={form.public_base_url}
              onChange={(e) => setForm((f) => (f ? { ...f, public_base_url: e.target.value } : f))}
              fullWidth
              size="small"
              placeholder={form.public_dashboard_url_default}
              helperText={`If empty, backend uses PUBLIC_DASHBOARD_URL (default: ${form.public_dashboard_url_default}). Set this to your Cloudflare or production URL.`}
            />

            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
              onClick={() => void save()}
              disabled={saving}
              sx={{ alignSelf: 'flex-start' }}
            >
              Save
            </Button>

            <Typography variant="subtitle2" sx={{ mt: 2 }}>
              Test email
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
              <TextField
                label="Send test to"
                type="email"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                size="small"
                sx={{ flex: 1 }}
              />
              <Button variant="outlined" onClick={() => void sendTest()} disabled={testing || !form.enabled}>
                {testing ? <CircularProgress size={22} /> : 'Send test'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
