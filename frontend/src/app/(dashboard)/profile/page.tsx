'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  FormControlLabel,
  Switch,
  Link,
} from '@mui/material';
import { Visibility, VisibilityOff, Security, Person, SmartToy } from '@mui/icons-material';
import NextLink from 'next/link';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { StitchPageHeader } from '@/components/StitchPageHeader';

interface UserMe {
  id: number;
  email: string;
  role: string;
}

interface AppSettingsDto {
  yolo_object_detection_enabled: boolean;
  yolo_object_detection_from_database: boolean;
  can_edit: boolean;
}

export default function ProfilePage() {
  const toast = useToast();
  const [user, setUser] = useState<UserMe | null>(null);
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettingsDto | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsFetchFailed, setSettingsFetchFailed] = useState(false);
  const [savingYolo, setSavingYolo] = useState(false);

  useEffect(() => {
    api<UserMe>('/api/v1/auth/me')
      .then((u) => {
        setUser(u);
        setEmail(u.email);
      })
      .catch(() => setError('Failed to load profile'));
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      setAppSettings(null);
      setSettingsLoading(false);
      setSettingsFetchFailed(false);
      return;
    }
    let cancelled = false;
    setSettingsLoading(true);
    setSettingsFetchFailed(false);
    api<AppSettingsDto>('/api/v1/settings')
      .then((s) => {
        if (!cancelled) {
          setAppSettings(s);
          setSettingsFetchFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSettingsFetchFailed(true);
          setAppSettings({
            yolo_object_detection_enabled: false,
            yolo_object_detection_from_database: false,
            can_edit: true,
          });
        }
      })
      .finally(() => {
        if (!cancelled) setSettingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleYoloToggle = async (enabled: boolean) => {
    if (!appSettings?.can_edit) return;
    setSavingYolo(true);
    setError(null);
    try {
      const next = await api<AppSettingsDto>('/api/v1/settings', {
        method: 'PATCH',
        body: JSON.stringify({ yolo_object_detection_enabled: enabled }),
      });
      setAppSettings(next);
      setSettingsFetchFailed(false);
      toast.success(enabled ? 'Object detection enabled on live streams' : 'Object detection disabled');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Update failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setSavingYolo(false);
    }
  };

  const handleResetYoloToEnv = async () => {
    if (!appSettings?.can_edit) return;
    setSavingYolo(true);
    setError(null);
    try {
      const next = await api<AppSettingsDto>('/api/v1/settings', {
        method: 'PATCH',
        body: JSON.stringify({ use_environment_default_for_yolo: true }),
      });
      setAppSettings(next);
      setSettingsFetchFailed(false);
      toast.success('Using object-detection default from server environment');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Reset failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setSavingYolo(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!user || !currentPassword) return;
    setError(null);
    setProfileSuccess(false);
    setLoading(true);
    try {
      await api('/api/v1/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ email, current_password: currentPassword }),
      });
      setUser((u) => (u ? { ...u, email } : null));
      setCurrentPassword('');
      setProfileSuccess(true);
      toast.success('Email updated successfully');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Update failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      toast.error('Password must be at least 8 characters');
      return;
    }
    setError(null);
    setPasswordSuccess(false);
    setLoading(true);
    try {
      await api('/api/v1/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess(true);
      toast.success('Password updated successfully');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Password change failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Box sx={{ width: '100%', maxWidth: '100%' }}>
        <Typography color="text.secondary">Loading profile...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <StitchPageHeader
        eyebrow="Identity"
        title="Profile"
        subtitle="Manage your account, password, and preferences. Face templates are managed under Users; open enrollment from here when eligible."
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Alert severity="info" sx={{ mb: 2 }}>
        Face recognition profiles are managed under <strong>Users</strong>. If your email there matches this account,
        you can <Link component={NextLink} href="/enroll">open face enrollment</Link> on this device or your phone
        (multi-angle photos).
      </Alert>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Profile / Email */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Person color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Profile
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Update your email address. You will need to sign in again with the new email.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400 }}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="Current password"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                fullWidth
                size="small"
                placeholder="Required to confirm changes"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowCurrentPassword(!showCurrentPassword)} edge="end" size="small">
                        {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="contained"
                onClick={handleUpdateEmail}
                disabled={loading || email === user.email || !currentPassword}
                sx={{ alignSelf: 'flex-start' }}
              >
                Update email
              </Button>
              {profileSuccess && <Typography color="success.main" variant="body2">Email updated successfully.</Typography>}
            </Box>
          </CardContent>
        </Card>

        {/* YOLO / object overlay — admin only (surveillance server settings) */}
        {user.role === 'admin' && (
          <Card sx={{ bgcolor: 'background.paper' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <SmartToy color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Detection &amp; AI
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Control whether <strong>object detection</strong> (YOLO — phones, laptops, bags, etc.) runs on{' '}
                <strong>live camera streams</strong>. Face recognition is separate: this only toggles object boxes and
                object-detection logging. YOLO can be CPU/GPU intensive — turn it off if the server becomes slow or
                unstable.
              </Typography>
              {settingsFetchFailed && (
                <Alert severity="warning" sx={{ mb: 2, maxWidth: 560 }}>
                  Could not load saved settings from the API (defaults shown below). Restart the backend after{' '}
                  <code style={{ fontSize: '0.85em' }}>git pull</code> / migrations, or check that{' '}
                  <code style={{ fontSize: '0.85em' }}>/api/v1/settings</code> is reachable.
                </Alert>
              )}
              {settingsLoading ? (
                <Typography color="text.secondary" variant="body2">
                  Loading settings…
                </Typography>
              ) : appSettings ? (
                <Box sx={{ maxWidth: 520 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={appSettings.yolo_object_detection_enabled}
                        onChange={(_, v) => handleYoloToggle(v)}
                        disabled={!appSettings.can_edit || savingYolo}
                        inputProps={{ 'aria-label': 'Object detection on live streams' }}
                      />
                    }
                    label={
                      <Box>
                        <Typography component="span" variant="body2">
                          Object detection on live streams
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {appSettings.yolo_object_detection_from_database
                            ? 'Saved in database (overrides STREAM_ENABLE_YOLO_OVERLAY in .env).'
                            : 'Following server environment (STREAM_ENABLE_YOLO_OVERLAY).'}
                        </Typography>
                      </Box>
                    }
                  />
                  {appSettings.can_edit && appSettings.yolo_object_detection_from_database && !settingsFetchFailed && (
                    <Box sx={{ mt: 1, ml: 0.5 }}>
                      <Link
                        component="button"
                        type="button"
                        variant="body2"
                        onClick={() => handleResetYoloToEnv()}
                        disabled={savingYolo}
                        sx={{ cursor: 'pointer' }}
                      >
                        Use environment default instead
                      </Link>
                    </Box>
                  )}
                </Box>
              ) : (
                <Typography color="text.secondary" variant="body2">
                  Loading…
                </Typography>
              )}
            </CardContent>
          </Card>
        )}

        {/* Change password */}
        <Card sx={{ bgcolor: 'background.paper' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Security color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Security
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Change your password. Use at least 8 characters.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400 }}>
              <TextField
                label="Current password"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                fullWidth
                size="small"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowCurrentPassword(!showCurrentPassword)} edge="end" size="small">
                        {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="New password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                fullWidth
                size="small"
                helperText="Min 8 characters"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowNewPassword(!showNewPassword)} edge="end" size="small">
                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Confirm new password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                fullWidth
                size="small"
              />
              <Button
                variant="contained"
                onClick={handleChangePassword}
                disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                sx={{ alignSelf: 'flex-start' }}
              >
                Change password
              </Button>
              {passwordSuccess && <Typography color="success.main" variant="body2">Password updated successfully.</Typography>}
            </Box>
          </CardContent>
        </Card>

      </Box>
    </Box>
  );
}
