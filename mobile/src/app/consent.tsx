import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { BIOMETRIC_CONSENT_VERSION, BLANKET_DISCLOSURE_VERSION, useConsentStatus } from '@/hooks/use-consent-status';
import { BIOMETRIC_CONSENT_TEXT, BLANKET_DISCLOSURE_TEXT } from '@/lib/disclosure-copy';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';

type Step = 'biometric' | 'disclosure';
type Region = 'US' | 'EU_UK';

function calculateAge(birthdate: string): number | null {
  const parsed = new Date(birthdate);
  if (Number.isNaN(parsed.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - parsed.getFullYear();
  const hadBirthdayThisYear =
    now.getMonth() > parsed.getMonth() || (now.getMonth() === parsed.getMonth() && now.getDate() >= parsed.getDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

// §13.11/§13.10: mandatory onboarding gate, universal for every user regardless of region. The
// root layout (_layout.tsx) routes here for any signed-in user missing either current-version
// consent, before they can reach the rest of the app.
export default function ConsentScreen() {
  const queryClient = useQueryClient();
  const session = useAuthStore((state) => state.session);
  const consentStatus = useConsentStatus();

  const [step, setStep] = useState<Step>('biometric');
  const [region, setRegion] = useState<Region | null>(null);
  const [ageNotice, setAgeNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Skip a step already granted — e.g. re-entering after a partial completion, or a future
  // re-consent flow once a wording version bumps and only one of the two needs re-granting.
  useEffect(() => {
    if (consentStatus.data?.hasBiometric && !consentStatus.data.hasDisclosure) {
      setStep('disclosure');
    }
  }, [consentStatus.data]);

  useEffect(() => {
    if (!session) return;
    supabase
      .from('users')
      .select('birthdate, region')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setRegion(data.region as Region);
        const age = calculateAge(data.birthdate);
        // §13.11: exactly what's required for 13-17 (parental consent, notice, or neither) is
        // still open pending real legal research — flagged here rather than implemented, per the
        // 2026-09-05 decision to track it in parallel instead of blocking the build.
        if (age !== null && age < 18) {
          setAgeNotice(
            "Because you're under 18, additional consent requirements may apply depending on " +
              'where you live. We\'re finalizing the exact process with legal guidance — standard ' +
              'consent below applies for now.'
          );
        }
      });
  }, [session]);

  async function grantConsent(consentType: 'biometric' | 'blanket_disclosure', version: number) {
    if (!session || !region) return;
    setError(null);
    setIsSubmitting(true);
    const { error: insertError } = await supabase.from('consents').insert({
      user_id: session.user.id,
      consent_type: consentType,
      version,
      region_at_time: region,
    });
    setIsSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['consent-status', session.user.id] });
    if (consentType === 'biometric') {
      setStep('disclosure');
    }
    // After the disclosure grant, the root layout's Stack.Protected guard switches to (tabs)
    // automatically once the invalidated query refetches with both consents present.
  }

  const canSubmit = !isSubmitting && !!region;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {step === 'biometric' ? (
            <>
              <ThemedText type="title" style={styles.centerText}>
                Your photo, explained
              </ThemedText>
              <ThemedText style={styles.body}>{BIOMETRIC_CONSENT_TEXT}</ThemedText>

              {ageNotice && (
                <ThemedView type="backgroundElement" style={styles.noticeCard}>
                  <ThemedText type="small">{ageNotice}</ThemedText>
                </ThemedView>
              )}

              {error && <ThemedText themeColor="textSecondary">{error}</ThemedText>}

              <Pressable
                style={[styles.primaryButton, !canSubmit && styles.disabledButton]}
                onPress={() => grantConsent('biometric', BIOMETRIC_CONSENT_VERSION)}
                disabled={!canSubmit}>
                <ThemedText type="smallBold" style={styles.primaryButtonLabel}>
                  I understand and agree
                </ThemedText>
              </Pressable>
            </>
          ) : (
            <>
              <ThemedText type="title" style={styles.centerText}>
                How we make money
              </ThemedText>
              <ThemedText style={styles.body}>{BLANKET_DISCLOSURE_TEXT}</ThemedText>

              {error && <ThemedText themeColor="textSecondary">{error}</ThemedText>}

              <Pressable
                style={[styles.primaryButton, !canSubmit && styles.disabledButton]}
                onPress={() => grantConsent('blanket_disclosure', BLANKET_DISCLOSURE_VERSION)}
                disabled={!canSubmit}>
                <ThemedText type="smallBold" style={styles.primaryButtonLabel}>
                  I acknowledge
                </ThemedText>
              </Pressable>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    gap: Spacing.three,
  },
  centerText: { textAlign: 'center' },
  body: { lineHeight: 22 },
  noticeCard: { borderRadius: Spacing.three, padding: Spacing.three },
  primaryButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: '#000',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  primaryButtonLabel: { color: '#fff' },
  disabledButton: { opacity: 0.5 },
});
