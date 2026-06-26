/**
 * Phone pair page — public (no auth). The phone scans a QR from the admin's
 * Cameras screen and lands here. We:
 *   1. Resolve the token → camera meta (`/api/v1/phone-cameras/pair-info`)
 *   2. Ask for camera permission via getUserMedia()
 *   3. Draw frames to a hidden canvas + send JPEGs over a WebSocket
 *      at ~6 fps. Heartbeat-style: backend marks camera offline if no
 *      frame in 30s.
 *
 * Web-only. On native Expo it'd require expo-camera + buffer handling; out of
 * scope for the MVP since the use-case is "any web-browser-enabled device".
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { getApiBase } from '@/lib/config';
import { PaletteDark as C, FontFamily as F, Radius, Space, TextStyles } from '@/constants/visionTheme';

interface PairInfo {
  camera_id: string;
  camera_name: string;
  ws_path: string;
}

type Phase = 'resolving' | 'ready' | 'requesting-camera' | 'streaming' | 'error';

const FRAME_INTERVAL_MS = 160;   // ~6.25 fps
const JPEG_QUALITY = 0.6;
const FRAME_WIDTH = 640;

export default function PairScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = (Array.isArray(params.token) ? params.token[0] : params.token) || '';

  const [phase, setPhase] = useState<Phase>('resolving');
  const [info, setInfo] = useState<PairInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ frames: 0, kbps: 0 });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bytesAcc = useRef({ b: 0, t: Date.now() });

  // 1. Resolve pair-info
  useEffect(() => {
    if (Platform.OS !== 'web') {
      setPhase('error'); setError('Open this link in a phone browser.'); return;
    }
    if (!token) { setPhase('error'); setError('Missing pair token in URL.'); return; }
    (async () => {
      try {
        const base = getApiBase();
        const r = await fetch(`${base}/api/v1/phone-cameras/pair-info?token=${encodeURIComponent(token)}`);
        if (!r.ok) {
          const t = await r.text();
          throw new Error(`HTTP ${r.status}: ${t.slice(0, 200)}`);
        }
        setInfo(await r.json());
        setPhase('ready');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setPhase('error');
      }
    })();
  }, [token]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopStream = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) wsRef.current.close();
    wsRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (!info) return;
    setPhase('requesting-camera');
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: FRAME_WIDTH } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      // Open WS
      const base = getApiBase();
      const wsUrl = base.replace(/^http/, 'ws') + info.ws_path;
      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;
      ws.onopen = () => {
        setPhase('streaming');
        // Start sampling
        const canvas = canvasRef.current!;
        canvas.width = FRAME_WIDTH;
        canvas.height = Math.round(FRAME_WIDTH * (videoRef.current!.videoHeight / Math.max(1, videoRef.current!.videoWidth)));
        const ctx = canvas.getContext('2d')!;
        let n = 0;
        tickRef.current = setInterval(() => {
          if (!videoRef.current || ws.readyState !== WebSocket.OPEN) return;
          try {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
              async (blob) => {
                if (!blob || ws.readyState !== WebSocket.OPEN) return;
                const buf = await blob.arrayBuffer();
                ws.send(buf);
                n += 1;
                bytesAcc.current.b += buf.byteLength;
                const dt = Date.now() - bytesAcc.current.t;
                if (dt >= 1000) {
                  setStats({ frames: n, kbps: Math.round(bytesAcc.current.b / dt * 8) });
                  bytesAcc.current = { b: 0, t: Date.now() };
                }
              },
              'image/jpeg', JPEG_QUALITY,
            );
          } catch {/* drop frame */}
        }, FRAME_INTERVAL_MS);
      };
      ws.onerror = () => { setError('WebSocket error'); setPhase('error'); stopStream(); };
      ws.onclose = (e) => {
        if (phase === 'streaming') {
          setError(`Disconnected (code ${e.code}). Tap restart.`);
          setPhase('ready');
        }
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
      stopStream();
    }
  }, [info, phase, stopStream]);

  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.root, { backgroundColor: C.bg }]}>
        <Text style={styles.errText}>Open this URL in a phone browser.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]} testID="pair-screen">
      <View style={styles.card}>
        <View style={styles.head}>
          <MaterialCommunityIcons name="cellphone-link" size={22} color={C.primaryAccent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>VISIONARYX · WIRELESS CAMERA</Text>
            <Text style={styles.title} numberOfLines={1}>
              {info?.camera_name || (phase === 'resolving' ? 'Pairing…' : 'Camera')}
            </Text>
          </View>
          <View style={[styles.pill, { borderColor: phase === 'streaming' ? C.success : C.warning, backgroundColor: phase === 'streaming' ? 'rgba(34,197,94,0.12)' : 'rgba(255,182,107,0.12)' }]}>
            <View style={[styles.dot, { backgroundColor: phase === 'streaming' ? C.success : C.warning }]} />
            <Text style={[styles.pillText, { color: phase === 'streaming' ? C.success : C.warning }]}>{phase.toUpperCase()}</Text>
          </View>
        </View>

        {error ? <Text style={styles.errText} testID="pair-error">{error}</Text> : null}

        <View style={styles.previewFrame} testID="pair-preview">
          {/* @ts-expect-error DOM video */}
          <video
            ref={videoRef as any}
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000', display: 'block' }}
          />
          {/* @ts-expect-error DOM canvas hidden */}
          <canvas ref={canvasRef as any} style={{ display: 'none' }} />
          {phase !== 'streaming' ? (
            <View style={styles.overlay}>
              <MaterialCommunityIcons name="camera-outline" size={48} color={C.primaryAccent} />
              <Text style={styles.overlayText}>
                {phase === 'resolving' ? 'Resolving pair token…' :
                 phase === 'ready' ? 'Tap "Start" to share this device as a camera.' :
                 phase === 'requesting-camera' ? 'Allow camera access in your browser.' :
                 'Cannot stream.'}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          {phase === 'streaming' ? (
            <>
              <Text style={styles.stat} testID="pair-stats">{stats.frames} frames · {stats.kbps} kbps</Text>
              <Pressable
                style={[styles.btn, { backgroundColor: C.danger }]}
                onPress={() => { stopStream(); setPhase('ready'); }}
                testID="pair-stop"
              >
                <MaterialCommunityIcons name="stop" size={16} color="#fff" />
                <Text style={styles.btnText}>Stop</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              style={[styles.btn, { backgroundColor: info ? C.primaryAccent : C.surface3, opacity: info ? 1 : 0.5 }]}
              onPress={start}
              disabled={!info || phase === 'requesting-camera'}
              testID="pair-start"
            >
              <MaterialCommunityIcons name="play" size={16} color="#fff" />
              <Text style={styles.btnText}>Start camera</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.foot}>
          Keep this tab open. Closing the tab will take the camera offline.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space.lg },
  card: {
    width: '100%', maxWidth: 420,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surface, padding: Space.lg, gap: Space.md,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  eyebrow: { ...TextStyles.label, color: C.primaryAccent, fontSize: 9 },
  title: { ...TextStyles.h4, color: C.text, marginTop: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1 },
  pillText: { ...TextStyles.label, fontSize: 8, letterSpacing: 1 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  previewFrame: {
    aspectRatio: 16 / 9,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: C.border,
    backgroundColor: '#000', overflow: 'hidden', position: 'relative',
  },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: Space.sm, padding: Space.lg },
  overlayText: { ...TextStyles.caption, color: C.textMuted, textAlign: 'center' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Space.md, justifyContent: 'space-between' },
  stat: { ...TextStyles.caption, fontFamily: F.mono, color: C.textMuted },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.full },
  btnText: { color: '#fff', fontFamily: F.bodySemibold, fontSize: 13 },
  foot: { ...TextStyles.caption, color: C.textFaint, textAlign: 'center', fontSize: 10 },
  errText: { ...TextStyles.caption, color: C.danger, fontFamily: F.mono, fontSize: 11, textAlign: 'center' },
});
