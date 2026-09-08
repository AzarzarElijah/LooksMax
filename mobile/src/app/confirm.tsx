import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useScanStore } from '@/store/scan-store';

// §13.1 confirm/retake screen, plus §13.2's explicit makeup question (asked here rather than
// inferred by the AI).
export default function ConfirmScreen() {
  const router = useRouter();
  const photoUri = useScanStore((state) => state.photoUri);
  const setMakeupOn = useScanStore((state) => state.setMakeupOn);
  const reset = useScanStore((state) => state.reset);
  const [makeupOn, setLocalMakeupOn] = useState<boolean | null>(null);

  if (!photoUri) {
    router.replace('/capture');
    return null;
  }

  function handleRetake() {
    reset();
    router.replace('/capture');
  }

  function handleConfirm() {
    if (makeupOn === null) return;
    setMakeupOn(makeupOn);
    router.push('/results');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Image source={{ uri: photoUri }} style={styles.preview} contentFit="cover" />

        <ThemedView type="backgroundElement" style={styles.questionCard}>
          <ThemedText type="smallBold">Are you wearing makeup right now?</ThemedText>
          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggleButton, makeupOn === true && styles.toggleButtonSelected]}
              onPress={() => setLocalMakeupOn(true)}>
              <ThemedText type="smallBold">Yes</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.toggleButton, makeupOn === false && styles.toggleButtonSelected]}
              onPress={() => setLocalMakeupOn(false)}>
              <ThemedText type="smallBold">No</ThemedText>
            </Pressable>
          </View>
        </ThemedView>

        <View style={styles.actions}>
          <Pressable style={styles.secondaryButton} onPress={handleRetake}>
            <ThemedText type="smallBold">Retake</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.primaryButton, makeupOn === null && styles.disabledButton]}
            onPress={handleConfirm}
            disabled={makeupOn === null}>
            <ThemedText type="smallBold" style={styles.primaryButtonLabel}>
              Use this photo
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  preview: { flex: 1, borderRadius: Spacing.three, backgroundColor: '#000' },
  questionCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  toggleRow: { flexDirection: 'row', gap: Spacing.two },
  toggleButton: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.4)',
    alignItems: 'center',
  },
  toggleButtonSelected: {
    borderColor: '#3c87f7',
    backgroundColor: 'rgba(60,135,247,0.12)',
  },
  actions: { flexDirection: 'row', gap: Spacing.three },
  secondaryButton: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.4)',
    alignItems: 'center',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  primaryButtonLabel: { color: '#fff' },
  disabledButton: { opacity: 0.4 },
});
