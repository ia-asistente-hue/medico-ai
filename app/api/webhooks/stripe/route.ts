import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Inicializar Supabase con Service Role Key para bypassing de RLS al actualizar perfiles
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
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

      if (userId && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId = subscription.items.data[0].price.id;

        const isPro = priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO;

        await supabase
          .from('profiles')
          .update({
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            plan_tier: isPro ? 'pro' : 'basic',
            subscription_status: 'active',
            can_customize_prescriptions: isPro,
          })
          .eq('id', userId);
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
}