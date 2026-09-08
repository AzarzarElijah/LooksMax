import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useConsentStatus } from '@/hooks/use-consent-status';
import { useAuthStore } from '@/store/auth-store';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootNavigator() {
  const session = useAuthStore((state) => state.session);
  const isAuthInitializing = useAuthStore((state) => state.isInitializing);
  const consentStatus = useConsentStatus();

  // §13.10/§13.11: every signed-in user must have both current-version consents on file before
  // reaching the rest of the app — checked fresh here rather than cached at signup time, so a
  // future wording-version bump re-gates existing users automatically.
  const isConsentLoading = !!session && consentStatus.isPending;
  const isLoading = isAuthInitializing || isConsentLoading;
  const needsConsent = !!session && !isLoading && !(consentStatus.data?.hasBiometric && consentStatus.data?.hasDisclosure);
  const isReady = !!session && !isLoading && !needsConsent;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isLoading}>
        <Stack.Screen name="loading" />
      </Stack.Protected>

      <Stack.Protected guard={!isLoading && !session}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
      </Stack.Protected>

      <Stack.Protected guard={needsConsent}>
        <Stack.Screen name="consent" />
      </Stack.Protected>

      <Stack.Protected guard={isReady}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="capture" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="confirm" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="results" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="disclosures" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <RootNavigator />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
