import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { BIOMETRIC_CONSENT_TEXT, BLANKET_DISCLOSURE_TEXT } from '@/lib/disclosure-copy';

// §13.10: the blanket disclosure "remains accessible afterward in settings/about too" — this is
// that always-available copy, read-only (the onboarding action itself lives in consent.tsx).
// Reached from a temporary link on the Home tab until a real Settings screen exists (§18).
export default function DisclosuresScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="title" style={styles.title}>
            Disclosures & consent
          </ThemedText>

          <ThemedView type="backgroundElement" style={styles.section}>
            <ThemedText type="smallBold">How we make money</ThemedText>
            <ThemedText style={styles.body}>{BLANKET_DISCLOSURE_TEXT}</ThemedText>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.section}>
            <ThemedText type="smallBold">Your photo</ThemedText>
            <ThemedText style={styles.body}>{BIOMETRIC_CONSENT_TEXT}</ThemedText>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth },
  scrollContent: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.five, gap: Spacing.three },
  title: { marginBottom: Spacing.two },
  section: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  body: { lineHeight: 22 },
});
