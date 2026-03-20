'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  Dialog,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Videocam, Stop, Add } from '@mui/icons-material';
import Link from 'next/link';
import { api, getToken, getStreamBase } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { EmptyState } from '@/components/EmptyState';
import { LiveCamera, LiveStreamStage, LiveStreamToolbar } from './stream-components';

const STREAM_ERROR_DEBOUNCE_MS = 2800;

export default function LiveMonitoringPage() {
  const toast = useToast();
  const [cameras, setCameras] = useState<LiveCamera[]>([]);
  const [streaming, setStreaming] = useState<Set<number>>(new Set());
  const [streamErrors, setStreamErrors] = useState<Set<number>>(new Set());
  const [streamRetryKey, setStreamRetryKey] = useState<Record<number, number>>({});
  const [starting, setStarting] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreenCameraId, setFullscreenCameraId] = useState<number | null>(null);
  const [zoom, setZoom] = useState<Record<number, number>>({});
  const streamErrorTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    setLoading(true);
    api<LiveCamera[]>('/api/v1/cameras')
      .then(setCameras)
      .catch(() => setError('Load cameras failed'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    return () => {
      Object.values(streamErrorTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (fullscreenCameraId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreenCameraId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreenCameraId]);

  const startStream = async (cameraId: number) => {
    setError(null);
    setStarting((s) => new Set(s).add(cameraId));
    try {
      await api(`/api/v1/stream/${cameraId}/start`, { method: 'POST' });
      setStreaming((s) => new Set(s).add(cameraId));
      setStreamErrors((e) => {
        const n = new Set(e);
        n.delete(cameraId);
        return n;
      });
      toast.success('Stream started');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Start failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setStarting((s) => {
        const n = new Set(s);
        n.delete(cameraId);
        return n;
      });
    }
  };

  const stopStream = async (cameraId: number) => {
    try {
      await api(`/api/v1/stream/${cameraId}/stop`, { method: 'POST' });
      setStreaming((s) => {
        const next = new Set(s);
        next.delete(cameraId);
        return next;
      });
      setStreamErrors((e) => {
        const n = new Set(e);
        n.delete(cameraId);
        return n;
      });
      if (fullscreenCameraId === cameraId) setFullscreenCameraId(null);
      clearTimeout(streamErrorTimersRef.current[cameraId]);
      toast.info('Stream stopped');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Stop failed';
      setError(msg);
      toast.error(msg);
    }
  };

  const streamUrl = useCallback((cameraId: number) => {
    const token = getToken();
    if (!token) return null;
    const base = getStreamBase();
    const retry = streamRetryKey[cameraId] ?? 0;
    return `${base}/api/v1/stream/${cameraId}/mjpeg?token=${encodeURIComponent(token)}&_=${retry}`;
  }, [streamRetryKey]);

  const retryStream = (cameraId: number) => {
    clearTimeout(streamErrorTimersRef.current[cameraId]);
    setStreamErrors((e) => {
      const n = new Set(e);
      n.delete(cameraId);
      return n;
    });
    setStreamRetryKey((k) => ({ ...k, [cameraId]: (k[cameraId] ?? 0) + 1 }));
  };

  const scheduleStreamError = (cameraId: number) => {
    clearTimeout(streamErrorTimersRef.current[cameraId]);
    streamErrorTimersRef.current[cameraId] = setTimeout(() => {
      setStreamErrors((e) => new Set(e).add(cameraId));
      delete streamErrorTimersRef.current[cameraId];
    }, STREAM_ERROR_DEBOUNCE_MS);
  };

  const clearStreamError = (cameraId: number) => {
    clearTimeout(streamErrorTimersRef.current[cameraId]);
    delete streamErrorTimersRef.current[cameraId];
    setStreamErrors((e) => {
      const n = new Set(e);
      n.delete(cameraId);
      return n;
    });
  };

  const getZoom = (id: number) => (zoom[id] ?? 100) / 100;
  const onZoomDelta = (id: number, delta: number) =>
    setZoom((z) => ({ ...z, [id]: Math.max(50, Math.min(200, (z[id] ?? 100) + delta)) }));

  const shouldAttachMjpegInGrid = (camId: number) =>
    streaming.has(camId) && fullscreenCameraId !== camId;

  const toolbarCallbacks = {
    onRetry: retryStream,
    onZoomDelta,
    onToggleFullscreen: setFullscreenCameraId,
    onExitFullscreen: () => setFullscreenCameraId(null),
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
          Live camera streams with face & object detection. Add cameras in Cameras page. Register users and upload face
          photos in Users page for recognition.
        </Typography>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={40} />
        </Box>
      ) : cameras.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              message="No cameras configured. Add a camera in the Cameras section to start live monitoring."
              illustrationSize={120}
            />
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button component={Link} href="/cameras" variant="contained" startIcon={<Add />}>
                Add Camera
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {cameras.map((cam) => (
            <Grid item xs={12} md={6} key={cam.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                    <Videocam />
                    <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                      {cam.camera_name}
                    </Typography>
                    <Chip
                      label={streaming.has(cam.id) ? 'Live' : 'Stopped'}
                      size="small"
                      color={streaming.has(cam.id) ? 'success' : 'default'}
                    />
                  </Box>
                  <LiveStreamStage
                    cam={cam}
                    showMjpeg={shouldAttachMjpegInGrid(cam.id)}
                    streaming={streaming}
                    streamErrors={streamErrors}
                    streamRetryKey={streamRetryKey}
                    starting={starting}
                    streamUrl={streamUrl}
                    getZoom={getZoom}
                    onRetry={retryStream}
                    onStop={stopStream}
                    onStart={startStream}
                    onExitFullscreen={() => setFullscreenCameraId(null)}
                    onLoadFrame={clearStreamError}
                    onFrameError={scheduleStreamError}
                    overlayToolbar={
                      streaming.has(cam.id) && shouldAttachMjpegInGrid(cam.id) ? (
                        <LiveStreamToolbar
                          cam={cam}
                          variant="overlay"
                          fullscreenCameraId={fullscreenCameraId}
                          {...toolbarCallbacks}
                        />
                      ) : undefined
                    }
                  />
                  {streaming.has(cam.id) && (
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<Stop />}
                      onClick={() => stopStream(cam.id)}
                      sx={{ mt: 1 }}
                    >
                      Stop Stream
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog
        fullScreen
        open={fullscreenCameraId !== null}
        onClose={() => setFullscreenCameraId(null)}
        aria-label={
          fullscreenCameraId != null
            ? `${cameras.find((c) => c.id === fullscreenCameraId)?.camera_name ?? 'Camera'} live stream`
            : undefined
        }
        PaperProps={{
          sx: {
            bgcolor: 'black',
            display: 'flex',
            flexDirection: 'column',
            m: 0,
            width: '100%',
            maxWidth: '100%',
            height: { xs: '100dvh', sm: '100dvh' },
            maxHeight: { xs: '100dvh', sm: '100dvh' },
          },
        }}
      >
        {fullscreenCameraId !== null &&
          (() => {
            const cam = cameras.find((c) => c.id === fullscreenCameraId);
            if (!cam) return null;
            return (
              <>
                <LiveStreamToolbar
                  cam={cam}
                  variant="bar"
                  fullscreenCameraId={fullscreenCameraId}
                  {...toolbarCallbacks}
                />
                <Box
                  sx={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    pb: 'env(safe-area-inset-bottom)',
                  }}
                >
                  <LiveStreamStage
                    cam={cam}
                    isFullscreen
                    showMjpeg
                    streaming={streaming}
                    streamErrors={streamErrors}
                    streamRetryKey={streamRetryKey}
                    starting={starting}
                    streamUrl={streamUrl}
                    getZoom={getZoom}
                    onRetry={retryStream}
                    onStop={stopStream}
                    onStart={startStream}
                    onExitFullscreen={() => setFullscreenCameraId(null)}
                    onLoadFrame={clearStreamError}
                    onFrameError={scheduleStreamError}
                  />
                </Box>
              </>
            );
          })()}
      </Dialog>
    </Box>
  );
}
