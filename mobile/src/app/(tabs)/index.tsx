import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useScanStore } from '@/store/scan-store';

export default function HomeScreen() {
  const router = useRouter();
  const reset = useScanStore((state) => state.reset);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.heroSection}>
          <ThemedText type="title" style={styles.title}>
            LooksMax
          </ThemedText>
          <ThemedText style={styles.subtitle} themeColor="textSecondary">
            Scan a selfie for a personalized hair, brow, skin & makeup plan.
          </ThemedText>
        </ThemedView>

        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            reset();
            router.push('/capture');
          }}>
          <ThemedText type="smallBold" style={styles.primaryButtonLabel}>
            Start a scan
          </ThemedText>
        </Pressable>

        {/* Temporary placement until a real Settings screen exists (§18). */}
        <Pressable onPress={() => supabase.auth.signOut()}>
          <ThemedText type="link" themeColor="textSecondary">
            Sign out
          </ThemedText>
        </Pressable>

        {Platform.OS === 'web' && <WebBadge />}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.five,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  heroSection: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  primaryButton: {
    alignSelf: 'stretch',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  primaryButtonLabel: { color: '#fff' },
});
