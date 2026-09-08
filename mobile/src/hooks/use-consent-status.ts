import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';

// Bump a version when its acknowledged wording changes materially. Consents are versioned in
// the DB (§16 `consents` table) specifically so a wording change never erases the record of what
// was actually agreed to at the time, and existing users get re-prompted under the new version.
export const BIOMETRIC_CONSENT_VERSION = 1;
export const BLANKET_DISCLOSURE_VERSION = 1;

export interface ConsentStatus {
  hasBiometric: boolean;
  hasDisclosure: boolean;
}

// §13.11: biometric consent is required from every user (not just EU/UK) before they can use the
// app. §13.10: the blanket disclosure acknowledgment is the same requirement for affiliate/
// promoted-content disclosure. The root layout (_layout.tsx) gates the whole app on both.
export function useConsentStatus() {
  const userId = useAuthStore((state) => state.session?.user.id);

  return useQuery({
    queryKey: ['consent-status', userId],
    enabled: !!userId,
    queryFn: async (): Promise<ConsentStatus> => {
      const { data, error } = await supabase
        .from('consents')
        .select('consent_type, version')
        .eq('user_id', userId as string);
      if (error) throw error;

      return {
        hasBiometric: data.some((c) => c.consent_type === 'biometric' && c.version === BIOMETRIC_CONSENT_VERSION),
        hasDisclosure: data.some(
          (c) => c.consent_type === 'blanket_disclosure' && c.version === BLANKET_DISCLOSURE_VERSION
        ),
      };
    },
  });
}
