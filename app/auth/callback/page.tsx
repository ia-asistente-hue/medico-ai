//app/auth/callback/page.tsx

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Escucha automáticamente el intercambio de tokens de la URL
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push('/onboarding');
      } else if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    // Verificación de respaldo directa
    async function checkExistingSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/onboarding');
      }
    }

    checkExistingSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col items-center justify-center space-y-4 font-sans">
      <div className="w-12 h-12 border-4 border-[#0052FF] border-t-transparent rounded-full animate-spin"></div>
      <h2 className="text-lg font-bold text-slate-800">Verificando tu cuenta...</h2>
      <p className="text-xs text-slate-500">Un momento, estamos preparando tu espacio de trabajo.</p>
    </div>
  );
}