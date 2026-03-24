'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { PhotoCamera } from '@mui/icons-material';

export type WebcamCaptureDialogProps = {
  open: boolean;
  onClose: () => void;
  /** JPEG file from the current video frame */
  onCaptured: (file: File) => void;
  title: string;
  description?: string;
};

export function WebcamCaptureDialog({
  open,
  onClose,
  onCaptured,
  title,
  description,
}: WebcamCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) {
      setError(null);
      setStarting(false);
      setReady(false);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      return;
    }

    let cancelled = false;
    setError(null);
    setReady(false);
    setStarting(true);

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera is not supported in this browser.');
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const el = videoRef.current;
        if (el) {
          el.srcObject = stream;
          await el.play().catch(() => {
            /* autoplay policies — user gesture already opened dialog */
          });
          setReady(true);
        }
      } catch (e) {
        if (!cancelled) {
          const msg =
            e instanceof Error
              ? e.name === 'NotAllowedError'
                ? 'Camera permission denied. Allow access in the browser bar, or use upload instead.'
                : e.message
              : 'Could not open camera.';
          setError(msg);
        }
      } finally {
        if (!cancelled) setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [open]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) {
      setError('Video not ready yet. Wait a moment and try again.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Could not capture frame.');
      return;
    }
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError('Could not encode image.');
          return;
        }
        const file = new File([blob], `enroll-webcam-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCaptured(file);
        onClose();
      },
      'image/jpeg',
      0.92,
    );
  }, [onCaptured, onClose]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="webcam-dialog-title">
      <DialogTitle id="webcam-dialog-title">{title}</DialogTitle>
      <DialogContent>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {description}
          </Typography>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            aspectRatio: '4/3',
            bgcolor: 'action.hover',
            borderRadius: 1,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {starting && (
            <CircularProgress size={40} aria-label="Starting camera" />
          )}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption -- preview only, no audio track */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)',
              display: starting && !ready ? 'none' : 'block',
            }}
          />
        </Box>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          Preview is mirrored like a selfie. The saved photo is not mirrored.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<PhotoCamera />}
          onClick={capture}
          disabled={!ready || !!error}
        >
          Capture photo
        </Button>
      </DialogActions>
    </Dialog>
  );
}
