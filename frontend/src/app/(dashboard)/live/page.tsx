'use client';

import { useEffect, useState } from 'react';
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
} from '@mui/material';
import { Videocam, Stop, Fullscreen, FullscreenExit, ZoomIn, ZoomOut } from '@mui/icons-material';
import { api, getToken } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

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
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState<number | null>(null);
  const [zoom, setZoom] = useState<Record<number, number>>({});

  useEffect(() => {
    api<Camera[]>('/api/v1/cameras')
      .then(setCameras)
      .catch(() => setError('Load cameras failed'));
  }, []);

  const startStream = async (cameraId: number) => {
    setError(null);
    try {
      await api(`/api/v1/stream/${cameraId}/start`, { method: 'POST' });
      setStreaming((s) => new Set(s).add(cameraId));
      toast.success('Stream started');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Start failed';
      setError(msg);
      toast.error(msg);
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
    const base = (process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');
    return `${base || 'http://localhost:8000'}/api/v1/stream/${cameraId}/mjpeg?token=${encodeURIComponent(token)}`;
  };

  const getZoom = (id: number) => (zoom[id] ?? 100) / 100;
  const setZoomFor = (id: number, v: number) => setZoom((z) => ({ ...z, [id]: Math.max(50, Math.min(200, v)) }));

  const StreamBox = ({ cam, isFullscreen }: { cam: Camera; isFullscreen?: boolean }) => (
    <Box
      sx={{
        bgcolor: 'grey.900',
        height: isFullscreen ? '90vh' : 280,
        borderRadius: 2,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {streaming.has(cam.id) && streamUrl(cam.id) ? (
        <Box sx={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            key={`stream-${cam.id}`}
            src={streamUrl(cam.id)!}
            alt={cam.camera_name}
            style={{
              width: `${getZoom(cam.id) * 100}%`,
              height: `${getZoom(cam.id) * 100}%`,
              objectFit: 'contain',
            }}
            onError={() => setStreaming((s) => { const n = new Set(s); n.delete(cam.id); return n; })}
          />
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center' }}>
          <Typography color="grey.500" sx={{ mb: 2 }}>
            {cam.is_enabled ? 'Click Start to view stream' : 'Camera disabled'}
          </Typography>
          {cam.is_enabled && (
            <Button
              variant="contained"
              startIcon={<Videocam />}
              onClick={() => startStream(cam.id)}
            >
              Start Stream
            </Button>
          )}
        </Box>
      )}
      {streaming.has(cam.id) && (
        <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }}>
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
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
          Live Monitoring
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Live camera streams with face & object detection. Add cameras in Cameras page. Register users and upload face photos in Users page for recognition.
        </Typography>
      </Box>
      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
      {cameras.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary">
              No cameras configured. Add a camera in the Cameras section to start monitoring.
            </Typography>
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

      <Dialog open={fullscreen !== null} onClose={() => setFullscreen(null)} maxWidth={false} fullWidth PaperProps={{ sx: { bgcolor: 'black', maxWidth: '100vw', maxHeight: '100vh' } }}>
        <Box sx={{ position: 'relative', width: '100%', height: '100%', minHeight: '90vh' }}>
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
