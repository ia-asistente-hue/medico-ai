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

  console.log(`🔔 Evento recibido de Stripe: ${event.type}`);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.client_reference_id || session.metadata?.userId;
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;
    const customerEmail = session.customer_details?.email || session.customer_email;

    console.log('🔍 Datos extraídos de la sesión:', { userId, customerId, subscriptionId, customerEmail });

    // Determinar el plan según la información obtenida
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const priceId = lineItems.data[0]?.price?.id;

    // 🟢 Logs detallados de los Price IDs para depuración
    console.log('🏷️ Price ID recibido de Stripe:', priceId);
    console.log('🏷️ Price ID configurado en PRO (Env):', process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO);

    let planTier = 'basic';
    if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO) {
      planTier = 'pro';
    }
    
    // 🟢 Log explícito del plan que se va a aplicar en la BD
    console.log(`✨ PLAN DETERMINADO A APLICAR: [ ${planTier.toUpperCase()} ] para el usuario ${userId || customerEmail}`);

    if (!session.subscription) {
      console.error('❌ La sesión de checkout no contiene un subscription ID.');
      return NextResponse.json({ error: 'No subscription found' }, { status: 400 });
    }

    const subscription: any = await stripe.subscriptions.retrieve(session.subscription as string);
    const subscriptionEndDate = new Date(subscription.current_period_end * 1000);
    console.log(`📅 Fecha fin de periodo calculada: ${subscriptionEndDate.toISOString()}`);

    // Datos exactos que se van a mandar a Supabase
    const payloadActualizacion = {
      subscription_status: 'active',
      plan_tier: planTier,
      recordings_used: 0,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      updated_at: new Date().toISOString(),
      current_period_end: subscriptionEndDate.toISOString(),
    };

    // 1. Intentar actualizar por ID de usuario
    console.log(`🔄 Intentando actualizar perfil en Supabase por ID: ${userId} con los datos:`, payloadActualizacion);
    let { data, error } = await supabaseAdmin
      .from('profiles')
      .update(payloadActualizacion)
      .eq('id', userId)
      .select();

    if (error) {
      console.error('❌ Error en Supabase al actualizar por ID:', error);
    }

    // 2. Respaldo por email si no coincidió el ID o no arrojó datos
    if ((!data || data.length === 0) && customerEmail) {
      console.log(`⚠️ ID no coincidió o no devolvió registros. Actualizando por correo: ${customerEmail}`);
      const updateByEmail = await supabaseAdmin
        .from('profiles')
        .update(payloadActualizacion)
        .eq('email', customerEmail)
        .select();

      data = updateByEmail.data;
      error = updateByEmail.error;

      if (error) {
        console.error('❌ Error en Supabase al actualizar por Email:', error);
      }
    }

    console.log('✅ Resultado final de actualización en Supabase:', { 
      filasActualizadas: data?.length || 0, 
      data, 
      error 
    });
  }

  // 2️⃣ EVENTO: Suscripción actualizada (Renovaciones automáticas, cobros periódicos o cambios de plan)
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription;

    const customerId = subscription.customer as string;
    const subscriptionId = subscription.id;
    const status = subscription.status; 
    const priceId = subscription.items.data[0]?.price.id;

    console.log(`🔄 Procesando actualización de suscripción para customer ID: ${customerId}, estado: ${status}`);

    let planTier = 'basic';
    if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO) {
      planTier = 'pro';
    }

    // 🟢 Extracción segura de la fecha con múltiples respaldos para evitar "Invalid time value"
    const rawTimestamp = 
      subscription.items.data[0]?.current_period_end || 
      (subscription as any).current_period_end;

    // Si por alguna razón viene vacío, usamos el tiempo actual por defecto
    const timestampToUse = rawTimestamp ? rawTimestamp * 1000 : Date.now();
    const subscriptionEndDate = new Date(timestampToUse);
    
    console.log(`📅 Nueva fecha fin de periodo: ${subscriptionEndDate.toISOString()}`);

    const subscriptionStatus = status === 'active' ? 'active' : 'inactive';

    const payloadRenovacion = {
      subscription_status: subscriptionStatus,
      plan_tier: planTier,
      current_period_end: subscriptionEndDate.toISOString(),
      updated_at: new Date().toISOString(),
      ...(status === 'active' && { recordings_used: 0 }),
    };

    console.log('🔄 Actualizando perfil en Supabase por stripe_customer_id:', customerId);
    let { data, error } = await supabaseAdmin
      .from('profiles')
      .update(payloadRenovacion)
      .eq('stripe_customer_id', customerId)
      .select();

    if (error) {
      console.error('❌ Error en Supabase al actualizar por stripe_customer_id:', error);
    }

    console.log('✅ Resultado final de actualización en Supabase (Subscription Updated):', { 
      filasActualizadas: data?.length || 0, 
      data, 
      error 
    });
  }

  return NextResponse.json({ received: true });
}