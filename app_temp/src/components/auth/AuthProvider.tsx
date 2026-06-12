'use client';

/**
 * AuthProvider
 * ─────────────────────────────────────────────────────────────
 * Provides session + user profile to the entire client-component
 * tree. Listens to onAuthStateChange so the UI updates instantly
 * when the session changes (login / logout / token refresh).
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AppUser } from '@/types/auth';
import type { Session } from '@supabase/supabase-js';

// ── Context shape ──────────────────────────────────────────────

interface AuthContextValue {
  session: Session | null;
  user: AppUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
});

// ── Provider ───────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  /** Fetch full profile from the `users` table after auth state changes */
  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data } = await supabase
        .from('users')
        .select('id, email, full_name, role')
        .eq('id', userId)
        .single();

      setUser(data ?? null);
    },
    [supabase]
  );

  useEffect(() => {
    // Hydrate initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Keep context in sync with auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  return (
    <AuthContext.Provider value={{ session, user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
