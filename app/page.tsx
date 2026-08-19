'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkAuthAndRedirect() {
      // 1. Obtener la sesión actual directamente
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // Usuario autenticado -> Redirigir al onboarding o dashboard
        router.push('/onboarding');
      } else {
        // Usuario NO autenticado -> Redirigir al login
        router.push('/login');
      }
    }

    checkAuthAndRedirect();

    // 2. Mantener el listener para cambios de estado espontáneos
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push('/onboarding');
      } else if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F1F5F9] font-sans">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-[#0052FF] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm font-semibold text-slate-700">Cargando MedikAI...</p>
      </div>
    </main>
  );
}