import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';

// Global auth state, driven by Supabase's own session listener rather than polled. The root
// layout (_layout.tsx) reads this to decide between the (tabs)/capture flow and sign-in/sign-up
// via Stack.Protected guards.
interface AuthState {
  session: Session | null;
  isInitializing: boolean;
}

export const useAuthStore = create<AuthState>(() => ({
  session: null,
  isInitializing: true,
}));

supabase.auth.getSession().then(({ data }) => {
  useAuthStore.setState({ session: data.session, isInitializing: false });
});

supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.setState({ session, isInitializing: false });
});
