'use client';

import type { ReactNode } from 'react';
import { Box, Button, CircularProgress, IconButton, Typography } from '@mui/material';
import { Videocam, Fullscreen, FullscreenExit, ZoomIn, ZoomOut } from '@mui/icons-material';

export interface LiveCamera {
  id: number;
  camera_name: string;
  rtsp_url: string;
  status: string;
  is_enabled: boolean;
}

export interface LiveStreamToolbarProps {
  cam: LiveCamera;
  variant: 'overlay' | 'bar';
  fullscreenCameraId: number | null;
  onRetry: (cameraId: number) => void;
  onZoomDelta: (cameraId: number, delta: number) => void;
  onToggleFullscreen: (cameraId: number) => void;
  onExitFullscreen: () => void;
}

export function LiveStreamToolbar({
  cam,
  variant,
  fullscreenCameraId,
  onRetry,
  onZoomDelta,
  onToggleFullscreen,
  onExitFullscreen,
}: LiveStreamToolbarProps) {
  const isBar = variant === 'bar';
  const layoutSx = isBar
    ? {
        display: 'flex',
        flexWrap: 'wrap' as const,
        alignItems: 'center',
        gap: { xs: 0.5, sm: 1 },
        p: { xs: 1, sm: 1.5 },
        bgcolor: 'rgba(0,0,0,0.88)',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
        flexShrink: 0,
        zIndex: 2,
      }
    : {
        position: 'absolute' as const,
        top: 8,
        right: 8,
        display: 'flex',
        flexWrap: 'wrap' as const,
        gap: 0.5,
        zIndex: 10,
        justifyContent: 'flex-end',
        maxWidth: 'calc(100% - 16px)',
      };

  return (
    <Box sx={layoutSx}>
      {isBar && (
        <Typography
          variant="subtitle2"
          sx={{
            color: 'white',
            fontWeight: 600,
            flex: '1 1 auto',
            minWidth: 0,
            pr: 1,
          }}
          noWrap
        >
          {cam.camera_name}
        </Typography>
      )}
      <Button
        variant="outlined"
        size="small"
        onClick={() => onRetry(cam.id)}
        sx={{
          color: 'white',
          borderColor: 'rgba(255,255,255,0.5)',
          fontSize: { xs: '0.7rem', sm: '0.8125rem' },
          py: 0.5,
          '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
        }}
      >
        Reconnect
      </Button>
      <IconButton
        size="small"
        sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: 'white' }}
        onClick={() => onZoomDelta(cam.id, 15)}
        title="Zoom in"
      >
        <ZoomIn fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: 'white' }}
        onClick={() => onZoomDelta(cam.id, -15)}
        title="Zoom out"
      >
        <ZoomOut fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: 'white' }}
        onClick={() =>
          fullscreenCameraId === cam.id ? onExitFullscreen() : onToggleFullscreen(cam.id)
        }
        title={fullscreenCameraId === cam.id ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {fullscreenCameraId === cam.id ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
      </IconButton>
      {isBar && (
        <Button
          variant="text"
          size="small"
          onClick={onExitFullscreen}
          sx={{ color: 'grey.300', ml: { xs: 0, sm: 'auto' } }}
        >
          Close
        </Button>
      )}
    </Box>
  );
}

export interface LiveStreamStageProps {
  cam: LiveCamera;
  isFullscreen?: boolean;
  showMjpeg: boolean;
  streaming: Set<number>;
  streamErrors: Set<number>;
  streamRetryKey: Record<number, number>;
  starting: Set<number>;
  streamUrl: (cameraId: number) => string | null;
  getZoom: (cameraId: number) => number;
  onRetry: (cameraId: number) => void;
  onStop: (cameraId: number) => void;
  onStart: (cameraId: number) => void;
  onExitFullscreen: () => void;
  onLoadFrame: (cameraId: number) => void;
  onFrameError: (cameraId: number) => void;
  overlayToolbar?: ReactNode;
}

export function LiveStreamStage({
  cam,
  isFullscreen,
  showMjpeg,
  streaming,
  streamErrors,
  streamRetryKey,
  starting,
  streamUrl,
  getZoom,
  onRetry,
  onStop,
  onStart,
  onExitFullscreen,
  onLoadFrame,
  onFrameError,
  overlayToolbar,
}: LiveStreamStageProps) {
  const url = streamUrl(cam.id);

  return (
    <Box
      sx={{
        bgcolor: 'black',
        height: isFullscreen ? '100%' : { xs: 220, sm: 280, md: 320 },
        minHeight: isFullscreen ? 0 : undefined,
        borderRadius: isFullscreen ? 0 : 2,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flex: isFullscreen ? 1 : undefined,
      }}
    >
      {streaming.has(cam.id) && streamErrors.has(cam.id) ? (
        <Box sx={{ textAlign: 'center', p: 2 }}>
          <Typography color="grey.500" sx={{ mb: 1 }}>
            No signal — check network or RTSP URL
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
            Cameras must be on the same network. Use VPN if remote.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="outlined" size="small" onClick={() => onRetry(cam.id)}>
              Retry
            </Button>
            <Button variant="outlined" size="small" color="error" onClick={() => onStop(cam.id)}>
              Stop
            </Button>
          </Box>
        </Box>
      ) : streaming.has(cam.id) && url && showMjpeg ? (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'black',
          }}
        >
          <Box
            sx={{
              width: '100%',
              height: '100%',
              transform: `scale(${getZoom(cam.id)})`,
              transformOrigin: 'center center',
            }}
          >
            <img
              key={`stream-${cam.id}-${streamRetryKey[cam.id] ?? 0}`}
              src={url}
              alt={cam.camera_name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: isFullscreen ? 'contain' : 'cover',
                display: 'block',
              }}
              onLoad={() => onLoadFrame(cam.id)}
              onError={() => onFrameError(cam.id)}
            />
          </Box>
        </Box>
      ) : streaming.has(cam.id) && !showMjpeg ? (
        <Box sx={{ textAlign: 'center', p: 2, px: 3 }}>
          <Typography color="grey.400" variant="body2" sx={{ mb: 1 }}>
            Stream is open in fullscreen viewer
          </Typography>
          <Button size="small" variant="outlined" onClick={onExitFullscreen}>
            Exit fullscreen
          </Button>
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', p: 2 }}>
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
              onClick={() => onStart(cam.id)}
              disabled={starting.has(cam.id)}
            >
              {starting.has(cam.id) ? 'Starting...' : 'Start Stream'}
            </Button>
          )}
        </Box>
      )}
      {overlayToolbar}
    </Box>
  );
}
