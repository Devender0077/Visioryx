'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  IconButton,
  Dialog,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Videocam, Stop, Fullscreen, FullscreenExit, ZoomIn, ZoomOut, Add } from '@mui/icons-material';
import Link from 'next/link';
import { api, getToken, getStreamBase } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { EmptyState } from '@/components/EmptyState';

interface Camera {
  id: number;
  camera_name: string;
  rtsp_url: string;
  status: string;
  is_enabled: boolean;
}

export default function LiveMonitoringPage() {
  const toast = useToast();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [streaming, setStreaming] = useState<Set<number>>(new Set());
  const [streamErrors, setStreamErrors] = useState<Set<number>>(new Set());
  const [streamRetryKey, setStreamRetryKey] = useState<Record<number, number>>({});
  const [starting, setStarting] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState<number | null>(null);
  const [zoom, setZoom] = useState<Record<number, number>>({});

  useEffect(() => {
    setLoading(true);
    api<Camera[]>('/api/v1/cameras')
      .then(setCameras)
      .catch(() => setError('Load cameras failed'))
      .finally(() => setLoading(false));
  }, []);

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
      setStreamErrors((e) => { const n = new Set(e); n.delete(cameraId); return n; });
      toast.info('Stream stopped');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Stop failed';
      setError(msg);
      toast.error(msg);
    }
  };

  const streamUrl = (cameraId: number) => {
    const token = getToken();
    if (!token) return null;
    const base = getStreamBase();
    const retry = streamRetryKey[cameraId] ?? 0;
    return `${base}/api/v1/stream/${cameraId}/mjpeg?token=${encodeURIComponent(token)}&_=${retry}`;
  };

  const retryStream = (cameraId: number) => {
    setStreamErrors((e) => {
      const n = new Set(e);
      n.delete(cameraId);
      return n;
    });
    setStreamRetryKey((k) => ({ ...k, [cameraId]: (k[cameraId] ?? 0) + 1 }));
  };

  const getZoom = (id: number) => (zoom[id] ?? 100) / 100;
  const setZoomFor = (id: number, v: number) => setZoom((z) => ({ ...z, [id]: Math.max(50, Math.min(200, v)) }));

  const StreamBox = ({ cam, isFullscreen }: { cam: Camera; isFullscreen?: boolean }) => (
    <Box
      sx={{
        bgcolor: 'black',
        height: isFullscreen ? '100vh' : { xs: 220, sm: 280, md: 320 },
        borderRadius: 2,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {streaming.has(cam.id) && streamErrors.has(cam.id) ? (
        <Box sx={{ textAlign: 'center', p: 2 }}>
          <Typography color="grey.500" sx={{ mb: 1 }}>No signal — check network or RTSP URL</Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
            Cameras must be on the same network. Use VPN if remote.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="outlined" size="small" onClick={() => retryStream(cam.id)}>Retry</Button>
            <Button variant="outlined" size="small" color="error" onClick={() => stopStream(cam.id)}>Stop</Button>
          </Box>
        </Box>
      ) : streaming.has(cam.id) && streamUrl(cam.id) ? (
        <Box sx={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'black' }}>
          <Box
            sx={{
              width: '100%',
              height: '100%',
              transform: `scale(${getZoom(cam.id)})`,
              transformOrigin: 'center center',
            }}
          >
            {/* Always use MJPEG img stream for now (ensures overlays & compatibility). */}
            <img
              key={`stream-${cam.id}-${streamRetryKey[cam.id] ?? 0}`}
              src={streamUrl(cam.id)!}
              alt={cam.camera_name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: isFullscreen ? 'contain' : 'cover',
                display: 'block',
              }}
              onError={() => setStreamErrors((e) => new Set(e).add(cam.id))}
            />
          </Box>
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center' }}>
          <Typography color="grey.500" sx={{ mb: 2 }}>
            {cam.is_enabled
              ? starting.has(cam.id)
                ? 'Starting stream...'
                : 'Click Start to view live feed'
              : 'Camera disabled'}
          </Typography>
          {cam.is_enabled && (
            <Button
              variant="contained"
              startIcon={starting.has(cam.id) ? <CircularProgress size={20} color="inherit" /> : <Videocam />}
              onClick={() => startStream(cam.id)}
              disabled={starting.has(cam.id)}
            >
              {starting.has(cam.id) ? 'Starting...' : 'Start Stream'}
            </Button>
          )}
        </Box>
      )}
      {streaming.has(cam.id) && (
        <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5, zIndex: 10 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => retryStream(cam.id)}
            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
          >
            Reconnect
          </Button>
          <IconButton size="small" sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: 'white' }} onClick={() => setZoomFor(cam.id, (zoom[cam.id] ?? 100) + 20)} title="Zoom in">
            <ZoomIn fontSize="small" />
          </IconButton>
          <IconButton size="small" sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: 'white' }} onClick={() => setZoomFor(cam.id, (zoom[cam.id] ?? 100) - 20)} title="Zoom out">
            <ZoomOut fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: 'white' }}
            onClick={() => setFullscreen(isFullscreen ? null : cam.id)}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
          </IconButton>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
          Live camera streams with face & object detection. Add cameras in Cameras page. Register users and upload face photos in Users page for recognition.
        </Typography>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
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
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Videocam />
                    <Typography variant="h6">{cam.camera_name}</Typography>
                    <Chip
                      label={streaming.has(cam.id) ? 'Live' : 'Stopped'}
                      size="small"
                      color={streaming.has(cam.id) ? 'success' : 'default'}
                    />
                  </Box>
                  <StreamBox cam={cam} />
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

      <Dialog open={fullscreen !== null} onClose={() => setFullscreen(null)} maxWidth={false} fullWidth PaperProps={{ sx: { bgcolor: 'black', maxWidth: '100vw', maxHeight: '100vh', m: 0 } }}>
        <Box sx={{ position: 'relative', width: '100vw', height: '100vh' }}>
          {fullscreen !== null && cameras.find((c) => c.id === fullscreen) && (
            <StreamBox cam={cameras.find((c) => c.id === fullscreen)!} isFullscreen />
          )}
          <Button variant="outlined" size="small" onClick={() => setFullscreen(null)} sx={{ position: 'absolute', top: 16, right: 16, color: 'white', borderColor: 'white', zIndex: 10 }}>
            Close
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
}
