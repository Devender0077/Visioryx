import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { getStoredToken, streamMjpegUrl } from '@/lib/api';
import { Stitch } from '@/constants/stitchTheme';

export default function CameraViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cameraId = Number(id);
  const { height } = useWindowDimensions();
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getStoredToken();
      if (!token || cancelled) return;
      setUri(streamMjpegUrl(cameraId, token));
    })();
    return () => {
      cancelled = true;
    };
  }, [cameraId]);

  return (
    <View style={[styles.root, { minHeight: height * 0.75 }]}>
      {!uri ? (
        <ActivityIndicator size="large" color={Stitch.primary} />
      ) : (
        <WebView
          source={{ uri }}
          style={styles.web}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          originWhitelist={['*']}
          javaScriptEnabled
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  web: { flex: 1, backgroundColor: '#000' },
});
