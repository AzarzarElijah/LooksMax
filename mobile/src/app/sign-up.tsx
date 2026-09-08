import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type Region = 'US' | 'EU_UK';

const BIRTHDATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function calculateAge(birthdate: Date): number {
  const now = new Date();
  let age = now.getFullYear() - birthdate.getFullYear();
  const hadBirthdayThisYear =
    now.getMonth() > birthdate.getMonth() ||
    (now.getMonth() === birthdate.getMonth() && now.getDate() >= birthdate.getDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

// §13.11 note: this is the mechanical signup form plus the hard "block signup if under 13" gate
// (also enforced server-side by the handle_new_user trigger, per
// supabase/migrations/20260906000400_handle_new_user_trigger.sql). The full biometric-consent
// explainer, blanket-disclosure acknowledgment, and the still-open 13-17 heightened-consent
// question from §13.10/§13.11 are separate, not-yet-built work.
export default function SignUpScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [region, setRegion] = useState<Region | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignUp() {
    setError(null);
    setNotice(null);

    if (!BIRTHDATE_PATTERN.test(birthdate)) {
      setError('Enter your birthdate as YYYY-MM-DD.');
      return;
    }
    const parsedBirthdate = new Date(birthdate);
    if (Number.isNaN(parsedBirthdate.getTime())) {
      setError("That birthdate doesn't look right.");
      return;
    }
    if (calculateAge(parsedBirthdate) < 13) {
      setError('You must be at least 13 years old to use LooksMax.');
      return;
    }
    if (!region) {
      setError('Select your region.');
      return;
    }

    setIsSubmitting(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { birthdate, region } },
    });
    setIsSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (!data.session) {
      setNotice('Check your email to confirm your account, then sign in.');
      return;
    }
    // With a session already active, the root layout's Stack.Protected guard switches to
    // (tabs) automatically.
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.centerText}>
          Create your account
        </ThemedText>

        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          placeholder="Email"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          placeholder="Password"
          placeholderTextColor={theme.textSecondary}
          autoComplete="password-new"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
          placeholder="Birthdate (YYYY-MM-DD)"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          value={birthdate}
          onChangeText={setBirthdate}
        />

        <ThemedText type="smallBold">Region</ThemedText>
        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggleButton, region === 'US' && styles.toggleButtonSelected]}
            onPress={() => setRegion('US')}>
            <ThemedText type="smallBold">US</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.toggleButton, region === 'EU_UK' && styles.toggleButtonSelected]}
            onPress={() => setRegion('EU_UK')}>
            <ThemedText type="smallBold">EU / UK</ThemedText>
          </Pressable>
        </View>

        {error && <ThemedText themeColor="textSecondary">{error}</ThemedText>}
        {notice && <ThemedText themeColor="textSecondary">{notice}</ThemedText>}

        <Pressable
          style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
          onPress={handleSignUp}
          disabled={isSubmitting}>
          <ThemedText type="smallBold" style={styles.primaryButtonLabel}>
            {isSubmitting ? 'Creating account…' : 'Sign up'}
          </ThemedText>
        </Pressable>

        <Pressable onPress={() => router.back()}>
          <ThemedText type="link" themeColor="textSecondary">
            Already have an account? Sign in
          </ThemedText>
        </Pressable>
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
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  centerText: { textAlign: 'center', marginBottom: Spacing.two },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
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
