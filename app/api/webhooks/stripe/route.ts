import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-08-26.dahlia',
});

/*export async function POST(req: Request) {
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Falta la firma de Stripe' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`❌ Error de verificación en Webhook: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id || session.metadata?.userId;
      console.log(`✅ Checkout session completed for userId: ${userId}, sessionId: ${session.id}`);
      if (userId && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId = subscription.items.data[0].price.id;

        const isPro = priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO;
        console.log(`User ${userId} subscribed to ${isPro ? 'Pro' : 'Basic'} plan with subscription ID: ${subscription.id}`);
        
        // Consulta para traer el primer registro que exista en la tabla profiles
        const { data: firstProfile, error: findError } = await supabase
          .from('profiles')
          .select('id, email, subscription_status, plan_tier')
          .limit(1)
          .maybeSingle();

        console.log('🔍 Diagnóstico - BD en profiles:', {
          userIdBuscado: userId,
          primerRegistro: firstProfile,
          errorBusqueda: findError,
          coincideID: firstProfile ? firstProfile.id === userId : false,
        });

        const { data, error, count } = await supabase
          .from('profiles')
          .update({
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            plan_tier: isPro ? 'pro' : 'basic',
            subscription_status: 'active',
            can_customize_prescriptions: isPro,
          })
          .eq('id', userId)
          .select();
          console.log('Resultado update Supabase:', { data, error, count });
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const priceId = subscription.items.data[0].price.id;
      const isPro = priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO;

      await supabase
        .from('profiles')
        .update({
          plan_tier: isPro ? 'pro' : 'basic',
          subscription_status: subscription.status,
          can_customize_prescriptions: isPro && subscription.status === 'active',
        })
        .eq('stripe_subscription_id', subscription.id);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;

      await supabase
        .from('profiles')
        .update({
          subscription_status: 'canceled',
          plan_tier: 'free',
          can_customize_prescriptions: false,
        })
        .eq('stripe_subscription_id', subscription.id);
      break;
    }

    default:
      console.log(`Evento no gestionado: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}*/



export async function POST(req: Request) {
  console.log('--- INICIO TEST DIAGNÓSTICO SUPABASE ---');

  // 1. Validar variables de entorno
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('1. Variables cargadas:', {
    url,
    tieneAnonKey: !!anonKey,
    tieneServiceKey: !!serviceKey,
  });

  // 2. Probar lectura con cliente administrativo (Service Role)
  if (serviceKey) {
    const supabaseAdmin = createClient(url!, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: adminProfiles, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .limit(3);

    console.log('2. Prueba con Service Role Key:', {
      exito: !adminError && adminProfiles && adminProfiles.length > 0,
      totalRegistrosDevueltos: adminProfiles?.length ?? 0,
      datos: adminProfiles,
      error: adminError,
    });
  } else {
    console.log('2. Prueba con Service Role Key: OMITIDA (No existe la variable SUPABASE_SERVICE_ROLE_KEY)');
  }

  // 3. Probar lectura con cliente anónimo (Anon Key - la que se usa actualmente)
  if (anonKey) {
    const supabaseAnon = createClient(url!, anonKey, {
      auth: { persistSession: false },
    });

    const { data: anonProfiles, error: anonError } = await supabaseAnon
      .from('profiles')
      .select('id, email')
      .limit(3);

    console.log('3. Prueba con Anon Key:', {
      totalRegistrosDevueltos: anonProfiles?.length ?? 0,
      datos: anonProfiles,
      error: anonError,
    });
  }

  console.log('--- FIN TEST DIAGNÓSTICO SUPABASE ---');

  return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
}