'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Escucha el evento de autenticación cuando el usuario llega con el token en la URL
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push('/onboarding');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F1F5F9]">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-[#0052FF] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm font-semibold text-slate-700">Cargando MedikAI...</p>
      </div>
    </main>
  );
}