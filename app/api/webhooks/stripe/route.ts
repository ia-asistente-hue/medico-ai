import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

// Inicialización del cliente administrativo con la Service Role Key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
  }
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event: Stripe.Event;

  try {
    if (!signature) throw new Error('Falta la firma de Stripe');
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`❌ Error en firma Webhook: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.client_reference_id || session.metadata?.userId;
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;
    const customerEmail = session.customer_details?.email || session.customer_email;

    // Determinar el plan según la información obtenida
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const priceId = lineItems.data[0]?.price?.id;

    let planTier = 'basic';
    if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO) {
      planTier = 'pro';
    }

    console.log(`💳 Procesando suscripción para el usuario: ${userId || customerEmail}`);
    // Si usas Checkout Session, recuperas la suscripción directamente con el SDK de Stripe:
// Forzamos el tipo con 'any' para evitar que TypeScript se queje de la propiedad
    const subscription: any = await stripe.subscriptions.retrieve(session.subscription as string);

    const subscriptionEndDate = new Date(subscription.current_period_end * 1000);

    // 1. Intentar actualizar por ID de usuario
    let { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: 'active',
        plan_tier: planTier,
        recordings_used: 0,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        updated_at: new Date().toISOString(),
        current_period_end: subscriptionEndDate.toISOString(),
      })
      .eq('id', userId)
      .select();

    // 2. Respaldo por email si no coincidió el ID
    if ((!data || data.length === 0) && customerEmail) {
      console.log('⚠️ ID no coincidió en profiles. Actualizando por correo...');
      const updateByEmail = await supabaseAdmin
        .from('profiles')
        .update({
          subscription_status: 'active',
          plan_tier: planTier,
          recordings_used: 0,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          updated_at: new Date().toISOString(),
          current_period_end: subscriptionEndDate.toISOString(),
        })
        .eq('email', customerEmail)
        .select();

      data = updateByEmail.data;
      error = updateByEmail.error;
    }

    console.log('✅ Resultado de actualización en Supabase:', { data, error });
  }

  return NextResponse.json({ received: true });
}