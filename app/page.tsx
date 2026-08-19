'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    async function processAuthFlow() {
      // 1. Detectar si viene un código de confirmación de correo en la URL (?code=...)
      const code = searchParams.get('code');

      if (code) {
        // Intercambiar el código de confirmación por una sesión activa
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (!error) {
          // Confirmación exitosa -> Redirigir al onboarding
          router.push('/onboarding');
          return;
        }
      }

      // 2. Si no hay código en la URL, verificar si ya existe una sesión previa
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        router.push('/onboarding');
      } else {
        router.push('/login');
      }
    }

    processAuthFlow();
  }, [router, searchParams, supabase]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F1F5F9] font-sans">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-[#0052FF] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm font-semibold text-slate-700">Verificando sesión...</p>
      </div>
    </main>
  );
}