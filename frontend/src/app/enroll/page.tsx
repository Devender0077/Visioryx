'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { ArrowBack, CameraAlt, CheckCircle, Login, Person, Videocam } from '@mui/icons-material';
import { getApiBase, getToken, publicApi } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { WebcamCaptureDialog } from '@/components/WebcamCaptureDialog';

const STEPS = ['Confirm', 'Photos', 'Review', 'Done'];

type VerifyOk = { valid: boolean; user_name: string; user_id: number };

function EnrollContent() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [activeStep, setActiveStep] = useState(0);
  const [verifying, setVerifying] = useState(!!token);
  const [verified, setVerified] = useState<VerifyOk | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sessionJwt, setSessionJwt] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [straight, setStraight] = useState<File | null>(null);
  const [left, setLeft] = useState<File | null>(null);
  const [right, setRight] = useState<File | null>(null);

  const [preview, setPreview] = useState<{ straight?: string; left?: string; right?: string }>({});
  const [webcamFor, setWebcamFor] = useState<'straight' | 'left' | 'right' | null>(null);

  useEffect(() => {
    const jwt = getToken();
    setSessionJwt(jwt);
    if (!jwt) return;
    const base = getApiBase();
    fetch(`${base}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${jwt}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((me: { email?: string } | null) => {
        if (me?.email) setSessionEmail(me.email);
      })
      .catch(() => setSessionEmail(null));
  }, []);

  useEffect(() => {
    if (!straight) {
      setPreview((p) => {
        if (p.straight) URL.revokeObjectURL(p.straight);
        return { ...p, straight: undefined };
      });
      return;
    }
    const url = URL.createObjectURL(straight);
    setPreview((p) => ({ ...p, straight: url }));
    return () => URL.revokeObjectURL(url);
  }, [straight]);

  useEffect(() => {
    if (!left) {
      setPreview((p) => {
        if (p.left) URL.revokeObjectURL(p.left);
        return { ...p, left: undefined };
      });
      return;
    }
    const url = URL.createObjectURL(left);
    setPreview((p) => ({ ...p, left: url }));
    return () => URL.revokeObjectURL(url);
  }, [left]);

  useEffect(() => {
    if (!right) {
      setPreview((p) => {
        if (p.right) URL.revokeObjectURL(p.right);
        return { ...p, right: undefined };
      });
      return;
    }
    const url = URL.createObjectURL(right);
    setPreview((p) => ({ ...p, right: url }));
    return () => URL.revokeObjectURL(url);
  }, [right]);

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setVerifyError(null);
      try {
        const data = await publicApi<VerifyOk>(
          `/api/v1/enroll/verify?token=${encodeURIComponent(token)}`,
        );
        if (!cancelled) setVerified(data);
      } catch (e) {
        if (!cancelled) setVerifyError(e instanceof Error ? e.message : 'Invalid or expired link');
      } finally {
        if (!cancelled) setVerifying(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const canEnroll = Boolean(verified || (!token && sessionJwt));
  const progress = done ? 100 : ((activeStep + 1) / STEPS.length) * 100;

  const filesList = useCallback(() => {
    const out: File[] = [];
    if (straight) out.push(straight);
    if (left) out.push(left);
    if (right) out.push(right);
    return out;
  }, [straight, left, right]);

  const submit = async () => {
    const files = filesList();
    if (!straight) {
      toast.error('Add the front / straight photo.');
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      files.forEach((f) => form.append('files', f));
      if (token) {
        form.append('token', token);
        await publicApi<{ ok: boolean }>('/api/v1/enroll/upload', { method: 'POST', body: form });
      } else if (sessionJwt) {
        const base = getApiBase();
        const res = await fetch(`${base}/api/v1/enroll/upload-session`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${sessionJwt}` },
          body: form,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail || res.statusText),
          );
        }
      } else {
        toast.error('Use your enrollment link or sign in first.');
        return;
      }
      setDone(true);
      setActiveStep(3);
      toast.success('Face profile saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const handleNextFromConfirm = () => {
    if (!canEnroll || verifyError) return;
    setActiveStep(1);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        bgcolor: 'background.default',
      }}
    >
      <Card sx={{ maxWidth: 520, width: '100%' }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack spacing={2}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'flex-start' },
                justifyContent: 'space-between',
                gap: 1.5,
              }}
            >
              <Typography variant="h5" fontWeight={700}>
                Face enrollment
              </Typography>
              {sessionJwt && activeStep < 3 && (
                <Button
                  component={Link}
                  href="/dashboard"
                  size="small"
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' }, flexShrink: 0 }}
                >
                  Back to dashboard
                </Button>
              )}
            </Box>
            <Typography variant="body2" color="text.secondary">
              Step-by-step capture for recognition. You do <strong>not</strong> need the surveillance dashboard —
              only this page if you opened a link from your admin or are signed in with a matching email.
            </Typography>
            {token && !sessionJwt && (
              <Typography variant="caption" color="text.secondary" display="block">
                Opened from a QR link? You can close this tab anytime. To use the full dashboard,{' '}
                <Link href="/login" style={{ fontWeight: 600 }}>
                  sign in
                </Link>
                .
              </Typography>
            )}

            <Box sx={{ width: '100%' }}>
              <LinearProgress variant="determinate" value={progress} sx={{ borderRadius: 1, height: 8 }} />
              <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Step {Math.min(activeStep + 1, STEPS.length)} / {STEPS.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {STEPS[activeStep] ?? 'Done'}
                </Typography>
              </Stack>
            </Box>

            {/* Step 0 — Confirm identity */}
            {activeStep === 0 && (
              <Stack spacing={2}>
                {verifying && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={32} />
                  </Box>
                )}
                {verifyError && <Alert severity="error">{verifyError}</Alert>}
                {!token && !sessionJwt && (
                  <Alert severity="info">
                    You need an enrollment link (QR) from your administrator, or a dashboard login whose email matches
                    your profile in Users.{' '}
                    <Link href="/login" style={{ fontWeight: 600 }}>
                      Sign in
                    </Link>
                  </Alert>
                )}
                {token && !verifying && verified && (
                  <Alert icon={<Person />} severity="success">
                    Hi <strong>{verified.user_name}</strong> — confirm to continue to photo capture.
                  </Alert>
                )}
                {!token && sessionJwt && (
                  <Alert icon={<Person />} severity="success">
                    Signed in as <strong>{sessionEmail ?? 'your account'}</strong>. We&apos;ll match your email to a
                    recognition profile.
                  </Alert>
                )}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="stretch">
                  {sessionJwt && (
                    <Button component={Link} href="/dashboard" color="inherit">
                      Cancel
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    disabled={!canEnroll || !!verifyError || verifying}
                    onClick={handleNextFromConfirm}
                    fullWidth
                  >
                    Continue to photos
                  </Button>
                </Stack>
              </Stack>
            )}

            {/* Step 1 — Photos */}
            {activeStep === 1 && (
              <Stack spacing={2}>
                <Typography variant="subtitle2">Add photos (front required)</Typography>
                <Typography variant="body2" color="text.secondary">
                  Use your webcam for a live preview and capture, or upload images from your device.
                </Typography>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                    Front / straight — required
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<Videocam />}
                      onClick={() => setWebcamFor('straight')}
                    >
                      Use webcam
                    </Button>
                    <Button variant="outlined" component="label" fullWidth startIcon={<CameraAlt />}>
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        capture="user"
                        hidden
                        onChange={(e) => setStraight(e.target.files?.[0] ?? null)}
                      />
                    </Button>
                  </Stack>
                  {preview.straight && (
                    <Box
                      component="img"
                      src={preview.straight}
                      alt="Front preview"
                      sx={{ mt: 1, width: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 1 }}
                    />
                  )}
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Left angle — optional
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 0.5 }}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<Videocam />}
                      onClick={() => setWebcamFor('left')}
                    >
                      Use webcam
                    </Button>
                    <Button variant="outlined" component="label" fullWidth>
                      Upload
                      <input type="file" accept="image/*" hidden onChange={(e) => setLeft(e.target.files?.[0] ?? null)} />
                    </Button>
                  </Stack>
                  {preview.left && (
                    <Box
                      component="img"
                      src={preview.left}
                      alt="Left preview"
                      sx={{ mt: 1, width: '100%', maxHeight: 120, objectFit: 'contain', borderRadius: 1 }}
                    />
                  )}
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Right angle — optional
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 0.5 }}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<Videocam />}
                      onClick={() => setWebcamFor('right')}
                    >
                      Use webcam
                    </Button>
                    <Button variant="outlined" component="label" fullWidth>
                      Upload
                      <input type="file" accept="image/*" hidden onChange={(e) => setRight(e.target.files?.[0] ?? null)} />
                    </Button>
                  </Stack>
                  {preview.right && (
                    <Box
                      component="img"
                      src={preview.right}
                      alt="Right preview"
                      sx={{ mt: 1, width: '100%', maxHeight: 120, objectFit: 'contain', borderRadius: 1 }}
                    />
                  )}
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button onClick={() => setActiveStep(0)}>Back</Button>
                  {sessionJwt && (
                    <Button component={Link} href="/dashboard" color="inherit">
                      Cancel
                    </Button>
                  )}
                  <Button variant="contained" disabled={!straight} onClick={() => setActiveStep(2)}>
                    Review
                  </Button>
                </Stack>
              </Stack>
            )}

            {/* Step 2 — Review */}
            {activeStep === 2 && (
              <Stack spacing={2}>
                <Typography variant="subtitle2">Review & submit</Typography>
                <Typography variant="body2" color="text.secondary">
                  {filesList().length} image(s) will be sent to the server. The system builds one face profile from
                  these angles.
                </Typography>
                <Paper variant="outlined" sx={{ p: 1 }}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {preview.straight && (
                      <Box
                        component="img"
                        src={preview.straight}
                        alt=""
                        sx={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 1 }}
                      />
                    )}
                    {preview.left && (
                      <Box
                        component="img"
                        src={preview.left}
                        alt=""
                        sx={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 1 }}
                      />
                    )}
                    {preview.right && (
                      <Box
                        component="img"
                        src={preview.right}
                        alt=""
                        sx={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 1 }}
                      />
                    )}
                  </Stack>
                </Paper>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button onClick={() => setActiveStep(1)} disabled={busy}>
                    Back
                  </Button>
                  {sessionJwt && (
                    <Button component={Link} href="/dashboard" color="inherit" disabled={busy}>
                      Cancel
                    </Button>
                  )}
                  <Button variant="contained" onClick={() => submit()} disabled={busy || !straight}>
                    {busy ? <CircularProgress size={24} color="inherit" /> : 'Submit & save'}
                  </Button>
                </Stack>
              </Stack>
            )}

            {/* Step 3 — Done */}
            {activeStep === 3 && done && (
              <Stack spacing={2} alignItems="center" sx={{ py: 2 }}>
                <CheckCircle color="success" sx={{ fontSize: 56 }} />
                <Typography variant="h6" textAlign="center">
                  You&apos;re registered
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Your face profile was saved successfully. You can close this page. Surveillance matching will use this
                  enrollment on the next live detection cycle.
                </Typography>
                {sessionJwt ? (
                  <Button component={Link} href="/dashboard" variant="outlined" startIcon={<Login />}>
                    Open dashboard
                  </Button>
                ) : (
                  <Typography variant="caption" color="text.secondary">
                    You did not use an operator login — that&apos;s expected for QR-only enrollment.
                  </Typography>
                )}
              </Stack>
            )}
          </Stack>

          <WebcamCaptureDialog
            open={webcamFor !== null}
            onClose={() => setWebcamFor(null)}
            onCaptured={(file) => {
              if (webcamFor === 'straight') setStraight(file);
              else if (webcamFor === 'left') setLeft(file);
              else if (webcamFor === 'right') setRight(file);
              setWebcamFor(null);
            }}
            title={
              webcamFor === 'straight'
                ? 'Capture front (straight-on)'
                : webcamFor === 'left'
                  ? 'Capture left angle'
                  : 'Capture right angle'
            }
            description={
              webcamFor === 'straight'
                ? 'Center your face in the frame, then tap Capture photo.'
                : 'Turn slightly toward the labeled side, keep your face visible, then capture.'
            }
          />
        </CardContent>
      </Card>
    </Box>
  );
}

export default function EnrollPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      }
    >
      <EnrollContent />
    </Suspense>
  );
}
