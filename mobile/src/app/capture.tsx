import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { capPhotoResolution } from '@/lib/resize-photo';
import { useScanStore } from '@/store/scan-store';

// §13.1: live camera is the primary path, gallery upload is the fallback. Real-time on-device
// coaching (blur/lighting/framing feedback) and the automated pass/fail quality gate described
// in the spec are NOT implemented yet — this is a static face-outline guide only. The
// confirm screen (confirm.tsx) is currently the only check before a photo is accepted. Wiring up
// an actual quality model is a follow-up, not silently faked here.
export default function CaptureScreen() {
  const router = useRouter();
  const setPhoto = useScanStore((state) => state.setPhoto);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  async function handleCapture() {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) {
        const capped = await capPhotoResolution(photo);
        setPhoto(capped.uri);
        router.push('/confirm');
      }
    } finally {
      setIsCapturing(false);
    }
  }

  async function handleGalleryFallback() {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    const asset = result.assets?.[0];
    if (!result.canceled && asset) {
      const capped = await capPhotoResolution(asset);
      setPhoto(capped.uri);
      router.push('/confirm');
    }
  }

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.permissionSafeArea}>
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionBody}>
            LooksMax uses your camera to guide you through a selfie scan.
          </Text>
          <Pressable style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonLabel}>Allow camera</Text>
          </Pressable>
          <Pressable onPress={handleGalleryFallback}>
            <Text style={styles.linkLabel}>Choose from gallery instead</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />
      <View style={styles.faceGuide} pointerEvents="none" />
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.coachingBanner}>
          <Text style={styles.coachingText}>Center your face in the outline, hold still</Text>
        </View>
        <View style={styles.controls}>
          <Pressable onPress={handleGalleryFallback}>
            <Text style={styles.linkLabelLight}>Gallery</Text>
          </Pressable>
          <Pressable
            style={[styles.shutterButton, isCapturing && styles.shutterButtonDisabled]}
            onPress={handleCapture}
            disabled={isCapturing}
          />
          <View style={styles.controlsSpacer} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permissionSafeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  permissionTitle: { color: '#fff', fontSize: 20, fontWeight: '600', textAlign: 'center' },
  permissionBody: { color: '#ccc', fontSize: 15, textAlign: 'center' },
  primaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  primaryButtonLabel: { color: '#000', fontWeight: '700', fontSize: 15 },
  linkLabel: { color: '#ccc', fontSize: 14 },
  linkLabelLight: { color: '#fff', fontSize: 15, fontWeight: '600' },
  faceGuide: {
    position: 'absolute',
    top: '16%',
    left: '14%',
    right: '14%',
    bottom: '28%',
    borderRadius: 999,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  overlay: { flex: 1, justifyContent: 'space-between', paddingVertical: 24 },
  coachingBanner: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  coachingText: { color: '#fff', fontSize: 14 },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  controlsSpacer: { width: 60 },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  shutterButtonDisabled: { opacity: 0.5 },
});
