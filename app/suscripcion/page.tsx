'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

interface SubscriptionDetails {
  plan_tier: string;
  subscription_status: string;
  stripe_customer_id?: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
}

interface UserData {
  id: string;
  email: string;
  subscription?: SubscriptionDetails;
}

function SuscripcionContent() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const searchParams = useSearchParams();
  const isSuccess = searchParams.get('success') === 'true';

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const loadUserData = useCallback(async () => {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser) {
        setUser(null);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('plan_tier, subscription_status, stripe_customer_id, current_period_end, cancel_at_period_end')
        .eq('id', authUser.id)
        .single();

      setUser({
        id: authUser.id,
        email: authUser.email || '',
        subscription: {
          plan_tier: profile?.plan_tier || 'free',
          subscription_status: profile?.subscription_status || 'inactive',
          stripe_customer_id: profile?.stripe_customer_id,
          current_period_end: profile?.current_period_end,
          cancel_at_period_end: profile?.cancel_at_period_end || false,
        },
      });
    } catch (error) {
      console.error('Error al cargar datos del usuario:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData, isSuccess]);

  const handleSubscribe = async (priceId: string) => {
    if (!user?.id || !user?.email) {
      alert('Error: No hay una sesión activa.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          priceId,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Ocurrió un error al iniciar la sesión de pago.');
      }
    } catch (error) {
      console.error('Error en checkout:', error);
      alert('Error al conectar con el servidor.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenPortal = async () => {
    if (!user?.subscription?.stripe_customer_id) {
      alert('No existe un historial de facturación vinculado a esta cuenta.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stripeCustomerId: user.subscription.stripe_customer_id }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('No se pudo abrir el portal de facturación.');
      }
    } catch (error) {
      console.error('Error al abrir el portal:', error);
      alert('Error de conexión con el servicio de portal.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center text-gray-500">
        <p className="animate-pulse font-medium">Cargando estado de suscripción...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center">
        <p className="text-red-600 font-semibold">Debes iniciar sesión para consultar tu suscripción.</p>
      </div>
    );
  }

  const sub = user.subscription;
  const isActive = sub?.subscription_status === 'active';
  const expirationDate = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Pruebas -- Suscripción y Planes</h1>
        <p className="text-sm text-gray-600">Consulta tu plan actual de MedikAI y gestiona tus métodos de pago.</p>
      </div>

      {isSuccess && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
          <p className="text-sm text-blue-800 font-medium">
            🎉 ¡Pago completado exitosamente! Actualizando los datos de tu cuenta...
          </p>
          <button
            onClick={() => loadUserData()}
            className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
          >
            Refrescar
          </button>
        </div>
      )}

      {/* Tarjeta de Resumen y Control */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estado Actual</span>
            <div className="flex items-center gap-3 mt-1">
              <h2 className="text-xl font-bold text-gray-900 capitalize">
                {sub?.plan_tier && sub.plan_tier !== 'free' ? `Plan ${sub.plan_tier}` : 'Plan Gratuito'}
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {isActive ? 'ACTIVO' : 'INACTIVO'}
              </span>
            </div>
          </div>

          {sub?.stripe_customer_id && (
            <button
              onClick={handleOpenPortal}
              disabled={actionLoading}
              className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium disabled:opacity-50 transition"
            >
              {actionLoading ? 'Cargando...' : 'Administrar Tarjeta / Cancelar'}
            </button>
          )}
        </div>

        {isActive && expirationDate && (
          <div className="pt-4 border-t flex flex-wrap justify-between items-center text-sm text-gray-600 gap-2">
            <div>
              {sub.cancel_at_period_end ? (
                <p className="text-amber-700 font-medium">
                  ⚠️ Tu suscripción vencerá el: <span className="font-bold">{expirationDate}</span>
                </p>
              ) : (
                <p>
                  Próximo cobro / renovación: <span className="font-semibold text-gray-900">{expirationDate}</span>
                </p>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Las facturas se envían automáticamente a tu correo.
            </p>
          </div>
        )}
      </div>

      {/* Tabla de Planes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Plan Básico */}
        <div
          className={`border rounded-xl p-6 flex flex-col justify-between ${
            sub?.plan_tier === 'basic' ? 'border-blue-500 bg-blue-50/20' : ''
          }`}
        >
          <div>
            <h3 className="text-lg font-bold text-gray-900">Plan Básico</h3>
            <p className="text-3xl font-extrabold text-gray-900 mt-2">
              $499 <span className="text-sm font-normal text-gray-500">MXN/mes</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li>✓ Expediente clínico electrónico</li>
              <li>✓ Generación de notas SOAP asistida por IA</li>
              <li>✓ Prescripción médica estándar</li>
            </ul>
          </div>
          <button
            onClick={() => handleSubscribe(process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC!)}
            disabled={actionLoading || sub?.plan_tier === 'basic'}
            className="mt-6 w-full py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {sub?.plan_tier === 'basic' ? 'Plan Actual' : actionLoading ? 'Procesando...' : 'Contratar Básico'}
          </button>
        </div>

        {/* Plan Pro */}
        <div
          className={`border-2 rounded-xl p-6 flex flex-col justify-between relative ${
            sub?.plan_tier === 'pro' ? 'border-blue-600 bg-blue-50/30' : 'border-blue-600'
          }`}
        >
          <span className="absolute -top-3 right-4 bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-semibold">
            RECOMENDADO
          </span>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Plan Pro</h3>
            <p className="text-3xl font-extrabold text-gray-900 mt-2">
              $799 <span className="text-sm font-normal text-gray-500">MXN/mes</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li>✓ Todo lo del Plan Básico</li>
              <li>✓ <strong>Personalización de Recetas con Membrete</strong></li>
              <li>✓ Cédula de Especialidad en Encabezado</li>
              <li>✓ Firma Digital y Código QR de verificación</li>
            </ul>
          </div>
          <button
            onClick={() => handleSubscribe(process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO!)}
            disabled={actionLoading || sub?.plan_tier === 'pro'}
            className="mt-6 w-full py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {sub?.plan_tier === 'pro' ? 'Plan Actual' : actionLoading ? 'Procesando...' : 'Contratar Pro'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SuscripcionPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-500">Cargando...</div>}>
      <SuscripcionContent />
    </Suspense>
  );
}