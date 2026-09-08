import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export type SubscriptionTier = 'free' | 'paid';

// §13.4: free tier sees only the top 2 recommendations per category, applied client-side here
// rather than by the server withholding data. Defaults to 'free' while loading or on any error —
// never show paid-tier depth before we've actually confirmed entitlement.
export function useSubscriptionTier() {
  const query = useQuery({
    queryKey: ['subscription-tier'],
    queryFn: async (): Promise<SubscriptionTier> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return 'free';

      const { data, error } = await supabase
        .from('users')
        .select('subscription_tier')
        .eq('id', session.user.id)
        .single();
      if (error || !data) return 'free';

      return data.subscription_tier === 'paid' ? 'paid' : 'free';
    },
  });

  return query.data ?? 'free';
}
