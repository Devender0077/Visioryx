import { useState, useRef, useEffect, useCallback } from 'react';
import { Alert, StyleSheet, Text, View, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { Stitch, FontFamily } from '@/constants/stitchTheme';
import { useStitchTheme } from '@/hooks/useStitchTheme';
import { getStoredToken, api } from '@/lib/api';

type EnrollmentStep = 'intro' | 'capture' | 'uploading' | 'success' | 'error';

interface CapturedPhoto {
  uri: string;
  width: number;
  height: number;
}

interface CaptureInstruction {
  label: string;
  icon: string;
  description: string;
  voiceText: string;
}

const CAPTURE_STEPS: CaptureInstruction[] = [
  { label: 'Front', icon: 'face-recognition', description: 'Look straight at the camera', voiceText: 'Look straight at the camera. Keep your face centered.' },
  { label: 'Left', icon: 'arrow-left', description: 'Turn your face slightly left', voiceText: 'Now turn your face slightly to the left.' },
  { label: 'Right', icon: 'arrow-right', description: 'Turn your face slightly right', voiceText: 'Now turn your face slightly to the right.' },
];

const TAB_BAR_HEIGHT = 90;

export default function EnrollTabScreen() {
  const router = useRouter();
  const T = useStitchTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  
  const [step, setStep] = useState<EnrollmentStep>('intro');
  const [currentCaptureIndex, setCurrentCaptureIndex] = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [authToken, setAuthToken] = useState<string>('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    getStoredToken().then((token) => {
      setAuthToken(token || '');
    });
  }, []);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
    if (!mediaPermission?.granted) {
      requestMediaPermission();
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (voiceEnabled) {
      Speech.stop();
      Speech.speak(text, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.9,
      });
    }
  }, [voiceEnabled]);

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    
    const currentInstruction = CAPTURE_STEPS[currentCaptureIndex];
    speak('Capturing. Please wait.');
    
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      
      if (photo) {
        const newPhotos = [...capturedPhotos, photo];
        setCapturedPhotos(newPhotos);
        
        if (currentCaptureIndex < CAPTURE_STEPS.length - 1) {
          setCurrentCaptureIndex(currentCaptureIndex + 1);
          setTimeout(() => {
            const nextInstruction = CAPTURE_STEPS[currentCaptureIndex + 1];
            speak(nextInstruction.voiceText);
          }, 500);
        } else {
          await submitEnrollment(newPhotos);
        }
      }
    } catch (e) {
      console.error('Failed to capture photo:', e);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    }
  };

  const submitEnrollment = async (photos: CapturedPhoto[]) => {
    setStep('uploading');
    speak('Processing your photos. Please wait.');
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      
      photos.forEach((photo, index) => {
        formData.append('files', {
          uri: photo.uri,
          type: 'image/jpeg',
          name: `photo_${index}.jpg`,
        } as unknown as Blob);
      });
      
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/v1/enroll/upload-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Enrollment failed');
      }
      
      speak('Enrollment complete! Your face has been enrolled successfully.');
      setStep('success');
    } catch (e) {
      console.error('Enrollment error:', e);
      const errorMsg = e instanceof Error ? e.message : 'Failed to enroll. Please try again.';
      setErrorMessage(errorMsg);
      speak('Enrollment failed. Please try again.');
      setStep('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startCapture = () => {
    setStep('capture');
    setTimeout(() => {
      speak(CAPTURE_STEPS[0].voiceText);
    }, 500);
  };

  const resetEnrollment = () => {
    setStep('intro');
    setCurrentCaptureIndex(0);
    setCapturedPhotos([]);
    setErrorMessage('');
    Speech.stop();
  };

  const renderIntro = () => (
    <View style={styles.centerContent}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <MaterialCommunityIcons name="arrow-left" size={24} color={Stitch.onSurface} />
      </Pressable>
      
      <View style={styles.voiceToggle}>
        <Pressable style={[styles.voiceBtn, voiceEnabled && styles.voiceBtnActive]} onPress={() => setVoiceEnabled(!voiceEnabled)}>
          <MaterialCommunityIcons name={voiceEnabled ? 'volume-high' : 'volume-off'} size={20} color={voiceEnabled ? Stitch.primary : Stitch.outline} />
        </Pressable>
      </View>
      
      <MaterialCommunityIcons name="face-recognition" size={80} color={Stitch.primary} style={{ marginTop: 16 }} />
      <Text style={[styles.title, { color: Stitch.onSurface }]}>Face Enrollment</Text>
      <Text style={[styles.subtitle, { color: Stitch.onSurfaceVariant }]}>
        Set up face recognition for secure authentication. We'll capture your face from multiple angles with voice guidance.
      </Text>
      
      <View style={styles.instructionsList}>
        {CAPTURE_STEPS.map((item, index) => (
          <View key={item.label} style={styles.instructionItem}>
            <View style={[styles.instructionNumber, { backgroundColor: Stitch.primaryContainer }]}>
              <Text style={[styles.instructionNumberText, { color: Stitch.onPrimaryContainer }]}>{index + 1}</Text>
            </View>
            <View style={styles.instructionContent}>
              <Text style={[styles.instructionLabel, { color: Stitch.onSurface }]}>{item.label} View</Text>
              <Text style={[styles.instructionDesc, { color: Stitch.onSurfaceVariant }]}>{item.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <Pressable style={styles.startButton} onPress={startCapture}>
        <LinearGradient
          colors={[Stitch.primary, Stitch.primaryContainer]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.startButtonGradient}
        >
          <MaterialCommunityIcons name="camera" size={24} color={Stitch.onPrimary} />
          <Text style={styles.startButtonText}>Start Enrollment</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );

  const renderCapture = () => {
    const currentInstruction = CAPTURE_STEPS[currentCaptureIndex];
    const progress = ((currentCaptureIndex + 1) / CAPTURE_STEPS.length) * 100;
    const { height: screenHeight } = Dimensions.get('window');
    
    return (
      <View style={styles.captureContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
          mode="picture"
        >
          <View style={styles.cameraOverlay}>
            <Pressable style={styles.captureCloseBtn} onPress={() => { Speech.stop(); setStep('intro'); }}>
              <MaterialCommunityIcons name="close" size={24} color="#ffffff" />
            </Pressable>
            
            <View style={[styles.faceGuide, { top: screenHeight * 0.12 }]}>
              <View style={[styles.faceOutline, { borderColor: Stitch.primary }]} />
            </View>
            
            <View style={[styles.instructionCard, { bottom: TAB_BAR_HEIGHT + 160 }]}>
              <MaterialCommunityIcons 
                name={currentInstruction.icon as keyof typeof MaterialCommunityIcons.glyphMap} 
                size={32} 
                color={Stitch.primary} 
              />
              <Text style={[styles.instructionTitle, { color: Stitch.onSurface }]}>
                {currentInstruction.label} View
              </Text>
              <Text style={[styles.instructionText, { color: Stitch.onSurfaceVariant }]}>
                {currentInstruction.description}
              </Text>
            </View>
            
            <View style={[styles.progressContainer, { bottom: TAB_BAR_HEIGHT + 60 }]}>
              <View style={[styles.progressBar, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                <View style={[styles.progressFill, { backgroundColor: Stitch.primary, width: `${progress}%` }]} />
              </View>
              <Text style={[styles.progressText, { color: '#ffffff' }]}>
                {currentCaptureIndex + 1} of {CAPTURE_STEPS.length}
              </Text>
            </View>
            
            <Pressable 
              style={[styles.captureButton, { bottom: TAB_BAR_HEIGHT + 20 }]} 
              onPress={handleCapture}
              disabled={isSubmitting}
            >
              <View style={[styles.captureButtonOuter, { borderColor: Stitch.primary }]}>
                <View style={[styles.captureButtonInner, { backgroundColor: Stitch.primary }]} />
              </View>
            </Pressable>
          </View>
        </CameraView>
      </View>
    );
  };

  const renderUploading = () => (
    <View style={styles.centerContent}>
      <ActivityIndicator size="large" color={Stitch.primary} />
      <Text style={[styles.title, { color: Stitch.onSurface, marginTop: 24 }]}>
        Processing...
      </Text>
      <Text style={[styles.subtitle, { color: Stitch.onSurfaceVariant }]}>
        Analyzing your facial data and creating your biometric profile.
      </Text>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.centerContent}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <MaterialCommunityIcons name="arrow-left" size={24} color={Stitch.onSurface} />
      </Pressable>
      <View style={[styles.successIcon, { backgroundColor: '#00aa54', marginTop: 60 }]}>
        <MaterialCommunityIcons name="check" size={48} color="#ffffff" />
      </View>
      <Text style={[styles.title, { color: Stitch.onSurface }]}>
        Enrollment Complete!
      </Text>
      <Text style={[styles.subtitle, { color: Stitch.onSurfaceVariant }]}>
        Your face has been enrolled successfully. You can now use face recognition for authentication.
      </Text>
      
      <Pressable style={styles.doneButton} onPress={() => router.back()}>
        <Text style={[styles.doneButtonText, { color: Stitch.primary }]}>Done</Text>
      </Pressable>
    </View>
  );

  const renderError = () => (
    <View style={styles.centerContent}>
      <Pressable style={styles.backButton} onPress={() => { Speech.stop(); setStep('intro'); }}>
        <MaterialCommunityIcons name="arrow-left" size={24} color={Stitch.onSurface} />
      </Pressable>
      <View style={[styles.errorIcon, { backgroundColor: '#93000a', marginTop: 60 }]}>
        <MaterialCommunityIcons name="alert-circle" size={48} color="#ffdad6" />
      </View>
      <Text style={[styles.title, { color: Stitch.onSurface }]}>
        Enrollment Failed
      </Text>
      <Text style={[styles.subtitle, { color: Stitch.onSurfaceVariant }]}>
        {errorMessage || 'An error occurred. Please try again.'}
      </Text>
      
      <Pressable style={styles.retryButton} onPress={resetEnrollment}>
        <LinearGradient
          colors={[Stitch.primary, Stitch.primaryContainer]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.retryButtonGradient}
        >
          <MaterialCommunityIcons name="refresh" size={20} color={Stitch.onPrimary} />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );

  if (!permission?.granted) {
    return (
      <View style={[styles.root, styles.centerContent, { backgroundColor: Stitch.surface }]}>
        <MaterialCommunityIcons name="camera-off" size={64} color={Stitch.outline} />
        <Text style={[styles.title, { color: Stitch.onSurface, marginTop: 16 }]}>
          Camera Access Required
        </Text>
        <Text style={[styles.subtitle, { color: Stitch.onSurfaceVariant, marginTop: 8, textAlign: 'center' }]}>
          We need camera access to capture your face for enrollment.
        </Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: Stitch.surface }]}>
      {step === 'intro' && renderIntro()}
      {step === 'capture' && renderCapture()}
      {step === 'uploading' && renderUploading()}
      {step === 'success' && renderSuccess()}
      {step === 'error' && renderError()}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 24,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: TAB_BAR_HEIGHT,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Stitch.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  voiceToggle: {
    position: 'absolute',
    top: 50,
    right: 0,
    zIndex: 10,
  },
  voiceBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Stitch.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceBtnActive: {
    backgroundColor: `${Stitch.primary}22`,
  },
  captureCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  title: {
    fontFamily: FontFamily.headlineBlack,
    fontSize: 28,
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 280,
  },
  instructionsList: {
    width: '100%',
    marginTop: 32,
    marginBottom: 24,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  instructionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionNumberText: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 14,
  },
  instructionContent: {
    marginLeft: 12,
  },
  instructionLabel: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 15,
  },
  instructionDesc: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    marginTop: 2,
  },
  startButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  startButtonText: {
    fontFamily: FontFamily.headline,
    fontSize: 16,
    color: Stitch.onPrimary,
  },
  captureContainer: {
    flex: 1,
    margin: -24,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceGuide: {
    position: 'absolute',
    width: '70%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceOutline: {
    width: 200,
    height: 260,
    borderWidth: 2,
    borderRadius: 100,
    borderStyle: 'dashed',
    opacity: 0.6,
  },
  instructionCard: {
    position: 'absolute',
    backgroundColor: 'rgba(11, 19, 38, 0.95)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: '85%',
  },
  instructionTitle: {
    fontFamily: FontFamily.headline,
    fontSize: 20,
    marginTop: 8,
  },
  instructionText: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  progressContainer: {
    position: 'absolute',
    width: '85%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontFamily: FontFamily.labelMedium,
    fontSize: 12,
    marginTop: 8,
  },
  captureButton: {
    position: 'absolute',
  },
  captureButtonOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButton: {
    marginTop: 32,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  doneButtonText: {
    fontFamily: FontFamily.headline,
    fontSize: 16,
  },
  errorIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButton: {
    marginTop: 32,
    borderRadius: 14,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  retryButtonText: {
    fontFamily: FontFamily.headline,
    fontSize: 16,
    color: Stitch.onPrimary,
  },
  permissionButton: {
    marginTop: 24,
    backgroundColor: Stitch.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  permissionButtonText: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 16,
    color: Stitch.onPrimary,
  },
});
