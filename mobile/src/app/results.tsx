import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSubscriptionTier } from '@/hooks/use-subscription-tier';
import { submitScan, type AnalyzeScanResult } from '@/lib/scan-api';
import { useScanStore } from '@/store/scan-store';

const CATEGORY_LABELS: Record<string, string> = {
  hair: 'Hair',
  brows: 'Brows',
  skin: 'Skin',
  makeup: 'Makeup',
};

// §13.4: free tier sees only the top 2 tips per category — applied client-side against the
// full list the server returns, per the tier-gating rule shared with analyze-scan.
const FREE_TIER_RECOMMENDATION_CAP = 2;

export default function ResultsScreen() {
  const router = useRouter();
  const photoUri = useScanStore((state) => state.photoUri);
  const makeupOn = useScanStore((state) => state.makeupOn);
  const reset = useScanStore((state) => state.reset);
  const tier = useSubscriptionTier();

  const mutation = useMutation({
    mutationFn: () => {
      if (!photoUri || makeupOn === null) {
        return Promise.reject(new Error('Missing photo or makeup answer.'));
      }
      return submitScan(photoUri, makeupOn);
    },
  });

  const hasStarted = useRef(false);
  useEffect(() => {
    if (hasStarted.current || !photoUri || makeupOn === null) return;
    hasStarted.current = true;
    mutation.mutate();
    // Fires once per mount when a valid capture is present — mutate() is stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoUri, makeupOn]);

  if (!photoUri || makeupOn === null) {
    router.replace('/capture');
    return null;
  }

  if (mutation.isPending || mutation.isIdle) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <ThemedText style={styles.centerText}>Analyzing your scan…</ThemedText>
      </ThemedView>
    );
  }

  if (mutation.isError) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText type="subtitle" style={styles.centerText}>
          Something went wrong
        </ThemedText>
        <ThemedText style={styles.centerText} themeColor="textSecondary">
          {(mutation.error as Error).message}
        </ThemedText>
        <Pressable style={styles.primaryButton} onPress={() => mutation.mutate()}>
          <ThemedText type="smallBold" style={styles.primaryButtonLabel}>
            Try again
          </ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const result = mutation.data as AnalyzeScanResult;
  const categoryEntries = (Object.entries(result.categories) as [string, AnalyzeScanResult['categories']['hair']][]).filter(
    ([, category]) => category !== null
  );

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.overallCard}>
          <ThemedText type="title" style={styles.centerText}>
            {result.overallScore} → {result.overallPotentialScore}
          </ThemedText>
          <ThemedText style={styles.centerText} themeColor="textSecondary">
            Overall score → potential
          </ThemedText>
        </View>

        {categoryEntries.map(([category, cat]) => {
          const recommendations =
            tier === 'paid' ? cat!.recommendations : cat!.recommendations.slice(0, FREE_TIER_RECOMMENDATION_CAP);

          return (
            <ThemedView key={category} type="backgroundElement" style={styles.categoryCard}>
              <View style={styles.categoryHeader}>
                <ThemedText type="smallBold">{CATEGORY_LABELS[category] ?? category}</ThemedText>
                <ThemedText type="smallBold">
                  {cat!.score} → {cat!.potentialScore}
                </ThemedText>
              </View>

              {recommendations.map((rec, index) => (
                <View key={index} style={styles.recommendation}>
                  <ThemedText type="smallBold">{rec.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {rec.rationale}
                  </ThemedText>
                  <ThemedText type="small">{rec.how_to}</ThemedText>
                </View>
              ))}

              {tier === 'free' && cat!.recommendations.length > FREE_TIER_RECOMMENDATION_CAP && (
                <ThemedText type="small" themeColor="textSecondary">
                  +{cat!.recommendations.length - FREE_TIER_RECOMMENDATION_CAP} more tips with premium
                </ThemedText>
              )}
            </ThemedView>
          );
        })}

        <Pressable
          style={styles.secondaryButton}
          onPress={() => {
            reset();
            router.replace('/');
          }}>
          <ThemedText type="smallBold">Done</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  centerText: { textAlign: 'center' },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  safeArea: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    gap: Spacing.three,
  },
  overallCard: { alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.three },
  categoryCard: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recommendation: { gap: Spacing.half },
  primaryButton: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.three,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  primaryButtonLabel: { color: '#fff' },
  secondaryButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.4)',
    alignItems: 'center',
  },
});
