// components/common/TrialBanner.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

export default function TrialBanner() {
    const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
    const [isTrial, setIsTrial] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        async function checkTrialStatus() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('plan_tier, trial_ends_at')
                .eq('id', user.id)
                .single();

            if (profile && profile.plan_tier === 'trial' && profile.trial_ends_at) {
                setIsTrial(true);
                const now = new Date().getTime();
                const expirationDate = new Date(profile.trial_ends_at).getTime();
                const differenceInMs = expirationDate - now;

                // Calcular días restantes (redondeado hacia arriba)
                const daysLeft = Math.ceil(differenceInMs / (1000 * 60 * 60 * 24));
                setTrialDaysLeft(daysLeft > 0 ? daysLeft : 0);
            }
        }

        checkTrialStatus();
    }, [supabase]);

    // Si no es un usuario en trial, no se muestra nada
    if (!isTrial) return null;

    return (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 text-xs sm:text-sm font-medium shadow-sm">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
                <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>
                        {trialDaysLeft !== null && trialDaysLeft > 0 ? (
                            <>Tu período de prueba gratuito expira en <strong>{trialDaysLeft} {trialDaysLeft === 1 ? 'd\u00eda' : 'd\u00edas'}</strong>.</>
                        ) : (
                            <>Tu período de prueba ha expirado.</>
                        )}
                    </span>
                </div>
                <Link
                    href="/perfil"
                    className="bg-white text-blue-700 hover:bg-blue-50 font-bold px-3.5 py-1.5 rounded-xl shadow-xs transition-colors text-xs"
                >
                    Suscribirme ahora →
                </Link>
            </div>
        </div>
    );
}