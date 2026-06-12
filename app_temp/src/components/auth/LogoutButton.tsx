'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface LogoutButtonProps {
  className?: string;
}

export function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.push('/signin');
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={className}
      id="logout-button"
      aria-label="Sign out"
    >
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
